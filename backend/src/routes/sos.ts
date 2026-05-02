import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { triggerSos, updateSosStatus } from '../controllers/sosController';

const router = Router();

const sosLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many SOS requests. Please try again shortly.' },
});

router.use(sosLimiter);

router.post('/trigger', asyncHandler(triggerSos));
router.patch('/:id/status', requireAuth, asyncHandler(updateSosStatus));

export default router;
