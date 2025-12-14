import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/helpers';

/**
 * Get customers list with pagination and search
 * GET /api/admin/customers?page=1&limit=10&search=query
 */
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    // Build search filter
    const where: any = {
      role: 'USER', // Only get users, not drivers or admins
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get customers with order counts and total spent
    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          isSuspended: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Get total spent for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orders = await prisma.order.findMany({
          where: {
            userId: customer.id,
            status: 'DELIVERED',
          },
          select: {
            finalPrice: true,
          },
        });

        const totalSpent = orders.reduce((sum, order) => sum + (order.finalPrice || 0), 0);

        // Get short ID (last 5 characters)
        const shortId = customer.id.slice(-5);

        return {
          id: customer.id,
          shortId,
          name: customer.name || 'N/A',
          email: customer.email,
          mobile: customer.mobile || 'N/A',
          bookingsCount: customer._count.orders,
          totalSpent,
          status: customer.isSuspended ? 'Suspended' : 'Active',
          isSuspended: customer.isSuspended,
          createdAt: customer.createdAt,
        };
      })
    );

    return sendSuccess(
      res,
      {
        customers: customersWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Customers retrieved successfully'
    );
  } catch (error: any) {
    console.error('Get customers error:', error);
    return sendError(res, error.message || 'Failed to get customers', 500);
  }
};

/**
 * Get customer details by ID
 * GET /api/admin/customers/:id
 */
export const getCustomerDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        isSuspended: true,
        note: true,
        promoCode: true,
        promoCodeAssignedAt: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!customer || customer.role !== 'USER') {
      return sendError(res, 'Customer not found', 404);
    }

    // Get total spent
    const orders = await prisma.order.findMany({
      where: {
        userId: customer.id,
        status: 'DELIVERED',
      },
      select: {
        finalPrice: true,
      },
    });

    const totalSpent = orders.reduce((sum, order) => sum + (order.finalPrice || 0), 0);

    // Get last booking
    const lastBooking = await prisma.order.findFirst({
      where: { userId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        driver: {
          select: {
            name: true,
          },
        },
      },
    });

    let lastBookingFormatted = null;
    if (lastBooking) {
      const extractLocation = (address: string) => {
        const parts = address.split(',');
        if (parts.length > 1) {
          return parts[0].trim();
        }
        const words = address.split(' ');
        return words.slice(0, 2).join(' ');
      };

      const orderIdShort = lastBooking.id.slice(-5);
      let statusLabel = lastBooking.status.replace('_', ' ');
      if (lastBooking.status === 'IN_TRANSIT') {
        statusLabel = 'Ongoing';
      } else if (lastBooking.status === 'DELIVERED') {
        statusLabel = 'Completed';
      } else if (lastBooking.status === 'CANCELLED') {
        statusLabel = 'Cancelled';
      }

      lastBookingFormatted = {
        id: lastBooking.id,
        orderIdShort,
        status: lastBooking.status,
        statusLabel,
        fromLocation: extractLocation(lastBooking.pickupAddress),
        toLocation: extractLocation(lastBooking.deliveryAddress),
        price: lastBooking.finalPrice || lastBooking.estimatedPrice,
        createdAt: lastBooking.createdAt,
        driverName: lastBooking.driver?.name || null,
      };
    }

    const shortId = customer.id.slice(-5);

    return sendSuccess(
      res,
      {
        id: customer.id,
        shortId,
        name: customer.name || 'N/A',
        email: customer.email,
        mobile: customer.mobile || 'N/A',
        isSuspended: customer.isSuspended,
        note: customer.note,
        promoCode: customer.promoCode,
        promoCodeAssignedAt: customer.promoCodeAssignedAt,
        joinedDate: customer.createdAt,
        totalBookings: customer._count.orders,
        totalSpent,
        lastBooking: lastBookingFormatted,
      },
      'Customer details retrieved successfully'
    );
  } catch (error: any) {
    console.error('Get customer details error:', error);
    return sendError(res, error.message || 'Failed to get customer details', 500);
  }
};

/**
 * Update customer (suspend/unsuspend, add note, assign promo code)
 * PUT /api/admin/customers/:id
 */
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isSuspended, note, promoCode } = req.body;

    const updateData: any = {};

    if (typeof isSuspended === 'boolean') {
      updateData.isSuspended = isSuspended;
    }

    if (note !== undefined) {
      updateData.note = note || null;
    }

    if (promoCode !== undefined) {
      updateData.promoCode = promoCode || null;
      updateData.promoCodeAssignedAt = promoCode ? new Date() : null;
    }

    const customer = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isSuspended: true,
        note: true,
        promoCode: true,
        promoCodeAssignedAt: true,
      },
    });

    return sendSuccess(res, customer, 'Customer updated successfully');
  } catch (error: any) {
    console.error('Update customer error:', error);
    return sendError(res, error.message || 'Failed to update customer', 500);
  }
};

