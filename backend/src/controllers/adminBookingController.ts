import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/helpers';

/**
 * Get bookings list with pagination and search
 * GET /api/admin/bookings?page=1&limit=50&search=query
 */
export const getBookings = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    // Build search filter
    const where: any = {};

    // Filter by status if provided
    const statusFilter = req.query.status as string;
    if (statusFilter && statusFilter !== 'All') {
      const statusMap: Record<string, string> = {
        'Pending': 'PENDING',
        'Scheduled': 'ACCEPTED',
        'Ongoing': 'IN_TRANSIT',
        'Completed': 'DELIVERED',
        'Cancelled': 'CANCELLED',
      };
      where.status = statusMap[statusFilter] || statusFilter;
    }

    if (search) {
      // First get matching user and driver IDs
      const [matchingUsers, matchingDrivers] = await Promise.all([
        prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        }),
        prisma.driver.findMany({
          where: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        }),
      ]);

      const userIds = matchingUsers.map(u => u.id);
      const driverIds = matchingDrivers.map(d => d.id);

      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { pickupAddress: { contains: search, mode: 'insensitive' } },
        { deliveryAddress: { contains: search, mode: 'insensitive' } },
        ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : []),
        ...(driverIds.length > 0 ? [{ driverId: { in: driverIds } }] : []),
      ];
    }

    // Get bookings
    const [bookings, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
            },
          },
          driver: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              vehicleType: true,
              vehicleNumber: true,
              rating: true,
              totalOrders: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const formattedBookings = bookings.map((order) => {
      const shortId = order.id.slice(-5);
      
      const statusLabel = order.status === 'PENDING' ? 'Pending' :
                         order.status === 'ACCEPTED' ? 'Scheduled' :
                         order.status === 'IN_TRANSIT' ? 'Ongoing' :
                         order.status === 'DELIVERED' ? 'Completed' :
                         order.status === 'CANCELLED' ? 'Cancelled' : order.status;

      // Extract location names from addresses
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

      return {
        id: order.id,
        shortId,
        orderNumber: order.orderNumber,
        customer: {
          name: order.user.name || 'N/A',
        },
        driver: order.driver ? {
          id: order.driver.id,
          name: order.driver.name || 'N/A',
          shortId: order.driver.id.slice(-5),
          vehicleType: order.driver.vehicleType || 'N/A',
          contact: {
            mobile: order.driver.mobile || 'N/A',
            email: order.driver.email,
          },
          performance: {
            rating: order.driver.rating || 0,
            trips: order.driver.totalOrders || 0,
          },
        } : null,
        route: {
          from: fromLocation,
          to: toLocation,
        },
        dateTime: order.scheduledDate || order.createdAt,
        price: order.finalPrice || order.estimatedPrice,
        status: order.status,
        statusLabel,
        createdAt: order.createdAt.toISOString(),
        scheduledDate: order.scheduledDate?.toISOString() || null,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return sendSuccess(
      res,
      {
        bookings: formattedBookings,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
      'Bookings retrieved successfully'
    );
  } catch (error: any) {
    console.error('Get bookings error:', error);
    return sendError(res, error.message || 'Failed to get bookings', 500);
  }
};

/**
 * Get booking details by ID
 * GET /api/admin/bookings/:id
 */
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            vehicleType: true,
            vehicleNumber: true,
          },
        },
      },
    });

    if (!order) {
      return sendError(res, 'Booking not found', 404);
    }

    // Format booking details
    const bookingDetails = {
      id: order.id,
      orderNumber: order.orderNumber,
      shortId: order.id.slice(-5),
      customer: {
        name: order.user.name || 'N/A',
        email: order.user.email,
        mobile: order.user.mobile || 'N/A',
      },
      driver: order.driver ? {
        name: order.driver.name || 'N/A',
        email: order.driver.email,
        mobile: order.driver.mobile || 'N/A',
      } : null,
      tripDetails: {
        dateTime: order.scheduledDate || order.createdAt,
        itemsVolume: order.packageDescription || 'N/A',
        volume: `${order.packageWeight}kg`,
      },
      route: {
        pickup: {
          address: order.pickupAddress,
          contactName: order.pickupContactName || 'N/A',
          contactMobile: order.pickupContactMobile || 'N/A',
          scheduledTime: order.scheduledTimeSlot?.split('-')[0] || null,
        },
        dropoff: {
          address: order.deliveryAddress,
          receiverName: order.receiverName,
          receiverMobile: order.receiverMobile,
          scheduledTime: order.scheduledTimeSlot?.split('-')[1] || null,
        },
      },
      priceBreakdown: {
        baseFare: order.estimatedPrice || 0,
        distance: {
          miles: order.distance || 0,
          charge: order.mileageCharge || 0,
        },
        helperCharge: order.helperCharge || 0,
        total: order.finalPrice || order.estimatedPrice,
      },
      status: order.status,
      statusHistory: [], // Can be populated from OrderStatusHistory if needed
      createdAt: order.createdAt.toISOString(),
      acceptedAt: null, // Can be added from status history
      inTransitAt: null,
      deliveredAt: order.deliveredAt?.toISOString() || null,
    };

    return sendSuccess(res, bookingDetails, 'Booking details retrieved successfully');
  } catch (error: any) {
    console.error('Get booking details error:', error);
    return sendError(res, error.message || 'Failed to get booking details', 500);
  }
};

