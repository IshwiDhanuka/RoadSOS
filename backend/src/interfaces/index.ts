import type { FieldValue } from '../config/firebase';

export interface ServiceRecord {
  /** Normalised emergency-service record shared across Google Places and Firestore sources.
   *  Contains GPS coordinates, category, contact info, and a source tag. The optional
   *  distanceMetres field is populated at query time after computing euclidean distance
   *  from the caller's GPS coordinates. */
  id: string;
  name: string;
  category: ServiceCategory;
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  source: 'google' | 'firestore';
  distanceMetres?: number;
  rating?: number;
  isVerified: boolean;
}

export type ServiceCategory =
  | 'hospital'
  | 'police'
  | 'fire_station'
  | 'tow_truck'
  | 'mechanic'
  | 'fuel'
  | 'pharmacy'
  | 'general';

export interface EncryptedLocation {
  /** AES-256-GCM encrypted GPS payload. The ciphertext holds JSON { lat, lng }.
   *  The AES session key is RSA-wrapped with the server's public key. All fields
   *  are base64-encoded. */
  ciphertext: string;
  iv: string;
  authTag: string;
  wrappedKey: string;
}

export interface SOSPacket {
  /** Signed MANET SOS packet sent from a mobile device. The signature covers the
   *  canonical string `eventId|timestamp|nonce|JSON(locationEnc)` using ECDSA-P256.
   *  The nonce is a 128-bit hex string used for replay protection with a 60-second
   *  TTL in Firestore. relayChain is present only for mesh-relayed packets. */
  eventId: string;
  userId: string;
  timestamp: number;
  nonce: string;
  locationEnc: EncryptedLocation;
  signature: string;
  relayChain?: RelayHop[];
}

export interface RelayHop {
  /** A single MANET relay node entry. Each hop signs the canonical string
   *  `nodeId|timestamp|eventId` with its own ECDSA-P256 key stored in Firestore. */
  nodeId: string;
  timestamp: number;
  signature: string;
}

export type SOSEventStatus = 'active' | 'resolved';

export interface SOSEvent {
  /** Persisted SOS event in Firestore. Created on /trigger or /relay, updated to
   *  'resolved' via PATCH /:id/status. relayHops tracks the MANET chain length. */
  eventId: string;
  userId: string;
  lat: number;
  lng: number;
  status: SOSEventStatus;
  createdAt: FieldValue;
  resolvedAt?: FieldValue;
  relayHops: number;
}

export interface AccidentReport {
  /** Accident report stored in Firestore. Created via POST /api/report/accident
   *  by an authenticated user. Triggers FCM multicast to users within ~1 km. */
  reportId: string;
  userId: string;
  lat: number;
  lng: number;
  description: string;
  createdAt: FieldValue;
}

export interface OfflineBundle {
  /** Gzipped JSON payload returned by GET /api/offline/bundle. Contains up to 50
   *  verified Firestore services within ~20 km of the user's location. */
  generatedAt: number;
  services: ServiceRecord[];
}

export interface DecodedToken {
  /** Decoded Firebase ID token attached to req.user by the auth middleware. */
  uid: string;
  email?: string;
  [key: string]: unknown;
}
