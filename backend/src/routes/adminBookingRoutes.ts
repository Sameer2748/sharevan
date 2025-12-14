import { Router } from 'express';
import * as adminBookingController from '../controllers/adminBookingController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole('ADMIN'), adminBookingController.getBookings);
router.get('/:id', authenticateToken, requireRole('ADMIN'), adminBookingController.getBookingById);

export default router;

