import { Router } from 'express';
import * as adminDashboardController from '../controllers/adminDashboardController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/stats', authenticateToken, requireRole('ADMIN'), adminDashboardController.getDashboardStats);

/**
 * @route   GET /api/admin/dashboard/recent-bookings
 * @desc    Get recent bookings
 * @access  Private (Admin only)
 */
router.get('/recent-bookings', authenticateToken, requireRole('ADMIN'), adminDashboardController.getRecentBookings);

/**
 * @route   GET /api/admin/dashboard/alerts
 * @desc    Get alerts and notifications
 * @access  Private (Admin only)
 */
router.get('/alerts', authenticateToken, requireRole('ADMIN'), adminDashboardController.getAlerts);

/**
 * @route   GET /api/admin/dashboard/weekly-revenue
 * @desc    Get weekly revenue
 * @access  Private (Admin only)
 */
router.get('/weekly-revenue', authenticateToken, requireRole('ADMIN'), adminDashboardController.getWeeklyRevenue);

export default router;

