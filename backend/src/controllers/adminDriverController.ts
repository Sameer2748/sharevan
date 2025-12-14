import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/helpers';

/**
 * Get drivers list with pagination and search
 * GET /api/admin/drivers?page=1&limit=10&search=query
 */
export const getDrivers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    // Build search filter
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { vehicleNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get drivers
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          vehicleType: true,
          vehicleNumber: true,
          status: true,
          rating: true,
          totalOrders: true,
          createdAt: true,
        },
      }),
      prisma.driver.count({ where }),
    ]);

    const formattedDrivers = drivers.map((driver) => {
      const shortId = driver.id.slice(-5);
      const statusLabel = driver.status === 'VERIFIED' ? 'Active' : 
                          driver.status === 'PENDING_VERIFICATION' ? 'Pending' :
                          driver.status === 'REJECTED' ? 'Rejected' :
                          driver.status === 'SUSPENDED' ? 'Suspended' : 'Active';

      return {
        id: driver.id,
        shortId,
        name: driver.name || 'N/A',
        email: driver.email,
        mobile: driver.mobile || 'N/A',
        vehicleType: driver.vehicleType || 'N/A',
        vehicleNumber: driver.vehicleNumber || 'N/A',
        rating: driver.rating,
        totalOrders: driver.totalOrders,
        status: driver.status,
        statusLabel,
        joinedDate: driver.createdAt.toISOString(),
      };
    });

    return sendSuccess(
      res,
      {
        drivers: formattedDrivers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Drivers retrieved successfully'
    );
  } catch (error: any) {
    console.error('Get drivers error:', error);
    return sendError(res, error.message || 'Failed to get drivers', 500);
  }
};

/**
 * Get driver details by ID
 * GET /api/admin/drivers/:id
 */
export const getDriverById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        vehicleType: true,
        vehicleNumber: true,
        vehicleModel: true,
        vehicleColor: true,
        rating: true,
        totalRatings: true,
        totalOrders: true,
        totalEarnings: true,
        status: true,
        licenseNumber: true,
        licenseImage: true,
        vehicleRegImage: true,
        aadharNumber: true,
        aadharImage: true,
        panNumber: true,
        panImage: true,
        createdAt: true,
      },
    });

    if (!driver) {
      return sendError(res, 'Driver not found', 404);
    }

    const shortId = driver.id.slice(-5);
    const statusLabel = driver.status === 'VERIFIED' ? 'Active' : 
                        driver.status === 'PENDING_VERIFICATION' ? 'Pending' :
                        driver.status === 'REJECTED' ? 'Rejected' :
                        driver.status === 'SUSPENDED' ? 'Suspended' : 'Active';

    // Calculate acceptance rate (if we had order acceptance data, for now use a placeholder)
    const acceptanceRate = 92; // This would come from actual order acceptance data

    return sendSuccess(
      res,
      {
        id: driver.id,
        shortId,
        name: driver.name || 'N/A',
        email: driver.email,
        mobile: driver.mobile || 'N/A',
        vehicleType: driver.vehicleType || 'N/A',
        vehicleNumber: driver.vehicleNumber || 'N/A',
        vehicleModel: driver.vehicleModel || 'N/A',
        vehicleColor: driver.vehicleColor || 'N/A',
        rating: driver.rating,
        totalRatings: driver.totalRatings,
        totalOrders: driver.totalOrders,
        totalEarnings: driver.totalEarnings,
        acceptanceRate,
        status: driver.status,
        statusLabel,
        licenseNumber: driver.licenseNumber,
        licenseImage: driver.licenseImage,
        vehicleRegImage: driver.vehicleRegImage,
        aadharNumber: driver.aadharNumber,
        aadharImage: driver.aadharImage,
        panNumber: driver.panNumber,
        panImage: driver.panImage,
        joinedDate: driver.createdAt.toISOString(),
      },
      'Driver details retrieved successfully'
    );
  } catch (error: any) {
    console.error('Get driver details error:', error);
    return sendError(res, error.message || 'Failed to get driver details', 500);
  }
};

/**
 * Update driver (suspend/unsuspend)
 * PUT /api/admin/drivers/:id
 */
export const updateDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;

    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) {
      return sendError(res, 'Driver not found', 404);
    }

    const updateData: any = {};
    
    if (typeof isSuspended === 'boolean') {
      updateData.status = isSuspended ? 'SUSPENDED' : 'VERIFIED';
    }

    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        vehicleType: true,
        status: true,
        rating: true,
        totalOrders: true,
      },
    });

    return sendSuccess(res, updatedDriver, 'Driver updated successfully');
  } catch (error: any) {
    console.error('Update driver error:', error);
    return sendError(res, error.message || 'Failed to update driver', 500);
  }
};

