import crypto from 'node:crypto';
import { getEnv } from '../config/env';
import type { EncryptedLocation, SOSPacket, RelayHop } from '../interfaces';

export function buildSignedPayload(packet: SOSPacket): string {
  return [
    packet.eventId,
    String(packet.timestamp),
    packet.nonce,
    packet.locationEnc,
  ].join('|');
}

export function buildRelaySignedPayload(hop: RelayHop, hopIndex: number, eventId: string): string {
  return [eventId, String(hopIndex), String(hop.timestamp)].join('|');
}

export function verifyEcdsaSignature(
  publicKeyPem: string,
  data: string,
  signatureB64: string,
): boolean {
  /** Verifies an ECDSA-P256 / SHA-256 DER-encoded signature against a PEM public key.
   *  Uses Node's crypto.createVerify('SHA256'). Returns true if the signature is valid,
   *  false otherwise. The public key is fetched from Firestore per-device. */
  const verifier = crypto.createVerify('SHA256');
  verifier.update(data);
  verifier.end();

  return verifier.verify(
    {
      key: publicKeyPem,
      dsaEncoding: 'der',
    },
    signatureB64,
    'base64',
  );
}

export function rsaUnwrapAesKey(wrappedKeyB64: string): Buffer {
  /** Decrypts an RSA-2048-OAEP-wrapped AES-256 key using the server's private key.
   *  The private key PEM is stored base64-encoded in RSA_PRIVATE_KEY_B64 env var to
   *  avoid newline issues. Returns the raw 32-byte AES key buffer. Throws if the
   *  unwrapped key length is not exactly 32 bytes. */
  const env = getEnv();
  const privateKeyPem = Buffer.from(env.RSA_PRIVATE_KEY_B64, 'base64').toString('utf-8');
  const wrappedKey = Buffer.from(wrappedKeyB64, 'base64');

  const aesKey = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    wrappedKey,
  );

  if (aesKey.length !== 32) {
    throw new Error(`Unwrapped AES key has invalid length: ${aesKey.length} (expected 32)`);
  }

  return aesKey;
}

export function decryptLocation(
  encLoc: EncryptedLocation,
): { lat: number; lng: number } {
  /** Decrypts AES-256-GCM encrypted GPS coordinates. First RSA-unwraps the AES session key,
   *  then decrypts the ciphertext using the IV and auth tag. Parses the plaintext as JSON
   *  and validates it contains numeric lat/lng fields. Throws on auth tag mismatch (tampered
   *  data), invalid key, or malformed payload. */
  const aesKey = rsaUnwrapAesKey(encLoc.wrappedKey);

  const iv = Buffer.from(encLoc.iv, 'base64');
  const authTag = Buffer.from(encLoc.authTag, 'base64');
  const ciphertext = Buffer.from(encLoc.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const parsed: unknown = JSON.parse(plaintext.toString('utf-8'));

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).lat !== 'number' ||
    typeof (parsed as Record<string, unknown>).lng !== 'number'
  ) {
    throw new Error('Decrypted location payload has invalid shape');
  }

  return parsed as { lat: number; lng: number };
}

export function verifySosPacketSignature(
  packet: SOSPacket,
  publicKeyPem: string,
): boolean {
  /** Verifies the sender's ECDSA-P256 signature on a complete SOSPacket by building
   *  the canonical payload string and delegating to verifyEcdsaSignature. Returns true
   *  if the signature matches the sender's public key. */
  const payload = buildSignedPayload(packet);
  return verifyEcdsaSignature(publicKeyPem, payload, packet.signature);
}

export function verifyRelayHopSignature(
  hop: RelayHop,
  hopIndex: number,
  eventId: string,
  publicKeyPem: string,
): boolean {
  const payload = buildRelaySignedPayload(hop, hopIndex, eventId);
  return verifyEcdsaSignature(publicKeyPem, payload, hop.signature);
}
