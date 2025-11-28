import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/helpers';

/**
 * Get chat messages for an order
 * GET /api/chat/:orderId
 */
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Verify order exists and user has access
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, driverId: true }
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    // Check access
    if (userRole === 'USER' && order.userId !== userId) {
      return sendError(res, 'Access denied', 403);
    }

    if (userRole === 'DRIVER' && order.driverId !== userId) {
      return sendError(res, 'Access denied', 403);
    }

    // Get messages
    const messages = await prisma.chatMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' }
    });

    // Mark messages as read
    await prisma.chatMessage.updateMany({
      where: {
        orderId,
        senderId: { not: userId },
        isRead: false
      },
      data: { isRead: true }
    });

    return sendSuccess(res, { messages }, 'Messages retrieved successfully');
  } catch (error: any) {
    console.error('Get chat messages error:', error);
    return sendError(res, 'Failed to get messages', 500);
  }
};

/**
 * Get unread message count for an order
 * GET /api/chat/:orderId/unread-count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    const count = await prisma.chatMessage.count({
      where: {
        orderId,
        senderId: { not: userId },
        isRead: false
      }
    });

    return sendSuccess(res, { count }, 'Unread count retrieved');
  } catch (error: any) {
    console.error('Get unread count error:', error);
    return sendError(res, 'Failed to get unread count', 500);
  }
};
