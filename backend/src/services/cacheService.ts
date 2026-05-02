import ngeohash from 'ngeohash';
import { getRedis } from '../config/redis';
import type { ServiceRecord } from '../interfaces';

const GEOHASH_PRECISION = 6;
const CACHE_TTL_SECONDS = 1800;
const KEY_PREFIX = 'services:nearby:';

export function computeGeohash(lat: number, lng: number): string {
  /** Encodes GPS coordinates into a precision-6 geohash (~1.2 km cell). Used as the
   *  cache key segment and Firestore region identifier for nearby service lookups. */
  return ngeohash.encode(lat, lng, GEOHASH_PRECISION);
}

export async function getCachedServices(geohash: string): Promise<ServiceRecord[] | null> {
  /** Attempts to read a cached ServiceRecord[] from Upstash Redis for the given geohash cell.
   *  Returns the parsed array on a cache hit, or null on a miss (key absent, expired, or
   *  corrupted data). Handles JSON parse failures gracefully by returning null. */
  const redis = getRedis();
  const raw = await redis.get<string>(KEY_PREFIX + geohash);
  if (!raw) return null;

  try {
    const data: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) return null;
    return data as ServiceRecord[];
  } catch {
    return null;
  }
}

export async function setCachedServices(
  geohash: string,
  services: ServiceRecord[],
): Promise<void> {
  /** Writes a ServiceRecord[] to Upstash Redis under the geohash key with a 30-minute TTL.
   *  Called fire-and-forget after responding to the client so cache writes don't block the
   *  response. */
  const redis = getRedis();
  await redis.set(KEY_PREFIX + geohash, JSON.stringify(services), {
    ex: CACHE_TTL_SECONDS,
  });
}
