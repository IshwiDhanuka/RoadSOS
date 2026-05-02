import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { reportAccident } from '../controllers/reportController';

const router = Router();

router.post('/accident', requireAuth, asyncHandler(reportAccident));

export default router;
