import { Redis } from '@upstash/redis';
import { getEnv } from './env';

let _redis: Redis | null = null;

export function initRedis(): Redis {
  /** Creates and caches an Upstash Redis client using REST transport (serverless-safe).
   *  Reads connection URL and token from validated env vars. Subsequent calls return
   *  the existing instance. */
  if (_redis) return _redis;

  const env = getEnv();

  _redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  return _redis;
}

export function getRedis(): Redis {
  /** Returns the cached Redis client. Throws if initRedis() has not been called. */
  if (!_redis) throw new Error('Redis not initialised. Call initRedis() first.');
  return _redis;
}
