import { Router } from 'express';
import * as adminAuthController from '../controllers/adminAuthController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login with email and password
 * @access  Public
 */
router.post('/login', adminAuthController.adminLogin);

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin user
 * @access  Private (Admin only)
 */
router.get('/me', authenticateToken, requireRole('ADMIN'), adminAuthController.getAdminProfile);

export default router;

