import type { Request, Response } from 'express';
import { z } from 'zod';
import { FieldValue } from '../config/firebase';
import { getDb } from '../config/firebase';
import {
  verifySosPacketSignature,
  verifyRelayHopSignature,
  decryptLocation,
} from '../services/cryptoService';
import { multicastNearby } from '../services/fcmService';
import { createHttpError } from '../middleware/errorHandler';
import type { SOSPacket, SOSEvent } from '../interfaces';

const encryptedLocationSchema = z.object({
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  authTag: z.string().min(1),
  wrappedKey: z.string().min(1),
});

const sosPacketSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().min(1).max(128),
  timestamp: z.number().int().positive(),
  nonce: z.string().regex(/^[0-9a-f]{32}$/, 'Nonce must be 128-bit hex (32 chars)'),
  locationEnc: encryptedLocationSchema,
  signature: z.string().min(1),
  relayChain: z
    .array(
      z.object({
        nodeId: z.string().min(1).max(128),
        timestamp: z.number().int().positive(),
        signature: z.string().min(1),
      }),
    )
    .optional(),
});

const statusPatchSchema = z.object({
  status: z.enum(['resolved']),
});

function isTimestampFresh(timestampMs: number): boolean {
  /** Returns true if the given UNIX-ms timestamp is within ±60 seconds of the current
   *  server time. Used to reject stale SOS packets that may be replayed. */
  const now = Date.now();
  const drift = Math.abs(now - timestampMs);
  return drift <= 60_000;
}

async function getDevicePublicKey(userId: string): Promise<string> {
  /** Fetches the ECDSA-P256 PEM public key for a device from Firestore /devices/{userId}.
   *  Throws 404 if the device document or publicKey field does not exist. */
  const db = getDb();
  const doc = await db.collection('devices').doc(userId).get();
  if (!doc.exists) {
    throw createHttpError(404, `Device record not found for user ${userId}`);
  }
  const publicKey = doc.data()?.publicKey as string | undefined;
  if (!publicKey) {
    throw createHttpError(404, `No public key registered for user ${userId}`);
  }
  return publicKey;
}

async function checkAndStoreNonce(nonce: string): Promise<void> {
  /** Prevents replay attacks by checking if the 128-bit hex nonce has already been consumed.
   *  If it exists in Firestore /nonces/{nonce}, throws 409 (Conflict). Otherwise stores it
   *  with a server timestamp and a 60-second expiresAt field. Firestore TTL policy should be
   *  configured to auto-delete expired nonce documents. */
  const db = getDb();
  const nonceRef = db.collection('nonces').doc(nonce);

  const existing = await nonceRef.get();
  if (existing.exists) {
    throw createHttpError(409, 'Replay detected: nonce already consumed');
  }

  await nonceRef.set({
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 60_000),
  });
}

export async function triggerSos(req: Request, res: Response): Promise<void> {
  /** POST /api/sos/trigger — Full MANET SOS pipeline:
   *  1. Zod-validates the SOSPacket body
   *  2. Checks timestamp freshness (±60s)
   *  3. Fetches sender's ECDSA public key from Firestore
   *  4. Verifies ECDSA-P256 signature over eventId|timestamp|nonce|locationEnc (403 on fail)
   *  5. Checks nonce for replay (409 on duplicate)
   *  6. RSA-unwraps AES key, then AES-256-GCM decrypts GPS coordinates
   *  7. Creates SOSEvent document in Firestore with status 'active'
   *  8. Multicasts FCM notification to users within ~1 km (fire-and-forget)
   *  Returns 201 with eventId. */
  const parsed = sosPacketSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createHttpError(400, parsed.error.issues.map((i) => i.message).join('; '));
  }
  const packet: SOSPacket = parsed.data;

  if (!isTimestampFresh(packet.timestamp)) {
    throw createHttpError(400, 'Packet timestamp is stale (>60 s drift)');
  }

  const senderPubKey = await getDevicePublicKey(packet.userId);

  if (!verifySosPacketSignature(packet, senderPubKey)) {
    throw createHttpError(403, 'ECDSA signature verification failed');
  }

  await checkAndStoreNonce(packet.nonce);

  const { lat, lng } = decryptLocation(packet.locationEnc);

  const db = getDb();
  const sosEvent: SOSEvent = {
    eventId: packet.eventId,
    userId: packet.userId,
    lat,
    lng,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    relayHops: 0,
  };

  await db.collection('sosEvents').doc(packet.eventId).set(sosEvent);

  multicastNearby(lat, lng, {
    title: '🚨 SOS Alert Nearby',
    body: 'Someone near you needs emergency assistance.',
    data: { eventId: packet.eventId, lat: String(lat), lng: String(lng) },
  }).catch((err) => console.error('[FCM] Multicast failed:', err));

  res.status(201).json({ eventId: packet.eventId, status: 'active' });
}

export async function meshRelay(req: Request, res: Response): Promise<void> {
  /** POST /api/mesh/relay — Same security pipeline as triggerSos, plus:
   *  iterates the relayChain array and verifies each hop's ECDSA signature against that
   *  node's Firestore public key (nodeId|timestamp|eventId). If the SOSEvent already
   *  exists in Firestore, updates relayHops count; otherwise creates a new one. FCM
   *  multicast includes hop count in the notification body. */
  const parsed = sosPacketSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createHttpError(400, parsed.error.issues.map((i) => i.message).join('; '));
  }
  const packet: SOSPacket = parsed.data;

  if (!packet.relayChain || packet.relayChain.length === 0) {
    throw createHttpError(400, 'Relay packet must include a non-empty relayChain');
  }

  if (!isTimestampFresh(packet.timestamp)) {
    throw createHttpError(400, 'Packet timestamp is stale (>60 s drift)');
  }

  const senderPubKey = await getDevicePublicKey(packet.userId);
  if (!verifySosPacketSignature(packet, senderPubKey)) {
    throw createHttpError(403, 'Sender ECDSA signature verification failed');
  }

  for (let i = 0; i < packet.relayChain.length; i++) {
    const hop = packet.relayChain[i];
    const hopPubKey = await getDevicePublicKey(hop.nodeId);
    if (!verifyRelayHopSignature(hop, i, packet.eventId, hopPubKey)) {
      throw createHttpError(403, `Relay hop #${i} (${hop.nodeId}) signature verification failed`);
    }
  }

  await checkAndStoreNonce(packet.nonce);

  const { lat, lng } = decryptLocation(packet.locationEnc);

  const db = getDb();
  const eventRef = db.collection('sosEvents').doc(packet.eventId);
  const existing = await eventRef.get();

  if (existing.exists) {
    await eventRef.update({
      relayHops: packet.relayChain.length,
    });
  } else {
    const sosEvent: SOSEvent = {
      eventId: packet.eventId,
      userId: packet.userId,
      lat,
      lng,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      relayHops: packet.relayChain.length,
    };
    await eventRef.set(sosEvent);
  }

  multicastNearby(lat, lng, {
    title: '🚨 SOS Relay Alert',
    body: `Emergency SOS relayed through ${packet.relayChain.length} node(s).`,
    data: { eventId: packet.eventId, lat: String(lat), lng: String(lng) },
  }).catch((err) => console.error('[FCM] Relay multicast failed:', err));

  res.status(201).json({
    eventId: packet.eventId,
    relayHops: packet.relayChain.length,
    status: 'active',
  });
}

export async function updateSosStatus(req: Request, res: Response): Promise<void> {
  /** PATCH /api/sos/:id/status — JWT-protected. Validates body contains { status: "resolved" }.
   *  Fetches the SOSEvent document from Firestore. Returns 404 if not found, 409 if already
   *  resolved. Otherwise updates status to 'resolved' with a server timestamp. */
  const id = req.params.id as string;
  const parsed = statusPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createHttpError(400, 'Body must contain { status: "resolved" }');
  }

  const db = getDb();
  const eventRef = db.collection('sosEvents').doc(id);
  const doc = await eventRef.get();

  if (!doc.exists) {
    throw createHttpError(404, `SOS event ${id} not found`);
  }

  const current = doc.data();
  if (current?.status === 'resolved') {
    throw createHttpError(409, 'Event is already resolved');
  }

  await eventRef.update({
    status: 'resolved',
    resolvedAt: FieldValue.serverTimestamp(),
  });

  res.json({ eventId: id, status: 'resolved' });
}
