import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { sendSuccess, sendError } from '../utils/helpers';

/**
 * Admin login with hardcoded email and password
 * POST /api/admin/auth/login
 */
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Debug logging (remove in production)
    console.log('Admin login attempt:', {
      providedEmail: normalizedEmail,
      expectedEmail: env.ADMIN_EMAIL,
      providedPassword: password ? '***' : 'empty',
      expectedPassword: env.ADMIN_PASSWORD ? '***' : 'empty',
    });

    // Check hardcoded admin credentials
    if (normalizedEmail !== env.ADMIN_EMAIL || password !== env.ADMIN_PASSWORD) {
      console.log('Login failed: Credentials mismatch');
      return sendError(res, 'Invalid email or password', 401);
    }

    // Generate JWT token with fixed admin ID
    const adminId = 'admin-' + env.ADMIN_EMAIL.replace(/[^a-z0-9]/g, '');
    const token = jwt.sign(
      { 
        id: adminId, 
        email: env.ADMIN_EMAIL, 
        role: 'ADMIN' 
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return sendSuccess(res, {
      token,
      user: {
        id: adminId,
        email: env.ADMIN_EMAIL,
        name: 'Admin',
        role: 'ADMIN',
      },
    }, 'Login successful');

  } catch (error: any) {
    console.error('Admin login error:', error);
    return sendError(res, error.message || 'Failed to login', 500);
  }
};

/**
 * Get current admin user
 * GET /api/admin/auth/me
 */
export const getAdminProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user || user.role !== 'ADMIN') {
      return sendError(res, 'Admin not authenticated', 401);
    }

    // Return hardcoded admin profile
    const adminProfile = {
      id: user.id,
      email: env.ADMIN_EMAIL,
      name: 'Admin',
      role: 'ADMIN',
      createdAt: new Date().toISOString(),
    };

    return sendSuccess(res, adminProfile, 'Admin profile retrieved successfully');

  } catch (error: any) {
    console.error('Get admin profile error:', error);
    return sendError(res, error.message || 'Failed to get admin profile', 500);
  }
};

