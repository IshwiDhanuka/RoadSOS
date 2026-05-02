import { loadEnv, getEnv } from './config/env';
import { initFirebase } from './config/firebase';
import { initRedis } from './config/redis';
import { createApp } from './app';

async function main(): Promise<void> {
  /** Boots the RoadSoS backend in strict order:
   *  1. Validates all environment variables via Zod (fails fast on bad config)
   *  2. Initialises Firebase Admin SDK (Firestore, Auth, FCM)
   *  3. Initialises Upstash Redis client (REST transport)
   *  4. Creates Express app with full middleware stack and starts listening
   *  Any failure during boot logs the error and exits with code 1 to prevent
   *  the server from running in a degraded state. */
  try {
    loadEnv();
    const env = getEnv();
    console.log(`[BOOT] Environment validated (${env.NODE_ENV})`);

    initFirebase();
    console.log('[BOOT] Firebase Admin SDK initialised');

    initRedis();
    console.log('[BOOT] Upstash Redis client initialised');

    const app = createApp();
    const port = env.PORT;

    app.listen(port, () => {
      console.log(`[BOOT] RoadSoS backend listening on port ${port}`);
      console.log(`[BOOT] Health check: http://localhost:${port}/health`);
    });
  } catch (err) {
    console.error('[FATAL] Startup failed:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(1);
});

main();
