import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { sendError } from '../utils/helpers';

/**
 * Middleware to check validation results
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.type === 'field' ? (err as any).path : 'unknown',
      message: err.msg
    }));

    return sendError(res, 'Validation failed', 400, formattedErrors);
  }

  next();
};

/**
 * Auth validation rules
 */
export const authValidation = {
  sendOTP: [
    body('mobile')
      .notEmpty().withMessage('Mobile number is required')
      .matches(/^[\+]?[0-9]{10,15}$/).withMessage('Invalid mobile number format'),
    body('role')
      .notEmpty().withMessage('Role is required')
      .isIn(['USER', 'DRIVER']).withMessage('Role must be USER or DRIVER'),
    validate
  ],

  verifyOTP: [
    body('mobile')
      .notEmpty().withMessage('Mobile number is required')
      .matches(/^[\+]?[0-9]{10,15}$/).withMessage('Invalid mobile number format'),
    body('otp')
      .notEmpty().withMessage('OTP is required')
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('role')
      .notEmpty().withMessage('Role is required')
      .isIn(['USER', 'DRIVER']).withMessage('Role must be USER or DRIVER'),
    validate
  ]
};

/**
 * Order validation rules
 */
export const orderValidation = {
  calculatePrice: [
    body('pickupLat').notEmpty().isFloat().withMessage('Valid pickup latitude required'),
    body('pickupLng').notEmpty().isFloat().withMessage('Valid pickup longitude required'),
    body('deliveryLat').notEmpty().isFloat().withMessage('Valid delivery latitude required'),
    body('deliveryLng').notEmpty().isFloat().withMessage('Valid delivery longitude required'),
    body('packageSize').isIn(['SMALL', 'MEDIUM', 'LARGE']).withMessage('Invalid package size'),
    body('bookingType').isIn(['URGENT', 'SCHEDULED']).withMessage('Invalid booking type'),
    validate
  ],

  createOrder: [
    body('pickupAddress').notEmpty().withMessage('Pickup address is required'),
    body('pickupLat').notEmpty().isFloat().withMessage('Valid pickup latitude required'),
    body('pickupLng').notEmpty().isFloat().withMessage('Valid pickup longitude required'),
    body('deliveryAddress').notEmpty().withMessage('Delivery address is required'),
    body('deliveryLat').notEmpty().isFloat().withMessage('Valid delivery latitude required'),
    body('deliveryLng').notEmpty().isFloat().withMessage('Valid delivery longitude required'),
    body('packageSize').isIn(['SMALL', 'MEDIUM', 'LARGE']).withMessage('Invalid package size'),
    body('packageWeight').notEmpty().isFloat({ min: 0.1 }).withMessage('Valid package weight required'),
    body('receiverName').notEmpty().withMessage('Receiver name is required'),
    body('receiverMobile').notEmpty().matches(/^[\+]?[0-9]{10,15}$/).withMessage('Valid receiver mobile required'),
    body('bookingType').isIn(['URGENT', 'SCHEDULED']).withMessage('Invalid booking type'),
    validate
  ]
};

/**
 * Driver validation rules
 */
export const driverValidation = {
  onlineStatus: [
    body('isOnline').isBoolean().withMessage('isOnline must be a boolean'),
    validate
  ],

  updateStatus: [
    body('status').isIn(['DRIVER_ARRIVED', 'IN_TRANSIT', 'REACHED_DESTINATION'])
      .withMessage('Invalid status'),
    validate
  ],

  verifyOTP: [
    body('otp').notEmpty().isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit OTP required'),
    validate
  ]
};

/**
 * User validation rules
 */
export const userValidation = {
  updateProfile: [
    body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    validate
  ],

  addAddress: [
    body('label').notEmpty().withMessage('Label is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('lat').notEmpty().isFloat().withMessage('Valid latitude required'),
    body('lng').notEmpty().isFloat().withMessage('Valid longitude required'),
    validate
  ],

  rateDriver: [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString(),
    validate
  ]
};

export default {
  validate,
  authValidation,
  orderValidation,
  driverValidation,
  userValidation
};
