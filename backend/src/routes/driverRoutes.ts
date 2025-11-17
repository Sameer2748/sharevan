import { Router } from 'express';
import * as driverController from '../controllers/driverController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Admin routes (no role restriction - add admin auth later)
/**
 * @route   GET /api/driver/pending
 * @desc    Get pending drivers for verification
 * @access  Public (TODO: Add admin auth)
 */
router.get('/pending', driverController.getPendingDrivers);

/**
 * @route   PUT /api/driver/:id/verify
 * @desc    Verify or reject a driver
 * @access  Public (TODO: Add admin auth)
 */
router.put('/:id/verify', driverController.verifyDriver);

// All routes below require authentication and DRIVER role
router.use(authenticateToken);
router.use(requireRole('DRIVER'));

/**
 * @route   POST /api/driver/complete-onboarding
 * @desc    Complete driver onboarding with documents
 * @access  Private (DRIVER)
 */
router.post('/complete-onboarding', upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'licenseImage', maxCount: 1 },
  { name: 'aadharImage', maxCount: 1 },
  { name: 'vehicleRegImage', maxCount: 1 },
]), driverController.completeOnboarding);

/**
 * @route   PUT /api/driver/online-status
 * @desc    Toggle driver online/offline status
 * @access  Private (DRIVER)
 */
router.put('/online-status', driverController.toggleOnlineStatus);

/**
 * @route   GET /api/driver/orders/available
 * @desc    Get available orders for driver
 * @access  Private (DRIVER)
 */
router.get('/orders/available', driverController.getAvailableOrders);

/**
 * @route   GET /api/driver/orders/active
 * @desc    Get driver's active order
 * @access  Private (DRIVER)
 */
router.get('/orders/active', driverController.getActiveOrder);

/**
 * @route   POST /api/driver/orders/:id/accept
 * @desc    Accept order (with race condition handling)
 * @access  Private (DRIVER)
 */
router.post('/orders/:id/accept', driverController.acceptOrder);

/**
 * @route   PUT /api/driver/orders/:id/status
 * @desc    Update order status
 * @access  Private (DRIVER)
 */
router.put('/orders/:id/status', driverController.updateOrderStatus);

/**
 * @route   POST /api/driver/orders/:id/verify-pickup
 * @desc    Verify pickup OTP
 * @access  Private (DRIVER)
 */
router.post('/orders/:id/verify-pickup', driverController.verifyPickupOTP);

/**
 * @route   POST /api/driver/orders/:id/verify-delivery
 * @desc    Verify delivery OTP and complete order
 * @access  Private (DRIVER)
 */
router.post('/orders/:id/verify-delivery', driverController.verifyDeliveryOTP);

/**
 * @route   GET /api/driver/earnings
 * @desc    Get driver earnings
 * @access  Private (DRIVER)
 */
router.get('/earnings', driverController.getDriverEarnings);

/**
 * @route   PUT /api/driver/profile
 * @desc    Update driver profile
 * @access  Private (DRIVER)
 */
router.put('/profile', driverController.updateDriverProfile);

export default router;
