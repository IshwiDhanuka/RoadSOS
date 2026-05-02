import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { getOfflineBundle } from '../controllers/offlineController';

const router = Router();

router.get('/bundle', requireAuth, asyncHandler(getOfflineBundle));

export default router;
