import * as admin from 'firebase-admin';
import { getEnv } from './env';

let _app: admin.app.App | null = null;
let _db: admin.firestore.Firestore | null = null;
let _auth: admin.auth.Auth | null = null;
let _messaging: admin.messaging.Messaging | null = null;

export const FieldValue = admin.firestore.FieldValue;
export type FieldValue = admin.firestore.FieldValue;

export function initFirebase(): void {
  /** Initialises the Firebase Admin SDK singleton using service-account credentials from
   *  validated env vars. Replaces escaped newlines in the private key PEM so it parses correctly.
   *  Subsequent calls are no-ops. After init, Firestore, Auth, and Messaging instances are
   *  available via getDb(), getAuth(), and getMessaging(). */
  if (_app) return;

  const env = getEnv();
  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  _app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  _db = admin.firestore(_app);
  _auth = admin.auth(_app);
  _messaging = admin.messaging(_app);
}

export function getDb(): admin.firestore.Firestore {
  /** Returns the Firestore instance. Throws if initFirebase() has not been called. */
  if (!_db) throw new Error('Firestore not initialised. Call initFirebase() first.');
  return _db;
}

export function getAuth(): admin.auth.Auth {
  /** Returns the Firebase Auth instance. Throws if initFirebase() has not been called. */
  if (!_auth) throw new Error('Firebase Auth not initialised. Call initFirebase() first.');
  return _auth;
}

export function getMessaging(): admin.messaging.Messaging {
  /** Returns the FCM Messaging instance. Throws if initFirebase() has not been called. */
  if (!_messaging) throw new Error('FCM not initialised. Call initFirebase() first.');
  return _messaging;
}
