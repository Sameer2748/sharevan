/**
 * Pricing Calculator for ShareVan Delivery System
 *
 * Based on client specification:
 * - Delivery types with different mileage rates
 * - Minimum distance charge of £50
 * - Load volume surcharges
 * - ULEZ surcharge for London zones
 * - Stair carry surcharges
 * - Helper surcharges based on distance
 * - Short-term storage charges
 * - Insurance flat charge
 */

export interface PricingInput {
  // Delivery details
  deliveryType: 'URGENT' | 'SAME_DAY_DELIVERY' | 'SCHEDULED';
  distanceInMiles: number;

  // Package details
  loadSize: 'SMALL' | 'MEDIUM' | 'LARGE';

  // Location details (for fallback ULEZ check)
  dropPostcode?: string;
  dropAddress?: string;

  // Coordinates for accurate ULEZ check
  dropLat?: number;
  dropLng?: number;

  // ULEZ override (if already checked via API)
  isUlezZone?: boolean;

  // Helper & stair details
  numberOfHelpers?: number;
  pickupFloors?: number;
  pickupHasLift?: boolean;
  dropFloors?: number;
  dropHasLift?: boolean;

  // Storage details
  needsStorage?: boolean;
  storageDays?: number;

  // Insurance
  includesInsurance?: boolean;
}

export interface PriceBreakdown {
  // Individual charges
  mileageCharge: number;
  loadVolumeCharge: number;
  ulezCharge: number;
  stairCarryCharge: number;
  helperCharge: number;
  storageCharge: number;
  insuranceCharge: number;

  // Metadata
  distanceInMiles: number;
  isUlezZone: boolean;

  // Total
  subtotal: number;
  total: number; // Rounded to nearest pound
}

// Pricing constants based on client specification
const PRICING = {
  // Mileage rates per mile
  MILEAGE_RATES: {
    URGENT: 2.0,
    SAME_DAY_DELIVERY: 1.7,
    SCHEDULED: 1.6,
  },

  // Minimum charge
  MINIMUM_CHARGE: 50,

  // Load volume surcharges
  LOAD_SURCHARGES: {
    SMALL: 20,
    MEDIUM: 35,
    LARGE: 50,
  },

  // ULEZ surcharge
  ULEZ_SURCHARGE: 25,

  // Stair carry per floor per helper
  STAIR_CARRY_PER_FLOOR_PER_HELPER: 15,

  // Helper charges based on distance
  HELPER_CHARGES: {
    UP_TO_70_MILES: 40,
    UP_TO_140_MILES: 80,
    UP_TO_210_MILES: 120,
    OVER_210_MILES: 120, // Same as 210 miles
  },

  // Storage charges per day based on load size
  STORAGE_CHARGES_PER_DAY: {
    SMALL: 5,  // 2m × 2m
    MEDIUM: 7, // 3m × 3m
    LARGE: 10, // 5m × 5m
  },

  // Insurance flat charge
  INSURANCE_CHARGE: 30,

  // Maximum storage days
  MAX_STORAGE_DAYS: 7,
};

/**
 * Check if a postcode is in a ULEZ zone (London)
 *
 * ULEZ zones cover most of Greater London
 * This is a simplified check - in production, use a proper API or geofencing service
 */
function isUlezZone(postcode: string, address: string): boolean {
  if (!postcode && !address) return false;

  // Convert to uppercase and remove spaces
  const cleanPostcode = postcode?.toUpperCase().replace(/\s/g, '') || '';
  const cleanAddress = address?.toLowerCase() || '';

  // London postcodes start with these prefixes
  const londonPrefixes = [
    'E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC',
    'BR', 'CR', 'DA', 'EN', 'HA', 'IG', 'KT', 'RM',
    'SM', 'TW', 'UB', 'WD'
  ];

  // Check if postcode starts with London prefix
  const isLondonPostcode = londonPrefixes.some(prefix => {
    return cleanPostcode.startsWith(prefix);
  });

  // Also check if address contains London
  const addressContainsLondon = cleanAddress.includes('london');

  return isLondonPostcode || addressContainsLondon;
}

/**
 * Calculate mileage charge based on delivery type and distance
 */
function calculateMileageCharge(deliveryType: string, distanceInMiles: number): number {
  const ratePerMile = PRICING.MILEAGE_RATES[deliveryType as keyof typeof PRICING.MILEAGE_RATES] || PRICING.MILEAGE_RATES.SCHEDULED;
  const charge = distanceInMiles * ratePerMile;

  // Apply minimum charge
  return Math.max(charge, PRICING.MINIMUM_CHARGE);
}

/**
 * Calculate load volume surcharge based on package size
 */
function calculateLoadVolumeCharge(loadSize: string): number {
  return PRICING.LOAD_SURCHARGES[loadSize as keyof typeof PRICING.LOAD_SURCHARGES] || PRICING.LOAD_SURCHARGES.MEDIUM;
}

/**
 * Calculate ULEZ surcharge if applicable
 */
function calculateUlezCharge(postcode: string, address: string): { charge: number; isUlez: boolean } {
  const isUlez = isUlezZone(postcode, address);
  return {
    charge: isUlez ? PRICING.ULEZ_SURCHARGE : 0,
    isUlez,
  };
}

/**
 * Calculate stair carry surcharge
 * Formula: £15 per floor per helper (only applies when there's no lift)
 */
function calculateStairCarryCharge(
  numberOfHelpers: number,
  pickupFloors: number,
  pickupHasLift: boolean,
  dropFloors: number,
  dropHasLift: boolean
): number {
  let totalCharge = 0;

  // Pickup stairs (only if no lift)
  if (!pickupHasLift && pickupFloors > 0) {
    totalCharge += PRICING.STAIR_CARRY_PER_FLOOR_PER_HELPER * pickupFloors * numberOfHelpers;
  }

  // Drop stairs (only if no lift)
  if (!dropHasLift && dropFloors > 0) {
    totalCharge += PRICING.STAIR_CARRY_PER_FLOOR_PER_HELPER * dropFloors * numberOfHelpers;
  }

  return totalCharge;
}

/**
 * Calculate helper surcharge based on delivery distance
 */
function calculateHelperCharge(numberOfHelpers: number, distanceInMiles: number): number {
  if (numberOfHelpers === 0) return 0;

  let chargePerHelper = PRICING.HELPER_CHARGES.UP_TO_70_MILES;

  if (distanceInMiles > 210) {
    chargePerHelper = PRICING.HELPER_CHARGES.OVER_210_MILES;
  } else if (distanceInMiles > 140) {
    chargePerHelper = PRICING.HELPER_CHARGES.UP_TO_210_MILES;
  } else if (distanceInMiles > 70) {
    chargePerHelper = PRICING.HELPER_CHARGES.UP_TO_140_MILES;
  }

  return chargePerHelper * numberOfHelpers;
}

/**
 * Calculate storage charge based on load size and number of days
 * Maximum 7 days
 */
function calculateStorageCharge(needsStorage: boolean, loadSize: string, storageDays: number): number {
  if (!needsStorage || storageDays <= 0) return 0;

  // Cap at maximum storage days
  const actualDays = Math.min(storageDays, PRICING.MAX_STORAGE_DAYS);

  const chargePerDay = PRICING.STORAGE_CHARGES_PER_DAY[loadSize as keyof typeof PRICING.STORAGE_CHARGES_PER_DAY] || PRICING.STORAGE_CHARGES_PER_DAY.MEDIUM;

  return chargePerDay * actualDays;
}

/**
 * Main pricing calculation function
 * Returns detailed breakdown of all charges
 */
export function calculateDeliveryPrice(input: PricingInput): PriceBreakdown {
  // Set defaults for optional parameters
  const numberOfHelpers = input.numberOfHelpers || 0;
  const pickupFloors = input.pickupFloors || 0;
  const pickupHasLift = input.pickupHasLift !== undefined ? input.pickupHasLift : true;
  const dropFloors = input.dropFloors || 0;
  const dropHasLift = input.dropHasLift !== undefined ? input.dropHasLift : true;
  const needsStorage = input.needsStorage || false;
  const storageDays = input.storageDays || 0;
  const includesInsurance = input.includesInsurance !== undefined ? input.includesInsurance : true;

  // Calculate individual charges
  const mileageCharge = calculateMileageCharge(input.deliveryType, input.distanceInMiles);
  const loadVolumeCharge = calculateLoadVolumeCharge(input.loadSize);

  // Use ULEZ override if provided (from accurate Google Maps API check)
  // Otherwise fallback to postcode/address check
  let ulezCharge = 0;
  let isUlezZone = false;

  if (input.isUlezZone !== undefined) {
    // Use the accurate API result
    isUlezZone = input.isUlezZone;
    ulezCharge = isUlezZone ? PRICING.ULEZ_SURCHARGE : 0;
  } else {
    // Fallback to postcode/address check
    const ulezResult = calculateUlezCharge(input.dropPostcode || '', input.dropAddress || '');
    ulezCharge = ulezResult.charge;
    isUlezZone = ulezResult.isUlez;
  }

  const stairCarryCharge = calculateStairCarryCharge(
    numberOfHelpers,
    pickupFloors,
    pickupHasLift,
    dropFloors,
    dropHasLift
  );

  const helperCharge = calculateHelperCharge(numberOfHelpers, input.distanceInMiles);
  const storageCharge = calculateStorageCharge(needsStorage, input.loadSize, storageDays);
  const insuranceCharge = includesInsurance ? PRICING.INSURANCE_CHARGE : 0;

  // Calculate subtotal
  const subtotal =
    mileageCharge +
    loadVolumeCharge +
    ulezCharge +
    stairCarryCharge +
    helperCharge +
    storageCharge +
    insuranceCharge;

  // Round to nearest pound
  const total = Math.round(subtotal);

  return {
    mileageCharge,
    loadVolumeCharge,
    ulezCharge,
    stairCarryCharge,
    helperCharge,
    storageCharge,
    insuranceCharge,
    distanceInMiles: input.distanceInMiles,
    isUlezZone,
    subtotal,
    total,
  };
}

/**
 * Validate storage dates
 */
export function validateStorageDates(startDate: Date, endDate: Date): { valid: boolean; days: number; error?: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, days: 0, error: 'Invalid dates provided' };
  }

  // Check if end is after start
  if (end <= start) {
    return { valid: false, days: 0, error: 'End date must be after start date' };
  }

  // Calculate days
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Check if within maximum allowed days
  if (diffDays > PRICING.MAX_STORAGE_DAYS) {
    return { valid: false, days: diffDays, error: `Storage duration cannot exceed ${PRICING.MAX_STORAGE_DAYS} days` };
  }

  return { valid: true, days: diffDays };
}
