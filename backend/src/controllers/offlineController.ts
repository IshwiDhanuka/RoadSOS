import type { Request, Response } from 'express';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import ngeohash from 'ngeohash';
import { z } from 'zod';
import { getDb } from '../config/firebase';
import { createHttpError } from '../middleware/errorHandler';
import type { ServiceRecord, OfflineBundle } from '../interfaces';

const gzip = promisify(zlib.gzip);

const bundleQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

function getRegionHashes(lat: number, lng: number): string[] {
  /** Computes a precision-4 geohash (~20 km cell) for the given coordinates and returns
   *  it along with its 8 neighbours (9 cells total). This covers approximately a 20 km
   *  radius for the offline bundle query. */
  const center = ngeohash.encode(lat, lng, 4);
  const neighbours = ngeohash.neighbors(center);
  return [center, ...neighbours];
}

export async function getOfflineBundle(req: Request, res: Response): Promise<void> {
  /** GET /api/offline/bundle — JWT-protected. Validates lat/lng query params. Computes
   *  precision-4 geohash region hashes (~20 km), queries Firestore /services/{hash}/listings
   *  for each region until 50 services are collected. Returns the result as gzip-compressed
   *  JSON with Content-Encoding: gzip and a 1-hour Cache-Control header. */
  const parsed = bundleQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createHttpError(400, parsed.error.issues.map((i) => i.message).join('; '));
  }

  const { lat, lng } = parsed.data;
  const regionHashes = getRegionHashes(lat, lng);

  const db = getDb();
  const services: ServiceRecord[] = [];

  for (const hash of regionHashes) {
    if (services.length >= 50) break;

    const snap = await db
      .collection('services')
      .doc(hash)
      .collection('listings')
      .limit(50 - services.length)
      .get();

    for (const doc of snap.docs) {
      const d = doc.data();
      services.push({
        id: doc.id,
        name: d.name as string,
        category: d.category ?? 'general',
        lat: d.lat as number,
        lng: d.lng as number,
        address: d.address as string,
        phone: d.phone as string | undefined,
        source: 'firestore',
        rating: d.rating as number | undefined,
        isVerified: true,
      });
    }
  }

  const bundle: OfflineBundle = {
    generatedAt: Date.now(),
    services: services.slice(0, 50),
  };

  const compressed = await gzip(Buffer.from(JSON.stringify(bundle), 'utf-8'));

  res.set({
    'Content-Type': 'application/json',
    'Content-Encoding': 'gzip',
    'Cache-Control': 'private, max-age=3600',
  });
  res.send(compressed);
}
