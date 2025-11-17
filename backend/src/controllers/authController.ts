import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { sendOTPToMobile, sendOTPToEmail, verifyOTP, verifyEmailOTP } from '../services/otpService';
import { sendSuccess, sendError, formatPhoneNumber, isValidPhoneNumber } from '../utils/helpers';

/**
 * Send OTP to mobile number
 * POST /api/auth/send-otp
 */
export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { mobile, role } = req.body;

    // Validate mobile
    if (!mobile || !isValidPhoneNumber(mobile)) {
      return sendError(res, 'Invalid mobile number');
    }

    if (!role || !['USER', 'DRIVER'].includes(role)) {
      return sendError(res, 'Invalid role. Must be USER or DRIVER');
    }

    const formattedMobile = formatPhoneNumber(mobile);

    // Check if user/driver exists
    let userId: string | undefined;
    let driverId: string | undefined;

    if (role === 'USER') {
      let user = await prisma.user.findUnique({ where: { mobile: formattedMobile } });
      if (!user) {
        // Auto-create user on first login
        user = await prisma.user.create({
          data: { mobile: formattedMobile, role: 'USER' }
        });
      }
      userId = user.id;
    } else {
      const driver = await prisma.driver.findUnique({ where: { mobile: formattedMobile } });
      if (!driver) {
        return sendError(res, 'Driver account not found. Please register first.', 404);
      }
      driverId = driver.id;
    }

    // Send OTP
    const result = await sendOTPToMobile(formattedMobile, userId, driverId);

    if (!result.success) {
      return sendError(res, result.message);
    }

    return sendSuccess(res, {
      mobile: formattedMobile,
      ...(env.NODE_ENV === 'development' && { otp: result.otp })
    }, 'OTP sent successfully');

  } catch (error: any) {
    console.error('Send OTP error:', error);
    return sendError(res, error.message || 'Failed to send OTP', 500);
  }
};

/**
 * Verify OTP and login
 * POST /api/auth/verify-otp
 */
export const verifyOTPAndLogin = async (req: Request, res: Response) => {
  try {
    const { mobile, otp, role } = req.body;

    if (!mobile || !otp || !role) {
      return sendError(res, 'Mobile, OTP, and role are required');
    }

    const formattedMobile = formatPhoneNumber(mobile);

    // Verify OTP
    const verification = await verifyOTP(formattedMobile, otp);

    if (!verification.success) {
      return sendError(res, verification.message, 401);
    }

    // Get user/driver
    let user: any;
    let tokenRole: string;

    if (role === 'USER') {
      user = await prisma.user.findUnique({
        where: { mobile: formattedMobile },
        select: { id: true, mobile: true, name: true, email: true, role: true, profileImage: true }
      });
      tokenRole = 'USER';
    } else {
      user = await prisma.driver.findUnique({
        where: { mobile: formattedMobile },
        select: {
          id: true,
          mobile: true,
          name: true,
          email: true,
          profileImage: true,
          status: true,
          vehicleType: true,
          vehicleNumber: true,
          rating: true,
          isOnline: true
        }
      });
      tokenRole = 'DRIVER';
    }

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, mobile: user.mobile, role: tokenRole },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return sendSuccess(res, {
      token,
      user: { ...user, role: tokenRole }
    }, 'Login successful');

  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return sendError(res, error.message || 'Failed to verify OTP', 500);
  }
};

/**
 * Send OTP to email
 * POST /api/auth/send-email-otp
 */
export const sendEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendError(res, 'Invalid email address');
    }

    if (!role || !['USER', 'DRIVER'].includes(role)) {
      return sendError(res, 'Invalid role. Must be USER or DRIVER');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user/driver exists, create if not
    let userId: string | undefined;
    let driverId: string | undefined;

    if (role === 'USER') {
      let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) {
        // Auto-create user on first login
        user = await prisma.user.create({
          data: { email: normalizedEmail, role: 'USER', onboardingCompleted: false }
        });
      }
      userId = user.id;
    } else {
      let driver = await prisma.driver.findUnique({ where: { email: normalizedEmail } });
      if (!driver) {
        // Auto-create driver on first login (vehicle info collected during onboarding)
        driver = await prisma.driver.create({
          data: {
            email: normalizedEmail,
            onboardingCompleted: false,
          }
        });
      }
      driverId = driver.id;
    }

    // Send OTP to email
    const result = await sendOTPToEmail(normalizedEmail, userId, driverId);

    if (!result.success) {
      return sendError(res, result.message);
    }

    return sendSuccess(res, {
      email: normalizedEmail
    }, 'OTP sent to your email');

  } catch (error: any) {
    console.error('Send email OTP error:', error);
    return sendError(res, error.message || 'Failed to send OTP', 500);
  }
};

/**
 * Verify email OTP and login
 * POST /api/auth/verify-email-otp
 */
export const verifyEmailOTPAndLogin = async (req: Request, res: Response) => {
  try {
    const { email, otp, role } = req.body;

    if (!email || !otp || !role) {
      return sendError(res, 'Email, OTP, and role are required');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP
    const verification = await verifyEmailOTP(normalizedEmail, otp);

    if (!verification.success) {
      return sendError(res, verification.message, 401);
    }

    // Get user/driver
    let user: any;
    let tokenRole: string;

    if (role === 'USER') {
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          mobile: true,
          name: true,
          role: true,
          profileImage: true,
          dateOfBirth: true,
          onboardingCompleted: true
        }
      });
      tokenRole = 'USER';
    } else {
      user = await prisma.driver.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          mobile: true,
          name: true,
          profileImage: true,
          dateOfBirth: true,
          status: true,
          vehicleType: true,
          vehicleNumber: true,
          rating: true,
          isOnline: true,
          onboardingCompleted: true
        }
      });
      tokenRole = 'DRIVER';
    }

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: tokenRole },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return sendSuccess(res, {
      token,
      user: { ...user, role: tokenRole }
    }, 'Login successful');

  } catch (error: any) {
    console.error('Verify email OTP error:', error);
    return sendError(res, error.message || 'Failed to verify OTP', 500);
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401);
    }

    const { id, role } = req.user;

    let user: any;

    if (role === 'USER') {
      user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          mobile: true,
          name: true,
          email: true,
          profileImage: true,
          role: true,
          createdAt: true
        }
      });
    } else {
      user = await prisma.driver.findUnique({
        where: { id },
        select: {
          id: true,
          mobile: true,
          name: true,
          email: true,
          profileImage: true,
          status: true,
          rating: true,
          totalEarnings: true,
          vehicleType: true,
          vehicleNumber: true,
          isOnline: true,
          totalOrders: true
        }
      });
    }

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, { ...user, role });

  } catch (error: any) {
    console.error('Get current user error:', error);
    return sendError(res, error.message || 'Failed to get user', 500);
  }
};

/**
 * Logout (client-side token removal, but good to have endpoint)
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response) => {
  try {
    // In a more complex system, you might invalidate the token here
    // For JWT, we typically just let the client remove it
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error: any) {
    console.error('Logout error:', error);
    return sendError(res, error.message || 'Failed to logout', 500);
  }
};

/**
 * Register new driver
 * POST /api/auth/register-driver
 */
export const registerDriver = async (req: Request, res: Response) => {
  try {
    const {
      mobile,
      name,
      email,
      vehicleType,
      vehicleNumber,
      vehicleModel,
      vehicleColor,
      licenseNumber,
      licenseImage,
      vehicleRegImage,
      aadharNumber,
      aadharImage,
      panNumber,
      panImage
    } = req.body;

    // Validate required fields
    if (!mobile || !name || !vehicleType || !vehicleNumber || !licenseNumber) {
      return sendError(res, 'Missing required fields: mobile, name, vehicleType, vehicleNumber, licenseNumber');
    }

    if (!licenseImage || !vehicleRegImage || !aadharImage) {
      return sendError(res, 'Missing required documents: license, vehicle registration, and aadhar images');
    }

    const formattedMobile = formatPhoneNumber(mobile);

    // Check if driver already exists
    const existingDriver = await prisma.driver.findUnique({
      where: { mobile: formattedMobile }
    });

    if (existingDriver) {
      return sendError(res, 'Driver with this mobile number already exists', 400);
    }

    // Check if license number already exists
    const existingLicense = await prisma.driver.findUnique({
      where: { licenseNumber }
    });

    if (existingLicense) {
      return sendError(res, 'This license number is already registered', 400);
    }

    // Check if vehicle number already exists
    const existingVehicle = await prisma.driver.findUnique({
      where: { vehicleNumber: vehicleNumber.toUpperCase() }
    });

    if (existingVehicle) {
      return sendError(res, 'This vehicle number is already registered', 400);
    }

    // Create driver
    const driver = await prisma.driver.create({
      data: {
        mobile: formattedMobile,
        name,
        email: email || undefined,
        vehicleType,
        vehicleNumber: vehicleNumber.toUpperCase(),
        vehicleModel: vehicleModel || undefined,
        vehicleColor: vehicleColor || undefined,
        licenseNumber,
        licenseImage,
        vehicleRegImage,
        aadharNumber: aadharNumber || undefined,
        aadharImage,
        panNumber: panNumber || undefined,
        panImage: panImage || undefined,
        status: 'PENDING_VERIFICATION'
      }
    });

    return sendSuccess(res, {
      id: driver.id,
      mobile: driver.mobile,
      name: driver.name,
      status: driver.status
    }, 'Driver registration submitted successfully. Wait for admin verification.', 201);

  } catch (error: any) {
    console.error('Driver registration error:', error);
    return sendError(res, error.message || 'Failed to register driver', 500);
  }
};

/**
 * Update user profile (complete profile for first-time users)
 * PUT /api/auth/update-profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401);
    }

    const { id, role } = req.user;
    const { name, email, profileImage } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, 'Name is required');
    }

    let updatedUser: any;

    if (role === 'USER') {
      updatedUser = await prisma.user.update({
        where: { id },
        data: {
          name: name.trim(),
          email: email || undefined,
          profileImage: profileImage || undefined
        },
        select: {
          id: true,
          mobile: true,
          name: true,
          email: true,
          profileImage: true,
          role: true
        }
      });
    } else {
      updatedUser = await prisma.driver.update({
        where: { id },
        data: {
          name: name.trim(),
          email: email || undefined,
          profileImage: profileImage || undefined
        },
        select: {
          id: true,
          mobile: true,
          name: true,
          email: true,
          profileImage: true,
          status: true,
          rating: true
        }
      });
    }

    return sendSuccess(res, { ...updatedUser, role }, 'Profile updated successfully');

  } catch (error: any) {
    console.error('Update profile error:', error);
    return sendError(res, error.message || 'Failed to update profile', 500);
  }
};

export default {
  sendOTP,
  sendEmailOTP,
  verifyOTPAndLogin,
  verifyEmailOTPAndLogin,
  getCurrentUser,
  logout,
  registerDriver,
  updateProfile
};
