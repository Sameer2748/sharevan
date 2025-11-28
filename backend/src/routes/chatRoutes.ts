import { Router } from 'express';
import { getChatMessages, getUnreadCount } from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/chat/:orderId
 * @desc    Get all chat messages for an order
 * @access  Private (User or Driver in the order)
 */
router.get('/:orderId', getChatMessages);

/**
 * @route   GET /api/chat/:orderId/unread-count
 * @desc    Get unread message count for an order
 * @access  Private (User or Driver in the order)
 */
router.get('/:orderId/unread-count', getUnreadCount);

export default router;
