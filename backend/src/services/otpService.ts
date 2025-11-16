import { prisma } from '../config/database';
import { env } from '../config/env';
import { generateOTP } from '../utils/generateOTP';
import { sendSMS } from './smsService';

/**
 * Generate and send OTP to mobile number
 */
export const sendOTPToMobile = async (
  mobile: string,
  userId?: string,
  driverId?: string
): Promise<{ success: boolean; message: string; otp?: string }> => {
  try {
    // Generate OTP
    const otp = generateOTP();

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + env.OTP_EXPIRY_MINUTES);

    // Store OTP in database
    await prisma.oTPAttempt.create({
      data: {
        mobile,
        otp,
        expiresAt,
        userId,
        driverId,
      },
    });

    // Send SMS
    const smsResult = await sendSMS(
      mobile,
      `Your Sharevan verification code is: ${otp}. Valid for ${env.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`
    );

    if (!smsResult.success) {
      console.error('Failed to send OTP SMS:', smsResult.error);
      // Still return success since OTP is stored, useful for development
    }

    // In development, return OTP for testing
    if (env.NODE_ENV === 'development') {
      console.log(`📱 OTP for ${mobile}: ${otp}`);
      return {
        success: true,
        message: 'OTP sent successfully',
        otp, // Only in development
      };
    }

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP',
    };
  }
};

/**
 * Verify OTP for mobile number
 */
export const verifyOTP = async (
  mobile: string,
  otp: string
): Promise<{ success: boolean; message: string; userId?: string; driverId?: string }> => {
  try {
    // Find the most recent unverified OTP for this mobile
    const otpRecord = await prisma.oTPAttempt.findFirst({
      where: {
        mobile,
        verified: false,
        expiresAt: {
          gte: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      return {
        success: false,
        message: 'Invalid or expired OTP',
      };
    }

    // Check attempt limit
    if (otpRecord.attempts >= env.MAX_OTP_ATTEMPTS) {
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.',
      };
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      await prisma.oTPAttempt.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });

      return {
        success: false,
        message: `Invalid OTP. ${env.MAX_OTP_ATTEMPTS - otpRecord.attempts - 1} attempts remaining.`,
      };
    }

    // Mark as verified
    await prisma.oTPAttempt.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    return {
      success: true,
      message: 'OTP verified successfully',
      userId: otpRecord.userId || undefined,
      driverId: otpRecord.driverId || undefined,
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      message: 'Failed to verify OTP',
    };
  }
};

/**
 * Clean up expired OTPs (can be run as a cron job)
 */
export const cleanupExpiredOTPs = async (): Promise<number> => {
  try {
    const result = await prisma.oTPAttempt.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`🧹 Cleaned up ${result.count} expired OTPs`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up OTPs:', error);
    return 0;
  }
};

/**
 * Generate pickup/delivery OTP for order
 */
export const generateOrderOTP = (): string => {
  return generateOTP(6); // 6-digit OTP for orders
};

export default {
  sendOTPToMobile,
  verifyOTP,
  cleanupExpiredOTPs,
  generateOrderOTP,
};
