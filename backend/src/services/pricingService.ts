import { PackageSize, BookingType } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/database';

/**
 * Price calculation breakdown
 */
export interface PriceBreakdown {
  baseFare: number;
  distanceFare: number;
  sizeMultiplier: number;
  urgentMultiplier: number;
  subtotal: number;
  total: number;
  distance: number;
}

/**
 * Get current price configuration
 * Falls back to environment variables if no active config in database
 */
const getPriceConfig = async () => {
  try {
    const config = await prisma.priceConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (config) {
      return config;
    }
  } catch (error) {
    console.warn('Could not fetch price config from database, using env defaults');
  }

  // Return defaults from environment
  return {
    baseFare: env.BASE_FARE,
    pricePerKm: env.PRICE_PER_KM,
    minDistanceKm: env.MIN_DISTANCE_KM,
    smallSizeMultiplier: 1.0,
    mediumSizeMultiplier: 1.3,
    largeSizeMultiplier: 1.6,
    urgentMultiplier: env.URGENT_MULTIPLIER,
    driverEarningPercent: env.DRIVER_EARNING_PERCENTAGE,
  };
};

/**
 * Get size multiplier based on package size
 */
const getSizeMultiplier = (packageSize: PackageSize, config: any): number => {
  switch (packageSize) {
    case 'SMALL':
      return config.smallSizeMultiplier;
    case 'MEDIUM':
      return config.mediumSizeMultiplier;
    case 'LARGE':
      return config.largeSizeMultiplier;
    default:
      return 1.0;
  }
};

/**
 * Calculate delivery price
 * @param distance - Distance in kilometers
 * @param packageSize - Package size (SMALL, MEDIUM, LARGE)
 * @param bookingType - URGENT or SCHEDULED
 * @returns Price breakdown
 */
export const calculatePrice = async (
  distance: number,
  packageSize: PackageSize,
  bookingType: BookingType
): Promise<PriceBreakdown> => {
  const config = await getPriceConfig();

  // Use minimum distance if distance is less
  const chargeableDistance = Math.max(distance, config.minDistanceKm);

  // Calculate base components
  const baseFare = config.baseFare;
  const distanceFare = chargeableDistance * config.pricePerKm;

  // Get multipliers
  const sizeMultiplier = getSizeMultiplier(packageSize, config);
  const urgentMultiplier = bookingType === 'URGENT' ? config.urgentMultiplier : 1.0;

  // Calculate total
  const subtotal = (baseFare + distanceFare) * sizeMultiplier;
  const total = Math.round(subtotal * urgentMultiplier);

  return {
    baseFare,
    distanceFare: Math.round(distanceFare),
    sizeMultiplier,
    urgentMultiplier,
    subtotal: Math.round(subtotal),
    total,
    distance: chargeableDistance,
  };
};

/**
 * Calculate driver earnings from order price
 * Platform takes commission, driver gets the rest
 */
export const calculateDriverEarnings = async (orderPrice: number): Promise<{
  grossAmount: number;
  commission: number;
  netEarning: number;
  percentage: number;
}> => {
  const config = await getPriceConfig();
  const percentage = config.driverEarningPercent;

  const netEarning = Math.round(orderPrice * percentage);
  const commission = orderPrice - netEarning;

  return {
    grossAmount: orderPrice,
    commission,
    netEarning,
    percentage,
  };
};

/**
 * Estimate delivery time based on distance
 * Assumes average speed of 25 km/h in city traffic
 */
export const estimateDeliveryTime = (distance: number): number => {
  const AVERAGE_SPEED_KMH = 25;
  const PICKUP_TIME_MINUTES = 5; // Time to find and pickup package
  const DROPOFF_TIME_MINUTES = 5; // Time to deliver package

  const travelTimeMinutes = (distance / AVERAGE_SPEED_KMH) * 60;
  const totalMinutes = Math.ceil(
    travelTimeMinutes + PICKUP_TIME_MINUTES + DROPOFF_TIME_MINUTES
  );

  return totalMinutes;
};

/**
 * Get price estimate for display (before order creation)
 */
export const getPriceEstimate = async (
  distance: number,
  packageSize: PackageSize,
  bookingType: BookingType
): Promise<{
  priceBreakdown: PriceBreakdown;
  estimatedDuration: number;
  driverEarning: number;
}> => {
  const priceBreakdown = await calculatePrice(distance, packageSize, bookingType);
  const estimatedDuration = estimateDeliveryTime(distance);
  const earnings = await calculateDriverEarnings(priceBreakdown.total);

  return {
    priceBreakdown,
    estimatedDuration,
    driverEarning: earnings.netEarning,
  };
};

export default {
  calculatePrice,
  calculateDriverEarnings,
  estimateDeliveryTime,
  getPriceEstimate,
};
