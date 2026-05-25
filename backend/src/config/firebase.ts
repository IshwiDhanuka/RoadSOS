import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getAuth as _getAuth, type Auth } from 'firebase-admin/auth';
import { getMessaging as _getMessaging, type Messaging } from 'firebase-admin/messaging';
import { getEnv } from './env';

let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _messaging: Messaging | null = null;

export { FieldValue };

export function initFirebase(): void {
  /** Initialises the Firebase Admin SDK singleton using service-account credentials from
   *  validated env vars. Replaces escaped newlines in the private key PEM so it parses correctly.
   *  Subsequent calls are no-ops. After init, Firestore, Auth, and Messaging instances are
   *  available via getDb(), getAuth(), and getMessaging(). */
  if (_app) return;

  const env = getEnv();
  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  _app = initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  _db = getFirestore(_app);
  _auth = _getAuth(_app);
  _messaging = _getMessaging(_app);
}

export function getDb(): Firestore {
  /** Returns the Firestore instance. Throws if initFirebase() has not been called. */
  if (!_db) throw new Error('Firestore not initialised. Call initFirebase() first.');
  return _db;
}

export function getAuth(): Auth {
  /** Returns the Firebase Auth instance. Throws if initFirebase() has not been called. */
  if (!_auth) throw new Error('Firebase Auth not initialised. Call initFirebase() first.');
  return _auth;
}

export function getMessaging(): Messaging {
  /** Returns the FCM Messaging instance. Throws if initFirebase() has not been called. */
  if (!_messaging) throw new Error('FCM not initialised. Call initFirebase() first.');
  return _messaging;
}
