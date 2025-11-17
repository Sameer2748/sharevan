import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/helpers';
import { uploadToS3 } from '../services/s3Service';

/**
 * Complete user onboarding
 * POST /api/user/complete-onboarding
 */
export const completeOnboarding = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'USER') {
      return sendError(res, 'Only users can complete onboarding', 403);
    }

    const { name, dateOfBirth, mobile, countryCode } = req.body;
    const file = req.file;

    if (!name || !dateOfBirth) {
      return sendError(res, 'Name and date of birth are required', 400);
    }

    let profileImageUrl = null;

    // Upload profile image to S3 if provided
    if (file) {
      try {
        const uploadResult = await uploadToS3(
          file.buffer,
          `users/${req.user.id}/profile`,
          file.originalname,
          file.mimetype
        );
        profileImageUrl = uploadResult.url;
      } catch (error) {
        console.error('Failed to upload profile image:', error);
        // Continue without image if upload fails
      }
    }

    // Build update data
    const updateData: any = {
      name,
      dateOfBirth: new Date(dateOfBirth),
      onboardingCompleted: true,
    };

    // Add mobile if provided (optional)
    if (mobile) {
      const fullMobile = countryCode ? `${countryCode}${mobile}` : mobile;

      // Check if mobile is already taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { mobile: fullMobile }
      });

      if (existingUser && existingUser.id !== req.user.id) {
        return sendError(res, 'Mobile number already registered', 400);
      }

      updateData.mobile = fullMobile;
    }

    // Add profile image if uploaded
    if (profileImageUrl) {
      updateData.profileImage = profileImageUrl;
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        profileImage: true,
        dateOfBirth: true,
        role: true,
        onboardingCompleted: true,
      },
    });

    return sendSuccess(res, updatedUser, 'Onboarding completed successfully');
  } catch (error: any) {
    console.error('Complete onboarding error:', error);
    return sendError(res, error.message || 'Failed to complete onboarding', 500);
  }
};

/**
 * Get user dashboard data
 * GET /api/user/dashboard
 */
export const getDashboard = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'USER') {
      return sendError(res, 'Only users can access dashboard', 403);
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, mobile: true, email: true, profileImage: true }
    });

    // Get active orders (for "Your Bookings" section)
    const activeOrdersList = await prisma.order.findMany({
      where: {
        userId: req.user.id,
        status: {
          in: ['SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'PICKED_UP', 'IN_TRANSIT', 'REACHED_DESTINATION']
        }
      },
      include: {
        driver: {
          select: { name: true, vehicleNumber: true, rating: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    // Get order statistics
    const [activeOrdersCount, completedOrders, totalSpent] = await Promise.all([
      prisma.order.count({
        where: {
          userId: req.user.id,
          status: {
            in: ['PENDING', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'PICKED_UP', 'IN_TRANSIT', 'REACHED_DESTINATION']
          }
        }
      }),
      prisma.order.count({
        where: {
          userId: req.user.id,
          status: 'DELIVERED'
        }
      }),
      prisma.order.aggregate({
        where: {
          userId: req.user.id,
          status: 'DELIVERED'
        },
        _sum: {
          finalPrice: true
        }
      })
    ]);

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        driver: {
          select: { name: true, vehicleNumber: true, rating: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Format active orders for display
    const formattedActiveOrders = activeOrdersList.map((order: any) => {
      // Extract city names from addresses (simple extraction)
      const pickupCity = order.pickupAddress?.split(',')[0] || 'Oxford';
      const deliveryCity = order.deliveryAddress?.split(',')[0] || 'Liverpool';
      
      // Calculate ETA based on status
      let eta = '10 Minutes';
      if (order.status === 'DRIVER_ASSIGNED' && order.estimatedDuration) {
        const minutes = Math.round(order.estimatedDuration / 60);
        eta = minutes > 0 ? `${minutes} Minutes` : '10 Minutes';
      } else if (order.status === 'DRIVER_ARRIVED') {
        eta = 'Arriving Now';
      } else if (order.status === 'PICKED_UP' || order.status === 'IN_TRANSIT') {
        eta = 'In Transit';
      } else if (order.status === 'REACHED_DESTINATION') {
        eta = 'Arrived';
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        pickupAddress: order.pickupAddress,
        deliveryAddress: order.deliveryAddress,
        pickupCity,
        deliveryCity,
        eta,
        driver: order.driver
      };
    });

    return sendSuccess(res, {
      user,
      stats: {
        activeOrders: activeOrdersCount,
        completedOrders,
        totalSpent: totalSpent._sum.finalPrice || 0
      },
      activeOrders: formattedActiveOrders,
      recentOrders
    });

  } catch (error: any) {
    console.error('Get dashboard error:', error);
    return sendError(res, error.message || 'Failed to get dashboard', 500);
  }
};

/**
 * Get user profile
 * GET /api/user/profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'USER') {
      return sendError(res, 'Only users can access profile', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        savedAddresses: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, user);

  } catch (error: any) {
    console.error('Get profile error:', error);
    return sendError(res, error.message || 'Failed to get profile', 500);
  }
};

/**
 * Update user profile
 * PUT /api/user/profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'USER') {
      return sendError(res, 'Only users can update profile', 403);
    }

    const { name, email, profileImage } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(profileImage && { profileImage })
      }
    });

    return sendSuccess(res, updatedUser, 'Profile updated successfully');

  } catch (error: any) {
    console.error('Update profile error:', error);
    return sendError(res, error.message || 'Failed to update profile', 500);
  }
};

/**
 * Get saved addresses
 * GET /api/user/addresses
 */
export const getSavedAddresses = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'USER') {
      return sendError(res, 'Only users can view addresses', 403);
    }

    const addresses = await prisma.savedAddress.findMany({
      where: { userId: req.user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return sendSuccess(res, { addresses });

  } catch (error: any) {
    console.error('Get addresses error:', error);
    return sendError(res, error.message || 'Failed to get addresses', 500);
  }
};

/**
 * Add saved address
 * POST /api/user/addresses
 */
export const addSavedAddress = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'USER') {
      return sendError(res, 'Only users can add addresses', 403);
    }

    const { label, address, lat, lng, landmark, isDefault } = req.body;

    if (!label || !address || !lat || !lng) {
      return sendError(res, 'Label, address, and coordinates are required');
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.savedAddress.updateMany({
        where: {
          userId: req.user.id,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    const savedAddress = await prisma.savedAddress.create({
      data: {
        userId: req.user.id,
        label,
        address,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        landmark,
        isDefault: isDefault || false
      }
    });

    return sendSuccess(res, savedAddress, 'Address saved successfully', 201);

  } catch (error: any) {
    console.error('Add address error:', error);
    return sendError(res, error.message || 'Failed to add address', 500);
  }
};

/**
 * Update saved address
 * PUT /api/user/addresses/:id
 */
export const updateSavedAddress = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'USER') {
      return sendError(res, 'Only users can update addresses', 403);
    }

    const { id } = req.params;
    const { label, address, lat, lng, landmark, isDefault } = req.body;

    // Verify ownership
    const existing = await prisma.savedAddress.findUnique({
      where: { id }
    });

    if (!existing || existing.userId !== req.user.id) {
      return sendError(res, 'Address not found', 404);
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.savedAddress.updateMany({
        where: {
          userId: req.user.id,
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      });
    }

    const updated = await prisma.savedAddress.update({
      where: { id },
      data: {
        ...(label && { label }),
        ...(address && { address }),
        ...(lat && { lat: parseFloat(lat) }),
        ...(lng && { lng: parseFloat(lng) }),
        ...(landmark !== undefined && { landmark }),
        ...(isDefault !== undefined && { isDefault })
      }
    });

    return sendSuccess(res, updated, 'Address updated successfully');

  } catch (error: any) {
    console.error('Update address error:', error);
    return sendError(res, error.message || 'Failed to update address', 500);
  }
};

/**
 * Delete saved address
 * DELETE /api/user/addresses/:id
 */
export const deleteSavedAddress = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'USER') {
      return sendError(res, 'Only users can delete addresses', 403);
    }

    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.savedAddress.findUnique({
      where: { id }
    });

    if (!existing || existing.userId !== req.user.id) {
      return sendError(res, 'Address not found', 404);
    }

    await prisma.savedAddress.delete({
      where: { id }
    });

    return sendSuccess(res, null, 'Address deleted successfully');

  } catch (error: any) {
    console.error('Delete address error:', error);
    return sendError(res, error.message || 'Failed to delete address', 500);
  }
};

/**
 * Rate driver after delivery
 * POST /api/user/orders/:id/rate
 */
export const rateDriver = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'USER') {
      return sendError(res, 'Only users can rate drivers', 403);
    }

    const { id: orderId } = req.params;
    const { rating, comment, isAnonymous } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return sendError(res, 'Rating must be between 1 and 5');
    }

    // Verify order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        review: true,
        driver: true
      }
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    if (order.userId !== req.user.id) {
      return sendError(res, 'You can only rate your own orders', 403);
    }

    if (order.status !== 'DELIVERED') {
      return sendError(res, 'Order must be delivered before rating', 400);
    }

    if (order.review) {
      return sendError(res, 'Order already rated', 400);
    }

    if (!order.driverId) {
      return sendError(res, 'No driver assigned to this order', 400);
    }

    // Create review and update driver rating in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create review
      const review = await tx.review.create({
        data: {
          orderId,
          driverId: order.driverId!,
          rating,
          comment,
          isAnonymous: isAnonymous || false
        }
      });

      // Update driver rating
      const driver = order.driver!;
      const newTotalRatings = driver.totalRatings + 1;
      const newRating = ((driver.rating * driver.totalRatings) + rating) / newTotalRatings;

      await tx.driver.update({
        where: { id: order.driverId! },
        data: {
          rating: newRating,
          totalRatings: newTotalRatings
        }
      });

      return review;
    });

    return sendSuccess(res, result, 'Thank you for your feedback!');

  } catch (error: any) {
    console.error('Rate driver error:', error);
    return sendError(res, error.message || 'Failed to rate driver', 500);
  }
};

export default {
  completeOnboarding,
  getDashboard,
  getProfile,
  updateProfile,
  getSavedAddresses,
  addSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  rateDriver
};
