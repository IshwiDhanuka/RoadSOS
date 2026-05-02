import { getMessaging } from '../config/firebase';
import { getDb } from '../config/firebase';
import ngeohash from 'ngeohash';

const GEOHASH_PRECISION_NOTIFY = 6;

async function getTokensNear(lat: number, lng: number): Promise<string[]> {
  /** Queries Firestore /fcmTokens collection for device tokens whose registered geohash
   *  falls within the precision-6 cell of (lat, lng) or any of its 8 neighbours (~1.2 km
   *  coverage). Uses the Firestore 'in' operator (max 10 values). Returns an array of
   *  FCM registration tokens. */
  const center = ngeohash.encode(lat, lng, GEOHASH_PRECISION_NOTIFY);
  const neighbours = ngeohash.neighbors(center);
  const cells = [center, ...neighbours];

  const db = getDb();
  const snap = await db
    .collection('fcmTokens')
    .where('geohash', 'in', cells.slice(0, 10))
    .get();

  return snap.docs.map((d: any) => d.data().token as string).filter(Boolean);
}

export interface FcmAlert {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function multicastNearby(
  lat: number,
  lng: number,
  alert: FcmAlert,
): Promise<number> {
  /** Sends an FCM push notification to all users within ~1 km of the given coordinates.
   *  Fetches tokens via getTokensNear, then batches them in groups of 500 (FCM limit)
   *  and sends via sendEachForMulticast. Returns total successful send count. Silently
   *  returns 0 if no tokens are found in the area. */
  const tokens = await getTokensNear(lat, lng);
  if (tokens.length === 0) return 0;

  const messaging = getMessaging();

  const batches: string[][] = [];
  for (let i = 0; i < tokens.length; i += 500) {
    batches.push(tokens.slice(i, i + 500));
  }

  let successCount = 0;

  for (const batch of batches) {
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: {
        title: alert.title,
        body: alert.body,
      },
      data: alert.data,
    });
    successCount += response.successCount;
  }

  return successCount;
}
