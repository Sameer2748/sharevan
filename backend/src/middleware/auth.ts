import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { sendError } from '../utils/helpers';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        mobile: string;
      };
    }
  }
}

/**
 * Verify JWT token middleware
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return sendError(res, 'Access token required', 401);
    }

    // Verify token
    jwt.verify(token, env.JWT_SECRET, (err, decoded: any) => {
      if (err) {
        return sendError(res, 'Invalid or expired token', 403);
      }

      // Attach user to request
      req.user = {
        id: decoded.id,
        role: decoded.role,
        mobile: decoded.mobile,
      };

      next();
    });
  } catch (error) {
    return sendError(res, 'Authentication failed', 401);
  }
};

/**
 * Check if user has specific role
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Insufficient permissions', 403);
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    jwt.verify(token, env.JWT_SECRET, (err, decoded: any) => {
      if (!err && decoded) {
        req.user = {
          id: decoded.id,
          role: decoded.role,
          mobile: decoded.mobile,
        };
      }
      next();
    });
  } catch (error) {
    next();
  }
};

export default {
  authenticateToken,
  requireRole,
  optionalAuth,
};
