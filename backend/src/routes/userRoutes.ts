import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication and USER role
router.use(authenticateToken);
router.use(requireRole('USER'));

/**
 * @route   GET /api/user/dashboard
 * @desc    Get user dashboard data
 * @access  Private (USER)
 */
router.get('/dashboard', userController.getDashboard);

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile
 * @access  Private (USER)
 */
router.get('/profile', userController.getProfile);

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private (USER)
 */
router.put('/profile', userController.updateProfile);

/**
 * @route   GET /api/user/addresses
 * @desc    Get saved addresses
 * @access  Private (USER)
 */
router.get('/addresses', userController.getSavedAddresses);

/**
 * @route   POST /api/user/addresses
 * @desc    Add saved address
 * @access  Private (USER)
 */
router.post('/addresses', userController.addSavedAddress);

/**
 * @route   PUT /api/user/addresses/:id
 * @desc    Update saved address
 * @access  Private (USER)
 */
router.put('/addresses/:id', userController.updateSavedAddress);

/**
 * @route   DELETE /api/user/addresses/:id
 * @desc    Delete saved address
 * @access  Private (USER)
 */
router.delete('/addresses/:id', userController.deleteSavedAddress);

/**
 * @route   POST /api/user/orders/:id/rate
 * @desc    Rate driver after delivery
 * @access  Private (USER)
 */
router.post('/orders/:id/rate', userController.rateDriver);

export default router;
