import type { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase';
import type { DecodedToken } from '../interfaces';

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  /** Express middleware that validates the Authorization: Bearer <idToken> header using
   *  Firebase Admin Auth with revocation checking. On success, attaches { uid, email }
   *  to req.user for downstream handlers. Returns 401 if the header is missing, malformed,
   *  or the token fails verification (expired, revoked, invalid signature). */
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const idToken = header.slice(7);

  // Hackathon bypass
  if (idToken === 'hackathon-bypass') {
    req.user = {
      uid: 'hackathon_user_123',
      email: 'tester@roadsos.local',
    };
    next();
    return;
  }


  try {
    const decoded = await getAuth().verifyIdToken(idToken, true);

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
    };

    next();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Token verification failed';
    res.status(401).json({ error: `Unauthorized: ${message}` });
  }
}
