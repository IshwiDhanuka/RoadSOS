import type { Request, Response } from 'express';
import Fuse from 'fuse.js';
import { z } from 'zod';
import { getDb } from '../config/firebase';
import { searchNearby, searchText } from '../services/placesService';
import {
  computeGeohash,
  getCachedServices,
  setCachedServices,
} from '../services/cacheService';
import type { ServiceRecord } from '../interfaces';
import { createHttpError } from '../middleware/errorHandler';

const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(50_000).default(5000),
});

const searchSchema = z.object({
  q: z.string().min(1).max(200),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(50_000).default(5000),
  category: z.string().optional(),
});

function euclideanDistanceMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  /** Calculates approximate distance in metres between two GPS points using equirectangular
   *  projection. Accurate enough for short-range sorting (< 50 km). Uses Earth radius 6371 km
   *  and adjusts longitude delta by cos(average latitude) for spherical correction. */
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const avgLat = ((lat1 + lat2) / 2 * Math.PI) / 180;
  const dx = dLng * Math.cos(avgLat) * R;
  const dy = dLat * R;
  return Math.sqrt(dx * dx + dy * dy);
}

async function fetchFirestoreServices(geohash: string): Promise<ServiceRecord[]> {
  /** Fetches up to 50 verified emergency services from Firestore's seed database.
   *  Reads from /services/{region_geohash}/listings subcollection. All returned records
   *  are marked as source: 'firestore' and isVerified: true. */
  const db = getDb();
  const snap = await db
    .collection('services')
    .doc(geohash)
    .collection('listings')
    .limit(50)
    .get();

  return snap.docs.map((doc: any) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name as string,
      category: d.category ?? 'general',
      lat: d.lat as number,
      lng: d.lng as number,
      address: d.address as string,
      phone: d.phone as string | undefined,
      source: 'firestore' as const,
      rating: d.rating as number | undefined,
      isVerified: true,
    };
  });
}

function deduplicateServices(services: ServiceRecord[]): ServiceRecord[] {
  /** Deduplicates merged Google + Firestore results using fuse.js fuzzy name matching
   *  (threshold 0.3) combined with proximity check (< 200 m). When a fuzzy duplicate pair
   *  is found within 200 m, the verified Firestore record is preferred and the Google
   *  Places duplicate is dropped. */
  if (services.length === 0) return [];

  const fuse = new Fuse(services, {
    keys: ['name'],
    threshold: 0.3,
    includeScore: true,
  });

  const seen = new Set<string>();
  const deduped: ServiceRecord[] = [];

  for (const svc of services) {
    if (seen.has(svc.id)) continue;

    const matches = fuse.search(svc.name);
    let dominated = false;

    for (const match of matches) {
      if (match.item.id === svc.id) continue;
      if (seen.has(match.item.id)) continue;

      const dist = euclideanDistanceMetres(svc.lat, svc.lng, match.item.lat, match.item.lng);
      if (dist < 200) {
        if (match.item.isVerified && !svc.isVerified) {
          dominated = true;
          break;
        }
        seen.add(match.item.id);
      }
    }

    if (!dominated) {
      seen.add(svc.id);
      deduped.push(svc);
    }
  }

  return deduped;
}

export async function getNearbyServices(req: Request, res: Response): Promise<void> {
  /** GET /api/services/nearby — Computes a precision-6 geohash from the query lat/lng.
   *  Checks Redis cache first. On miss: fetches Google Places API and Firestore seed DB
   *  in parallel, merges results (Firestore first for dedup priority), deduplicates using
   *  fuse.js, computes euclidean distances, sorts ascending, takes top 10, caches in Redis
   *  with 30-min TTL (fire-and-forget), and returns the result. */
  const parsed = nearbySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createHttpError(400, parsed.error.issues.map((i) => i.message).join('; '));
  }

  const { lat, lng, radius } = parsed.data;
  const geohash = computeGeohash(lat, lng);

  const cached = await getCachedServices(geohash);
  if (cached) {
    res.json({ source: 'cache', services: cached });
    return;
  }

  const [googleResults, firestoreResults] = await Promise.all([
    searchNearby(lat, lng, radius),
    fetchFirestoreServices(geohash),
  ]);

  const merged = [...firestoreResults, ...googleResults];
  const deduped = deduplicateServices(merged);

  const withDistances = deduped.map((s) => ({
    ...s,
    distanceMetres: Math.round(euclideanDistanceMetres(lat, lng, s.lat, s.lng)),
  }));
  withDistances.sort((a, b) => a.distanceMetres - b.distanceMetres);

  const top10 = withDistances.slice(0, 10);

  setCachedServices(geohash, top10).catch((err) =>
    console.error('[CACHE] Failed to set cache:', err),
  );

  res.json({ source: 'live', services: top10 });
}

export async function searchServices(req: Request, res: Response): Promise<void> {
  /** GET /api/services/search — Validates query params (q, lat, lng, radius, category)
   *  via Zod. Optionally prepends the category to the query string. Forwards to Google
   *  Places Text Search API, computes distances from the caller's GPS, sorts ascending,
   *  and returns all results. */
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    throw createHttpError(400, parsed.error.issues.map((i) => i.message).join('; '));
  }

  const { q, lat, lng, radius } = parsed.data;
  const query = parsed.data.category ? `${parsed.data.category} ${q}` : q;

  const results = await searchText(query, lat, lng, radius);

  const withDistances = results.map((s) => ({
    ...s,
    distanceMetres: Math.round(euclideanDistanceMetres(lat, lng, s.lat, s.lng)),
  }));
  withDistances.sort((a, b) => a.distanceMetres - b.distanceMetres);

  res.json({ services: withDistances });
}
