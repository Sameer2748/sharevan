import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/helpers';

/**
 * Get dashboard statistics
 * GET /api/admin/dashboard/stats
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's bookings (orders created today)
    const todayBookings = await prisma.order.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Ongoing trips (orders not delivered or cancelled)
    const ongoingTrips = await prisma.order.count({
      where: {
        status: {
          notIn: ['DELIVERED', 'CANCELLED'],
        },
      },
    });

    // Revenue today (sum of finalPrice for orders delivered today)
    const revenueTodayResult = await prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        finalPrice: true,
      },
    });
    const revenueToday = revenueTodayResult._sum.finalPrice || 0;

    // Available drivers (drivers online and verified)
    const availableDrivers = await prisma.driver.count({
      where: {
        isOnline: true,
        status: 'VERIFIED',
      },
    });

    return sendSuccess(res, {
      todayBookings,
      ongoingTrips,
      revenueToday,
      availableDrivers,
    }, 'Dashboard stats retrieved successfully');

  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    return sendError(res, error.message || 'Failed to get dashboard stats', 500);
  }
};

/**
 * Get recent bookings
 * GET /api/admin/dashboard/recent-bookings
 */
export const getRecentBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await prisma.order.findMany({
      take: 4,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        driver: {
          select: {
            name: true,
          },
        },
      },
    });

    const formattedBookings = bookings.map((order) => {
      // Get last 5 characters of order ID
      const orderIdShort = order.id.slice(-5);
      
      // Extract main location from addresses (first part before comma or first 2 words)
      const extractLocation = (address: string) => {
        const parts = address.split(',');
        if (parts.length > 1) {
          return parts[0].trim();
        }
        const words = address.split(' ');
        return words.slice(0, 2).join(' ');
      };

      const fromLocation = extractLocation(order.pickupAddress);
      const toLocation = extractLocation(order.deliveryAddress);

      // Format status
      let statusLabel = order.status.replace('_', ' ');
      if (order.status === 'IN_TRANSIT') {
        statusLabel = 'Ongoing';
      } else if (order.status === 'DELIVERED') {
        statusLabel = 'Completed';
      }

      // Format time
      const time = new Date(order.createdAt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      return {
        id: order.id,
        orderIdShort,
        status: order.status,
        statusLabel,
        userName: order.user.name || 'N/A',
        fromLocation,
        toLocation,
        price: order.finalPrice || order.estimatedPrice,
        createdAt: order.createdAt,
        time,
        driverName: order.driver?.name || null,
      };
    });

    return sendSuccess(res, formattedBookings, 'Recent bookings retrieved successfully');

  } catch (error: any) {
    console.error('Get recent bookings error:', error);
    return sendError(res, error.message || 'Failed to get recent bookings', 500);
  }
};

/**
 * Get alerts and notifications
 * GET /api/admin/dashboard/alerts
 */
export const getAlerts = async (req: Request, res: Response) => {
  try {
    // Driver verification requests (pending verification)
    const driverVerification = await prisma.driver.count({
      where: {
        status: 'PENDING_VERIFICATION',
      },
    });

    // Failed payments (orders with status issues - we'll use orders without finalPrice or cancelled)
    // This is a simplified version - in real app you'd check payment records
    const failedPayments = await prisma.order.count({
      where: {
        status: 'CANCELLED',
        cancelledAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    // At-risk jobs (orders not delivered for a long time - pending, in transit for too long, or stuck)
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    const atRiskJobs = await prisma.order.count({
      where: {
        OR: [
          // Orders in transit for more than 4 hours
          {
            status: {
              in: ['IN_TRANSIT', 'REACHED_DESTINATION', 'PICKED_UP'],
            },
            inTransitAt: {
              lt: fourHoursAgo,
            },
          },
          // Scheduled orders that are overdue
          {
            status: {
              in: ['PENDING', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED'],
            },
            scheduledDate: {
              lt: now,
            },
            bookingType: 'SCHEDULED',
          },
          // Urgent or same day orders stuck for more than 2 hours
          {
            status: {
              in: ['PENDING', 'SEARCHING_DRIVER'],
            },
            bookingType: {
              in: ['URGENT', 'SAME_DAY_DELIVERY'],
            },
            createdAt: {
              lt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            },
          },
        ],
      },
    });

    return sendSuccess(res, {
      driverVerification,
      failedPayments,
      atRiskJobs,
    }, 'Alerts retrieved successfully');

  } catch (error: any) {
    console.error('Get alerts error:', error);
    return sendError(res, error.message || 'Failed to get alerts', 500);
  }
};

/**
 * Get revenue for this week
 * GET /api/admin/dashboard/weekly-revenue
 */
export const getWeeklyRevenue = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    // Get all delivered orders from this week
    const orders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          gte: startOfWeek,
        },
      },
      select: {
        finalPrice: true,
        deliveredAt: true,
      },
    });

    // Group by day
    const dailyRevenue: { [key: string]: number } = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };

    orders.forEach((order) => {
      if (order.deliveredAt) {
        const dayIndex = order.deliveredAt.getDay();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = dayNames[dayIndex];
        dailyRevenue[dayName] = (dailyRevenue[dayName] || 0) + (order.finalPrice || 0);
      }
    });

    // Calculate total
    const total = Object.values(dailyRevenue).reduce((sum, value) => sum + value, 0);

    return sendSuccess(res, {
      daily: dailyRevenue,
      total,
    }, 'Weekly revenue retrieved successfully');

  } catch (error: any) {
    console.error('Get weekly revenue error:', error);
    return sendError(res, error.message || 'Failed to get weekly revenue', 500);
  }
};

