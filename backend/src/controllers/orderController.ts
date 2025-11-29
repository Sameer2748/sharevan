import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError, generateOrderNumber } from '../utils/helpers';
import { calculateRoute, checkUlezZone } from '../services/mapService';
import { calculatePrice, calculateDriverEarnings } from '../services/pricingService';
import { generateOrderOTP } from '../services/otpService';
import { sendSMS } from '../services/smsService';
import { calculateDeliveryPrice, validateStorageDates } from '../utils/pricingCalculator';

/**
 * Calculate price estimate
 * POST /api/orders/calculate-price
 */
export const calculatePriceEstimate = async (req: Request, res: Response) => {
  try {
    const {
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
      packageSize,
      bookingType,
      dropPostcode,
      dropAddress,
      numberOfHelpers,
      pickupFloors,
      pickupHasLift,
      dropFloors,
      dropHasLift,
      needsStorage,
      storageStartDate,
      storageEndDate,
      includesInsurance
    } = req.body;

    // Validate coordinates
    if (!pickupLat || !pickupLng || !deliveryLat || !deliveryLng) {
      return sendError(res, 'Pickup and delivery coordinates are required');
    }

    if (!packageSize || !['SMALL', 'MEDIUM', 'LARGE'].includes(packageSize)) {
      return sendError(res, 'Valid package size required (SMALL, MEDIUM, LARGE)');
    }

    if (!bookingType || !['URGENT', 'SAME_DAY_DELIVERY', 'SCHEDULED'].includes(bookingType)) {
      return sendError(res, 'Valid booking type required (URGENT, SAME_DAY_DELIVERY, SCHEDULED)');
    }

    // Calculate distance using map service (returns distance in km)
    const route = await calculateRoute(
      { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) },
      { lat: parseFloat(deliveryLat), lng: parseFloat(deliveryLng) }
    );

    // Convert km to miles (1 km = 0.621371 miles)
    const distanceInMiles = route.distance * 0.621371;

    // Validate storage dates if storage is needed
    let storageDays = 0;
    if (needsStorage && storageStartDate && storageEndDate) {
      const validation = validateStorageDates(new Date(storageStartDate), new Date(storageEndDate));
      if (!validation.valid) {
        return sendError(res, validation.error || 'Invalid storage dates');
      }
      storageDays = validation.days;
    }

    // Check ULEZ zone using accurate Google Maps Geocoding API
    const ulezCheck = await checkUlezZone(parseFloat(deliveryLat), parseFloat(deliveryLng));

    console.log('🗺️ ULEZ Check:', {
      deliveryLat,
      deliveryLng,
      isUlez: ulezCheck.isUlez,
      locality: ulezCheck.locality,
      administrativeArea: ulezCheck.administrativeArea,
      success: ulezCheck.success
    });

    // Calculate price using new pricing calculator
    const estimatePricingInput = {
      deliveryType: bookingType,
      distanceInMiles,
      loadSize: packageSize,
      dropPostcode: dropPostcode || '',
      dropAddress: dropAddress || '',
      dropLat: parseFloat(deliveryLat),
      dropLng: parseFloat(deliveryLng),
      isUlezZone: ulezCheck.isUlez, // Use accurate API result
      numberOfHelpers: numberOfHelpers || 0,
      pickupFloors: pickupFloors || 0,
      pickupHasLift: pickupHasLift !== undefined ? pickupHasLift : true,
      dropFloors: dropFloors || 0,
      dropHasLift: dropHasLift !== undefined ? dropHasLift : true,
      needsStorage: needsStorage || false,
      storageDays,
      includesInsurance: includesInsurance !== undefined ? includesInsurance : true,
    };

    console.log('💰 CALCULATE PRICE ESTIMATE - Input:', JSON.stringify(estimatePricingInput, null, 2));

    const priceBreakdown = calculateDeliveryPrice(estimatePricingInput);

    console.log('💰 CALCULATE PRICE ESTIMATE - Result:', priceBreakdown.total);

    return sendSuccess(res, {
      distance: distanceInMiles,
      distanceInKm: route.distance,
      estimatedDuration: route.duration,
      estimatedPrice: priceBreakdown.total,
      breakdown: {
        mileageCharge: priceBreakdown.mileageCharge,
        loadVolumeCharge: priceBreakdown.loadVolumeCharge,
        ulezCharge: priceBreakdown.ulezCharge,
        stairCarryCharge: priceBreakdown.stairCarryCharge,
        helperCharge: priceBreakdown.helperCharge,
        storageCharge: priceBreakdown.storageCharge,
        insuranceCharge: priceBreakdown.insuranceCharge,
        subtotal: priceBreakdown.subtotal,
        total: priceBreakdown.total,
      },
      isUlezZone: priceBreakdown.isUlezZone,
    });

  } catch (error: any) {
    console.error('Calculate price error:', error);
    return sendError(res, error.message || 'Failed to calculate price', 500);
  }
};

/**
 * Create new order
 * POST /api/orders
 */
export const createOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'USER') {
      return sendError(res, 'Only users can create orders', 403);
    }

    const {
      pickupAddress,
      pickupLat,
      pickupLng,
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      packageSize,
      packageWeight,
      packageImages,
      receiverName,
      receiverMobile,
      receiverAddressLine1,
      receiverAddressLine2,
      receiverPostalCode,
      specialInstructions,
      bookingType,
      scheduledDate,
      scheduledTimeSlot,
      numberOfHelpers,
      pickupFloors,
      pickupHasLift,
      dropFloors,
      dropHasLift,
      needsStorage,
      storageStartDate,
      storageEndDate,
      includesInsurance
    } = req.body;

    // Validate required fields
    if (!pickupAddress || !deliveryAddress || !packageSize || !packageWeight || !receiverName || !receiverMobile) {
      return sendError(res, 'Missing required fields');
    }

    // Calculate route and price
    const route = await calculateRoute(
      { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) },
      { lat: parseFloat(deliveryLat), lng: parseFloat(deliveryLng) }
    );

    // Convert km to miles
    const distanceInMiles = route.distance * 0.621371;

    // Validate storage dates if needed
    let storageDays = 0;
    if (needsStorage && storageStartDate && storageEndDate) {
      const validation = validateStorageDates(new Date(storageStartDate), new Date(storageEndDate));
      if (!validation.valid) {
        return sendError(res, validation.error);
      }
      storageDays = validation.days;
    }

    // Check ULEZ zone using accurate Google Maps Geocoding API
    const ulezCheck = await checkUlezZone(parseFloat(deliveryLat), parseFloat(deliveryLng));

    console.log('🗺️ CREATE ORDER - ULEZ Check:', {
      deliveryLat,
      deliveryLng,
      isUlez: ulezCheck.isUlez,
      locality: ulezCheck.locality,
      administrativeArea: ulezCheck.administrativeArea,
      success: ulezCheck.success
    });

    // Calculate price using new pricing calculator
    const pricingInput = {
      deliveryType: bookingType as 'URGENT' | 'SAME_DAY_DELIVERY' | 'SCHEDULED',
      distanceInMiles,
      loadSize: packageSize as 'SMALL' | 'MEDIUM' | 'LARGE',
      dropPostcode: receiverPostalCode || '',
      dropAddress: deliveryAddress,
      dropLat: parseFloat(deliveryLat),
      dropLng: parseFloat(deliveryLng),
      isUlezZone: ulezCheck.isUlez, // Use accurate API result
      numberOfHelpers: numberOfHelpers || 0,
      pickupFloors: pickupFloors || 0,
      pickupHasLift: pickupHasLift !== undefined ? pickupHasLift : true,
      dropFloors: dropFloors || 0,
      dropHasLift: dropHasLift !== undefined ? dropHasLift : true,
      needsStorage: needsStorage || false,
      storageDays,
      includesInsurance: includesInsurance !== undefined ? includesInsurance : true
    };

    console.log('📊 CREATE ORDER - Pricing input:', JSON.stringify(pricingInput, null, 2));

    const priceBreakdown = calculateDeliveryPrice(pricingInput);

    console.log('📊 CREATE ORDER - Price breakdown result:', {
      total: priceBreakdown.total,
      subtotal: priceBreakdown.subtotal,
      mileageCharge: priceBreakdown.mileageCharge,
      loadVolumeCharge: priceBreakdown.loadVolumeCharge,
      helperCharge: priceBreakdown.helperCharge,
      stairCarryCharge: priceBreakdown.stairCarryCharge,
      storageCharge: priceBreakdown.storageCharge,
      ulezCharge: priceBreakdown.ulezCharge,
      insuranceCharge: priceBreakdown.insuranceCharge
    });

    // Generate OTPs for pickup and delivery
    const pickupOtp = generateOrderOTP();
    const deliveryOtp = generateOrderOTP();

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: req.user.id,
        pickupAddress,
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        deliveryAddress,
        deliveryLat: parseFloat(deliveryLat),
        deliveryLng: parseFloat(deliveryLng),
        packageSize,
        packageWeight: parseFloat(packageWeight),
        packageImages: packageImages || [],
        receiverName,
        receiverMobile,
        receiverAddressLine1,
        receiverAddressLine2,
        receiverPostalCode,
        specialInstructions,
        bookingType,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        scheduledTimeSlot,
        // Helper & Stair Details
        numberOfHelpers: numberOfHelpers || 0,
        pickupFloors: pickupFloors || 0,
        pickupHasLift: pickupHasLift !== undefined ? pickupHasLift : true,
        dropFloors: dropFloors || 0,
        dropHasLift: dropHasLift !== undefined ? dropHasLift : true,
        // Storage Details
        needsStorage: needsStorage || false,
        storageStartDate: storageStartDate ? new Date(storageStartDate) : null,
        storageEndDate: storageEndDate ? new Date(storageEndDate) : null,
        storageDays,
        // Insurance
        includesInsurance: includesInsurance !== undefined ? includesInsurance : true,
        // Distance & Pricing (in miles)
        distance: distanceInMiles,
        estimatedDuration: route.duration,
        estimatedPrice: priceBreakdown.total,
        finalPrice: priceBreakdown.total,
        // Price Breakdown
        mileageCharge: priceBreakdown.mileageCharge,
        loadVolumeCharge: priceBreakdown.loadVolumeCharge,
        ulezCharge: priceBreakdown.ulezCharge,
        stairCarryCharge: priceBreakdown.stairCarryCharge,
        helperCharge: priceBreakdown.helperCharge,
        storageCharge: priceBreakdown.storageCharge,
        insuranceCharge: priceBreakdown.insuranceCharge,
        isUlezZone: priceBreakdown.isUlezZone,
        // OTP & Status
        pickupOtp,
        deliveryOtp,
        status: 'SEARCHING_DRIVER'
      },
      include: {
        user: {
          select: { id: true, name: true, mobile: true }
        }
      }
    });

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'SEARCHING_DRIVER',
        changedBy: 'USER'
      }
    });

    // Broadcast to online drivers via WebSocket
    if ((req as any).io) {
      (req as any).io.to('online-drivers').emit('new-order-alert', {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          pickupAddress: order.pickupAddress,
          deliveryAddress: order.deliveryAddress,
          receiverName: order.receiverName,
          receiverMobile: order.receiverMobile,
          distance: order.distance,
          estimatedPrice: order.estimatedPrice,
          finalPrice: order.finalPrice,
          // Price breakdown
          mileageCharge: order.mileageCharge,
          loadVolumeCharge: order.loadVolumeCharge,
          ulezCharge: order.ulezCharge,
          stairCarryCharge: order.stairCarryCharge,
          helperCharge: order.helperCharge,
          storageCharge: order.storageCharge,
          insuranceCharge: order.insuranceCharge,
          isUlezZone: order.isUlezZone,
          packageSize: order.packageSize,
          bookingType: order.bookingType,
          status: order.status,
          createdAt: order.createdAt,
          user: order.user
        }
      });
      console.log(`📢 Broadcasting new order ${order.orderNumber} to online drivers`);
    }

    return sendSuccess(res, order, 'Order created successfully. Searching for drivers...', 201);

  } catch (error: any) {
    console.error('Create order error:', error);
    return sendError(res, error.message || 'Failed to create order', 500);
  }
};

/**
 * Get order by ID
 * GET /api/orders/:id
 */
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, mobile: true, profileImage: true }
        },
        driver: {
          select: { id: true, name: true, mobile: true, vehicleNumber: true, vehicleType: true, rating: true, profileImage: true }
        },
        statusHistory: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    // Check permissions
    if (req.user && req.user.role === 'USER' && order.userId !== req.user.id) {
      return sendError(res, 'Access denied', 403);
    }

    if (req.user && req.user.role === 'DRIVER' && order.driverId !== req.user.id) {
      return sendError(res, 'Access denied', 403);
    }

    return sendSuccess(res, order);

  } catch (error: any) {
    console.error('Get order error:', error);
    return sendError(res, error.message || 'Failed to get order', 500);
  }
};

/**
 * Get user's orders
 * GET /api/orders
 */
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401);
    }

    const { status, limit = '20', offset = '0' } = req.query;

    const where: any = {};

    if (req.user.role === 'USER') {
      where.userId = req.user.id;
    } else if (req.user.role === 'DRIVER') {
      where.driverId = req.user.id;
    }

    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, mobile: true }
        },
        driver: {
          select: { id: true, name: true, vehicleNumber: true, rating: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.order.count({ where });

    return sendSuccess(res, {
      orders,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });

  } catch (error: any) {
    console.error('Get orders error:', error);
    return sendError(res, error.message || 'Failed to get orders', 500);
  }
};

/**
 * Cancel order
 * PUT /api/orders/:id/cancel
 */
export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!req.user) {
      return sendError(res, 'Not authenticated', 401);
    }

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    // Check permissions
    if (req.user.role === 'USER' && order.userId !== req.user.id) {
      return sendError(res, 'Access denied', 403);
    }

    // Can't cancel if already delivered
    if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
      return sendError(res, `Cannot cancel order with status: ${order.status}`, 400);
    }

    // Update order
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: req.user.role,
        cancellationReason: reason || 'No reason provided'
      }
    });

    // Add status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status: 'CANCELLED',
        changedBy: req.user.role
      }
    });

    // Notify driver if assigned
    if (order.driverId && (req as any).io) {
      (req as any).io.to(`driver-${order.driverId}`).emit('order-cancelled', {
        orderId: order.id,
        orderNumber: order.orderNumber
      });
    }

    return sendSuccess(res, updated, 'Order cancelled successfully');

  } catch (error: any) {
    console.error('Cancel order error:', error);
    return sendError(res, error.message || 'Failed to cancel order', 500);
  }
};

export default {
  calculatePriceEstimate,
  createOrder,
  getOrderById,
  getUserOrders,
  cancelOrder
};
