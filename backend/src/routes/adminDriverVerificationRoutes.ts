import { Router } from 'express';
import * as adminDriverVerificationController from '../controllers/adminDriverVerificationController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole('ADMIN'), adminDriverVerificationController.getDriverVerifications);
router.get('/:id', authenticateToken, requireRole('ADMIN'), adminDriverVerificationController.getDriverVerificationById);
router.put('/:id', authenticateToken, requireRole('ADMIN'), adminDriverVerificationController.updateDriverVerification);

export default router;

