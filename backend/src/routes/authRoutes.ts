import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to mobile number
 * @access  Public
 */
router.post('/send-otp', authController.sendOTP);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and login
 * @access  Public
 */
router.post('/verify-otp', authController.verifyOTPAndLogin);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route   POST /api/auth/register-driver
 * @desc    Register new driver
 * @access  Public
 */
router.post('/register-driver', authController.registerDriver);

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update user/driver profile
 * @access  Private
 */
router.put('/update-profile', authenticateToken, authController.updateProfile);

export default router;
