import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvConfig {
  // Server
  PORT: number;
  NODE_ENV: string;
  FRONTEND_URL: string;

  // Database
  DATABASE_URL: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // Google Maps
  GOOGLE_MAPS_API_KEY: string;

  // SMS
  SMS_PROVIDER: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;

  // Cloudinary
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;

  // Pricing
  BASE_FARE: number;
  PRICE_PER_KM: number;
  MIN_DISTANCE_KM: number;
  URGENT_MULTIPLIER: number;
  DRIVER_EARNING_PERCENTAGE: number;

  // OTP
  OTP_EXPIRY_MINUTES: number;
  OTP_LENGTH: number;
  MAX_OTP_ATTEMPTS: number;
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? Number(value) : defaultValue;
};

export const env: EnvConfig = {
  // Server
  PORT: getEnvNumber('PORT', 5000),
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:3000'),

  // Database
  DATABASE_URL: getEnv('DATABASE_URL'),

  // JWT
  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),

  // Google Maps
  GOOGLE_MAPS_API_KEY: getEnv('GOOGLE_MAPS_API_KEY', ''),

  // SMS
  SMS_PROVIDER: getEnv('SMS_PROVIDER', 'console'), // console, twilio, msg91
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Pricing
  BASE_FARE: getEnvNumber('BASE_FARE', 30),
  PRICE_PER_KM: getEnvNumber('PRICE_PER_KM', 10),
  MIN_DISTANCE_KM: getEnvNumber('MIN_DISTANCE_KM', 2),
  URGENT_MULTIPLIER: getEnvNumber('URGENT_MULTIPLIER', 1.5),
  DRIVER_EARNING_PERCENTAGE: getEnvNumber('DRIVER_EARNING_PERCENTAGE', 0.75),

  // OTP
  OTP_EXPIRY_MINUTES: getEnvNumber('OTP_EXPIRY_MINUTES', 5),
  OTP_LENGTH: getEnvNumber('OTP_LENGTH', 6),
  MAX_OTP_ATTEMPTS: getEnvNumber('MAX_OTP_ATTEMPTS', 3),
};

export default env;
