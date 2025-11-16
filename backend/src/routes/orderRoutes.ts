import { Router } from 'express';
import * as orderController from '../controllers/orderController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/orders/calculate-price
 * @desc    Calculate price estimate for delivery
 * @access  Public
 */
router.post('/calculate-price', orderController.calculatePriceEstimate);

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private (USER)
 */
router.post('/', authenticateToken, orderController.createOrder);

/**
 * @route   GET /api/orders
 * @desc    Get user's orders
 * @access  Private
 */
router.get('/', authenticateToken, orderController.getUserOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, orderController.getOrderById);

/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private (USER)
 */
router.put('/:id/cancel', authenticateToken, orderController.cancelOrder);

export default router;
