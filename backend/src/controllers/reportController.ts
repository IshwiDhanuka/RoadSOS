import type { Request, Response } from 'express';
import { z } from 'zod';
import { FieldValue } from '../config/firebase';
import crypto from 'node:crypto';
import { getDb } from '../config/firebase';
import { multicastNearby } from '../services/fcmService';
import { createHttpError } from '../middleware/errorHandler';

const accidentSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  description: z.string().min(1).max(2000),
});

export async function reportAccident(req: Request, res: Response): Promise<void> {
  /** POST /api/report/accident — JWT-protected. Validates lat, lng, and description via Zod.
   *  Generates a UUID reportId, stores the accident in Firestore /accidentReports with a
   *  server timestamp. Fires an FCM multicast to users within ~1 km with the description
   *  (truncated to 100 chars). Returns 201 with the reportId. */
  const parsed = accidentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createHttpError(400, parsed.error.issues.map((i) => i.message).join('; '));
  }

  const { lat, lng, description } = parsed.data;
  const userId = req.user?.uid;
  if (!userId) {
    throw createHttpError(401, 'User identity missing');
  }

  const reportId = crypto.randomUUID();

  const db = getDb();
  await db.collection('accidentReports').doc(reportId).set({
    reportId,
    userId,
    lat,
    lng,
    description,
    createdAt: FieldValue.serverTimestamp(),
  });

  multicastNearby(lat, lng, {
    title: '⚠️ Accident Reported Nearby',
    body: description.length > 100 ? description.slice(0, 97) + '...' : description,
    data: { reportId, lat: String(lat), lng: String(lng) },
  }).catch((err) => console.error('[FCM] Accident alert failed:', err));

  res.status(201).json({ reportId });
}
