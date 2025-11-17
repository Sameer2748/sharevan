import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/helpers';
import { calculateDriverEarnings } from '../services/pricingService';
import { sendSMS } from '../services/smsService';
import { uploadToS3 } from '../services/s3Service';

/**
 * Complete driver onboarding
 * POST /api/driver/complete-onboarding
 */
export const completeOnboarding = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return sendError(res, 'Only drivers can complete onboarding', 403);
    }

    const { name, dateOfBirth, mobile, email, licenseNumber, aadharNumber, vehicleType, vehicleNumber, vehicleModel, vehicleColor } = req.body;

    // Validate required fields
    if (!name || !dateOfBirth || !licenseNumber) {
      return sendError(res, 'Name, date of birth, and license number are required');
    }

    // Parse date - handle both DD/MM/YYYY and ISO format
    let parsedDate: Date;
    if (dateOfBirth.includes('/')) {
      // DD/MM/YYYY format
      const [day, month, year] = dateOfBirth.split('/');
      parsedDate = new Date(`${year}-${month}-${day}`);
    } else {
      // ISO format
      parsedDate = new Date(dateOfBirth);
    }

    // Validate the parsed date
    if (isNaN(parsedDate.getTime())) {
      return sendError(res, 'Invalid date format. Please use DD/MM/YYYY or YYYY-MM-DD');
    }

    // Handle file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let profileImageUrl, licenseImageUrl, aadharImageUrl, vehicleRegImageUrl;

    if (files?.profileImage?.[0]) {
      const file = files.profileImage[0];
      const result = await uploadToS3(file.buffer, 'driver-profiles', file.originalname, file.mimetype);
      profileImageUrl = result.url;
    }

    if (files?.licenseImage?.[0]) {
      const file = files.licenseImage[0];
      const result = await uploadToS3(file.buffer, 'driver-licenses', file.originalname, file.mimetype);
      licenseImageUrl = result.url;
    }

    if (files?.aadharImage?.[0]) {
      const file = files.aadharImage[0];
      const result = await uploadToS3(file.buffer, 'driver-documents', file.originalname, file.mimetype);
      aadharImageUrl = result.url;
    }

    if (files?.vehicleRegImage?.[0]) {
      const file = files.vehicleRegImage[0];
      const result = await uploadToS3(file.buffer, 'driver-vehicles', file.originalname, file.mimetype);
      vehicleRegImageUrl = result.url;
    }

    // Update driver with onboarding data
    const driver = await prisma.driver.update({
      where: { id: req.user.id },
      data: {
        name,
        dateOfBirth: parsedDate,
        mobile: mobile || undefined,
        email: email || req.user.email,
        licenseNumber: licenseNumber.toUpperCase(),
        aadharNumber: aadharNumber || undefined,
        vehicleType: vehicleType || undefined,
        vehicleNumber: vehicleNumber ? vehicleNumber.toUpperCase() : undefined,
        vehicleModel: vehicleModel || undefined,
        vehicleColor: vehicleColor || undefined,
        profileImage: profileImageUrl || undefined,
        licenseImage: licenseImageUrl || undefined,
        aadharImage: aadharImageUrl || undefined,
        vehicleRegImage: vehicleRegImageUrl || undefined,
        onboardingCompleted: true,
        status: 'PENDING_VERIFICATION', // Will be verified by admin
      },
    });

    return sendSuccess(res, { driver }, 'Onboarding completed successfully');
  } catch (error: any) {
    console.error('Complete onboarding error:', error);
    return sendError(res, error.message || 'Failed to complete onboarding', 500);
  }
};

/**
 * Toggle driver online/offline status
 * PUT /api/driver/online-status
 */
export const toggleOnlineStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return sendError(res, 'Only drivers can toggle online status', 403);
    }

    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return sendError(res, 'isOnline must be a boolean');
    }

    const driver = await prisma.driver.update({
      where: { id: req.user.id },
      data: { isOnline }
    });

    // Join/leave online drivers room via WebSocket
    // This will be handled in socket.io connection

    return sendSuccess(res, { isOnline: driver.isOnline },
      isOnline ? 'You are now online' : 'You are now offline'
    );

  } catch (error: any) {
    console.error('Toggle online status error:', error);
    return sendError(res, error.message || 'Failed to update status', 500);
  }
};

/**
 * Get available orders for driver
 * GET /api/driver/orders/available
 */
export const getAvailableOrders = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return sendError(res, 'Only drivers can view available orders', 403);
    }

    // Get driver to check if online
    const driver = await prisma.driver.findUnique({
      where: { id: req.user.id }
    });

    if (!driver || !driver.isOnline) {
      return sendSuccess(res, { orders: [] }, 'Go online to see available orders');
    }

    // Get orders searching for drivers
    const orders = await prisma.order.findMany({
      where: {
        status: 'SEARCHING_DRIVER',
        driverId: null
      },
      include: {
        user: {
          select: { name: true, mobile: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Calculate potential earnings for each order
    const ordersWithEarnings = await Promise.all(
      orders.map(async (order) => {
        const earnings = await calculateDriverEarnings(order.estimatedPrice);
        return {
          ...order,
          potentialEarning: earnings.netEarning
        };
      })
    );

    return sendSuccess(res, { orders: ordersWithEarnings });

  } catch (error: any) {
    console.error('Get available orders error:', error);
    return sendError(res, error.message || 'Failed to get orders', 500);
  }
};

/**
 * CRITICAL: Accept order with race condition handling
 * POST /api/driver/orders/:id/accept
 */
export const acceptOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return sendError(res, 'Only drivers can accept orders', 403);
    }

    const { id: orderId } = req.params;
    const driverId = req.user.id;

    // Check if driver is online
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { isOnline: true, status: true, name: true, mobile: true, vehicleNumber: true }
    });

    if (!driver || !driver.isOnline) {
      return sendError(res, 'You must be online to accept orders', 400);
    }

    if (driver.status !== 'VERIFIED') {
      return sendError(res, 'Your account must be verified to accept orders', 403);
    }

    // Check if driver already has an active order
    const activeOrder = await prisma.order.findFirst({
      where: {
        driverId,
        status: {
          in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'PICKED_UP', 'IN_TRANSIT', 'REACHED_DESTINATION']
        }
      }
    });

    if (activeOrder) {
      return sendError(res, 'You already have an active delivery. Please complete it before accepting new orders.', 400);
    }

    // Use transaction with database-level locking to prevent race condition
    const result = await prisma.$transaction(async (tx) => {
      // Lock the order row with FOR UPDATE (PostgreSQL row-level lock)
      const order: any = await tx.$queryRaw`
        SELECT * FROM "orders"
        WHERE id = ${orderId}
        FOR UPDATE
      `;

      if (!order || order.length === 0) {
        throw new Error('ORDER_NOT_FOUND');
      }

      const orderData = order[0];

      // Check if already assigned
      if (orderData.driverId !== null) {
        throw new Error('ORDER_ALREADY_ASSIGNED');
      }

      // Check status
      if (orderData.status !== 'SEARCHING_DRIVER') {
        throw new Error('ORDER_NOT_AVAILABLE');
      }

      // Assign driver atomically
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          driverId,
          status: 'DRIVER_ASSIGNED',
          driverAssignedAt: new Date(),
          assignmentAttempts: { increment: 1 }
        },
        include: {
          user: {
            select: { id: true, name: true, mobile: true, profileImage: true }
          },
          driver: {
            select: { id: true, name: true, mobile: true, vehicleNumber: true, vehicleType: true, rating: true }
          }
        }
      });

      // Add status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: 'DRIVER_ASSIGNED',
          changedBy: 'DRIVER',
          metadata: { driverId, driverName: driver.name }
        }
      });

      return updated;
    }, {
      isolationLevel: 'Serializable', // Highest isolation level
      maxWait: 5000,  // Wait max 5 seconds for lock
      timeout: 10000  // Transaction timeout 10 seconds
    });

    // Send notifications
    // SMS to user
    await sendSMS(
      result.user.mobile,
      `Driver ${driver.name} (${driver.vehicleNumber}) has been assigned to your order #${result.orderNumber}. Track your delivery in the app.`
    );

    // WebSocket notifications
    if ((req as any).io) {
      // Notify user
      (req as any).io.to(`user-${result.userId}`).emit('driver-assigned', {
        orderId: result.id,
        orderNumber: result.orderNumber,
        status: result.status,
        pickupOtp: result.pickupOtp,
        deliveryOtp: result.deliveryOtp,
        etaMinutes: result.estimatedDuration,
        driver: {
          id: result.driver?.id,
          name: result.driver?.name,
          mobile: result.driver?.mobile,
          vehicleNumber: result.driver?.vehicleNumber,
          vehicleType: result.driver?.vehicleType,
          rating: result.driver?.rating
        }
      });

      // Notify all online drivers that order is taken
      (req as any).io.to('online-drivers').emit('order-taken', {
        orderId: result.id
      });

      // Broadcast order status update
      (req as any).io.to(`user-${result.userId}`).emit('order-status-update', {
        orderId: result.id,
        status: 'DRIVER_ASSIGNED',
        timestamp: new Date()
      });
    }

    return sendSuccess(res, result, 'Order accepted successfully!');

  } catch (error: any) {
    // Handle specific errors
    if (error.message === 'ORDER_ALREADY_ASSIGNED') {
      return sendError(res, 'Sorry, this order has already been accepted by another driver', 409);
    }
    if (error.message === 'ORDER_NOT_AVAILABLE') {
      return sendError(res, 'This order is no longer available', 400);
    }
    if (error.message === 'ORDER_NOT_FOUND') {
      return sendError(res, 'Order not found', 404);
    }

    console.error('Accept order error:', error);
    return sendError(res, 'Failed to accept order. Please try again.', 500);
  }
};

/**
 * Update order status
 * PUT /api/driver/orders/:id/status
 */
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return sendError(res, 'Only drivers can update order status', 403);
    }

    const { id: orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['DRIVER_ARRIVED', 'IN_TRANSIT', 'REACHED_DESTINATION'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 'Invalid status');
    }

    // Verify order belongs to this driver
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { mobile: true } }
      }
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    if (order.driverId !== req.user.id) {
      return sendError(res, 'This order is not assigned to you', 403);
    }

    // Update status with timestamp
    const timestampField =
      status === 'DRIVER_ARRIVED' ? 'driverArrivedAt' :
      status === 'IN_TRANSIT' ? 'inTransitAt' :
      status === 'REACHED_DESTINATION' ? 'reachedDestinationAt' : null;

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(timestampField && { [timestampField]: new Date() })
      }
    });

    // Add status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status,
        changedBy: 'DRIVER'
      }
    });

    // Notify user via WebSocket
    if ((req as any).io) {
      (req as any).io.to(`user-${order.userId}`).emit('order-status-update', {
        orderId: order.id,
        status,
        timestamp: new Date()
      });
    }

    // Send SMS for important status changes
    if (status === 'DRIVER_ARRIVED') {
      await sendSMS(order.user.mobile, `Your driver has arrived at the pickup location for order #${order.orderNumber}`);
    } else if (status === 'IN_TRANSIT') {
      await sendSMS(order.user.mobile, `Your package is on the way! Order #${order.orderNumber}`);
    } else if (status === 'REACHED_DESTINATION') {
      await sendSMS(order.user.mobile, `Your driver has reached the delivery location for order #${order.orderNumber}`);
    }

    return sendSuccess(res, updated, 'Status updated successfully');

  } catch (error: any) {
    console.error('Update order status error:', error);
    return sendError(res, error.message || 'Failed to update status', 500);
  }
};

/**
 * Verify pickup OTP
 * POST /api/driver/orders/:id/verify-pickup
 */
export const verifyPickupOTP = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return sendError(res, 'Only drivers can verify pickup', 403);
    }

    const { id: orderId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return sendError(res, 'OTP is required');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { mobile: true } }
      }
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    if (order.driverId !== req.user.id) {
      return sendError(res, 'This order is not assigned to you', 403);
    }

    // Debug logging
    console.log('OTP Verification Debug:');
    console.log('Received OTP:', otp, 'Type:', typeof otp);
    console.log('Stored OTP:', order.pickupOtp, 'Type:', typeof order.pickupOtp);
    console.log('Match:', order.pickupOtp === otp);
    console.log('String Match:', String(order.pickupOtp) === String(otp));

    // Ensure both are strings and compare
    if (String(order.pickupOtp).trim() !== String(otp).trim()) {
      return sendError(res, 'Invalid OTP', 400);
    }

    if (order.pickupOtpVerified) {
      return sendError(res, 'Pickup already verified', 400);
    }

    // Update order
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PICKED_UP',
        pickupOtpVerified: true,
        pickedUpAt: new Date()
      }
    });

    // Add status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: 'PICKED_UP',
        changedBy: 'DRIVER',
        metadata: { otpVerified: true }
      }
    });

    // Notify user
    if ((req as any).io) {
      (req as any).io.to(`user-${order.userId}`).emit('order-status-update', {
        orderId: order.id,
        status: 'PICKED_UP',
        timestamp: new Date()
      });
    }

    await sendSMS(order.user.mobile, `Package picked up successfully! Order #${order.orderNumber} is now in transit.`);

    return sendSuccess(res, updated, 'Pickup verified successfully');

  } catch (error: any) {
    console.error('Verify pickup error:', error);
    return sendError(res, error.message || 'Failed to verify pickup', 500);
  }
};

/**
 * Verify delivery OTP and complete order
 * POST /api/driver/orders/:id/verify-delivery
 */
export const verifyDeliveryOTP = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return sendError(res, 'Only drivers can verify delivery', 403);
    }

    const { id: orderId } = req.params;
    const { otp, deliveryNotes, proofOfDeliveryUrl } = req.body;

    if (!otp) {
      return sendError(res, 'OTP is required');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { mobile: true } },
        driver: { select: { id: true, totalEarnings: true, totalOrders: true, rating: true, totalRatings: true } }
      }
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    if (order.driverId !== req.user.id) {
      return sendError(res, 'This order is not assigned to you', 403);
    }

    // Debug logging
    console.log('Delivery OTP Verification Debug:');
    console.log('Received OTP:', otp, 'Type:', typeof otp);
    console.log('Stored OTP:', order.deliveryOtp, 'Type:', typeof order.deliveryOtp);
    console.log('Match:', order.deliveryOtp === otp);
    console.log('String Match:', String(order.deliveryOtp) === String(otp));

    // Ensure both are strings and compare
    if (String(order.deliveryOtp).trim() !== String(otp).trim()) {
      return sendError(res, 'Invalid OTP', 400);
    }

    if (order.deliveryOtpVerified) {
      return sendError(res, 'Delivery already verified', 400);
    }

    // Calculate driver earnings
    const earnings = await calculateDriverEarnings(order.finalPrice || order.estimatedPrice);

    // Complete order in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update order
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          deliveryOtpVerified: true,
          deliveredAt: new Date(),
          deliveryNotes,
          proofOfDeliveryUrl
        }
      });

      // Add status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: 'DELIVERED',
          changedBy: 'DRIVER',
          metadata: { otpVerified: true, earnings: earnings.netEarning }
        }
      });

      // Record earnings
      await tx.earning.create({
        data: {
          driverId: order.driverId!,
          orderId: order.id,
          amount: earnings.grossAmount,
          commission: earnings.commission,
          netEarning: earnings.netEarning
        }
      });

      // Update driver statistics
      await tx.driver.update({
        where: { id: order.driverId! },
        data: {
          totalEarnings: { increment: earnings.netEarning },
          totalOrders: { increment: 1 }
        }
      });

      return updated;
    });

    // Notify user
    if ((req as any).io) {
      (req as any).io.to(`user-${order.userId}`).emit('order-status-update', {
        orderId: order.id,
        status: 'DELIVERED',
        timestamp: new Date()
      });
    }

    await sendSMS(order.user.mobile, `Order #${order.orderNumber} delivered successfully! Thank you for using Sharevan.`);

    return sendSuccess(res, {
      order: result,
      earnings: earnings.netEarning
    }, `Delivery completed! You earned ₹${earnings.netEarning}`);

  } catch (error: any) {
    console.error('Verify delivery error:', error);
    return sendError(res, error.message || 'Failed to verify delivery', 500);
  }
};

/**
 * Get driver's earnings
 * GET /api/driver/earnings
 */
export const getDriverEarnings = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return sendError(res, 'Only drivers can view earnings', 403);
    }

    const { period = 'all' } = req.query;

    const where: any = { driverId: req.user.id };

    // Filter by period
    if (period === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.date = { gte: today };
    } else if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      where.date = { gte: weekAgo };
    } else if (period === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      where.date = { gte: monthAgo };
    }

    const earnings = await prisma.earning.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 50
    });

    const totalEarnings = earnings.reduce((sum, e) => sum + e.netEarning, 0);
    const totalCommission = earnings.reduce((sum, e) => sum + e.commission, 0);

    // Get driver total stats
    const driver = await prisma.driver.findUnique({
      where: { id: req.user.id },
      select: { totalEarnings: true, totalOrders: true, rating: true }
    });

    return sendSuccess(res, {
      earnings,
      summary: {
        periodTotal: totalEarnings,
        periodCommission: totalCommission,
        totalEarnings: driver?.totalEarnings || 0,
        totalOrders: driver?.totalOrders || 0,
        rating: driver?.rating || 0
      }
    });

  } catch (error: any) {
    console.error('Get earnings error:', error);
    return sendError(res, error.message || 'Failed to get earnings', 500);
  }
};

/**
 * Get active order for driver
 * GET /api/driver/orders/active
 */
export const getActiveOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return sendError(res, 'Only drivers can view active orders', 403);
    }

    const activeOrder = await prisma.order.findFirst({
      where: {
        driverId: req.user.id,
        status: {
          in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'PICKED_UP', 'IN_TRANSIT', 'REACHED_DESTINATION']
        }
      },
      include: {
        user: {
          select: { id: true, name: true, mobile: true, profileImage: true }
        }
      }
    });

    return sendSuccess(res, { order: activeOrder });

  } catch (error: any) {
    console.error('Get active order error:', error);
    return sendError(res, error.message || 'Failed to get active order', 500);
  }
};

/**
 * Update driver profile
 * PUT /api/driver/profile
 */
export const updateDriverProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return sendError(res, 'Only drivers can update profile', 403);
    }

    const {
      name,
      email,
      profileImage,
      vehicleModel,
      vehicleColor,
      licenseImage,
      vehicleRegImage
    } = req.body;

    const updatedDriver = await prisma.driver.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(profileImage && { profileImage }),
        ...(vehicleModel && { vehicleModel }),
        ...(vehicleColor && { vehicleColor }),
        ...(licenseImage && { licenseImage }),
        ...(vehicleRegImage && { vehicleRegImage })
      }
    });

    return sendSuccess(res, updatedDriver, 'Profile updated successfully');

  } catch (error: any) {
    console.error('Update driver profile error:', error);
    return sendError(res, error.message || 'Failed to update profile', 500);
  }
};

/**
 * Get pending drivers for admin verification
 * GET /api/driver/pending
 */
export const getPendingDrivers = async (req: Request, res: Response) => {
  try {
    const pendingDrivers = await prisma.driver.findMany({
      where: { status: 'PENDING_VERIFICATION' },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, pendingDrivers);

  } catch (error: any) {
    console.error('Get pending drivers error:', error);
    return sendError(res, error.message || 'Failed to get pending drivers', 500);
  }
};

/**
 * Verify or reject a driver (Admin only)
 * PUT /api/driver/:id/verify
 */
export const verifyDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, verifiedBy } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return sendError(res, 'Status must be VERIFIED or REJECTED');
    }

    if (status === 'REJECTED' && !rejectionReason) {
      return sendError(res, 'Rejection reason is required');
    }

    const updateData: any = {
      status,
      ...(status === 'VERIFIED' && {
        verifiedAt: new Date(),
        verifiedBy: verifiedBy || 'admin'
      }),
      ...(status === 'REJECTED' && {
        rejectionReason
      })
    };

    const driver = await prisma.driver.update({
      where: { id },
      data: updateData
    });

    // TODO: Send notification to driver (SMS/Email)
    if (status === 'VERIFIED') {
      await sendSMS(driver.mobile, `Congratulations! Your Sharevan driver account has been verified. Login now to start accepting orders.`);
    } else {
      await sendSMS(driver.mobile, `Your Sharevan driver application was not approved. Reason: ${rejectionReason}`);
    }

    return sendSuccess(res, driver, `Driver ${status.toLowerCase()} successfully`);

  } catch (error: any) {
    console.error('Verify driver error:', error);
    return sendError(res, error.message || 'Failed to verify driver', 500);
  }
};

export default {
  toggleOnlineStatus,
  getAvailableOrders,
  acceptOrder,
  updateOrderStatus,
  verifyPickupOTP,
  verifyDeliveryOTP,
  getDriverEarnings,
  getActiveOrder,
  updateDriverProfile,
  getPendingDrivers,
  verifyDriver
};
