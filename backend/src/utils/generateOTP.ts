import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Generate a random OTP of specified length
 * @param length - Length of OTP (default from env)
 * @returns OTP string
 */
export const generateOTP = (length: number = env.OTP_LENGTH): string => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max).toString();
};

/**
 * Generate a secure random token
 * @param bytes - Number of bytes (default 32)
 * @returns Hex string token
 */
export const generateToken = (bytes: number = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

export default { generateOTP, generateToken };
