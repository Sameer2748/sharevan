import { Router } from 'express';
import * as adminDriverController from '../controllers/adminDriverController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole('ADMIN'), adminDriverController.getDrivers);
router.get('/:id', authenticateToken, requireRole('ADMIN'), adminDriverController.getDriverById);
router.put('/:id', authenticateToken, requireRole('ADMIN'), adminDriverController.updateDriver);

export default router;

