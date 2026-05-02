import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getNearbyServices, searchServices } from '../controllers/servicesController';

const router = Router();

router.get('/nearby', asyncHandler(getNearbyServices));
router.get('/search', asyncHandler(searchServices));

export default router;
