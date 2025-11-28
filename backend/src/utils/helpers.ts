import { Response } from 'express';

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
}

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 400,
  errors?: any[]
): Response => {
  const response: ApiResponse = {
    success: false,
    error,
    errors,
  };
  return res.status(statusCode).json(response);
};

/**
 * Format phone number to E.164 format
 * Assumes Indian numbers if no country code
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 91, already has country code
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  // If 10 digits, add Indian country code
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  // If already has +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }

  return `+${cleaned}`;
};

/**
 * Validate phone number (basic check)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Mask phone number for display
 * Example: +919876543210 -> +91-XXX-XXX-3210
 */
export const maskPhoneNumber = (phone: string): string => {
  if (phone.length < 10) return phone;
  const visiblePart = phone.slice(-4);
  const countryCode = phone.slice(0, phone.length - 10);
  return `${countryCode}-XXX-XXX-${visiblePart}`;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Generate order number
 * Format: SV + YYMMDD + 6-digit random
 * Example: SV240115ABC123
 */
export const generateOrderNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `SV${year}${month}${day}${random}`;
};

/**
 * Delay/sleep function
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Check if date is in the past
 */
export const isPastDate = (date: Date): boolean => {
  return date < new Date();
};

/**
 * Format currency (British Pounds)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default {
  sendSuccess,
  sendError,
  formatPhoneNumber,
  isValidPhoneNumber,
  maskPhoneNumber,
  calculateDistance,
  generateOrderNumber,
  sleep,
  isPastDate,
  formatCurrency,
};
