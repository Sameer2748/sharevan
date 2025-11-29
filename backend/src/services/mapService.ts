import { Client, TravelMode } from '@googlemaps/google-maps-services-js';
import { env } from '../config/env';
import { calculateDistance as haversineDistance } from '../utils/helpers';

const client = new Client({});

/**
 * Calculate distance and duration using Google Maps Distance Matrix API
 */
export const calculateRoute = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{
  distance: number; // in kilometers
  duration: number; // in minutes
  success: boolean;
  error?: string;
}> => {
  try {
    // If Google Maps API key is not configured, use Haversine formula
    if (!env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY === '') {
      console.warn('⚠️ Google Maps API key not configured. Using Haversine distance calculation.');
      const distance = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
      const duration = Math.ceil((distance / 25) * 60); // Assume 25 km/h average speed

      return {
        distance,
        duration,
        success: true,
      };
    }

    // Use Google Maps Distance Matrix API
    const response = await client.distancematrix({
      params: {
        origins: [`${origin.lat},${origin.lng}`],
        destinations: [`${destination.lat},${destination.lng}`],
        mode: TravelMode.driving,
        key: env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 5000, // 5 seconds timeout
    });

    if (response.data.status === 'OK') {
      const element = response.data.rows[0].elements[0];

      if (element.status === 'OK') {
        const distanceMeters = element.distance.value;
        const durationSeconds = element.duration.value;

        return {
          distance: Math.round((distanceMeters / 1000) * 100) / 100, // Convert to km, round to 2 decimals
          duration: Math.ceil(durationSeconds / 60), // Convert to minutes
          success: true,
        };
      } else {
        throw new Error(`Route calculation failed: ${element.status}`);
      }
    } else {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }
  } catch (error: any) {
    console.error('Error calculating route:', error);

    // Fallback to Haversine distance
    const distance = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    const duration = Math.ceil((distance / 25) * 60);

    return {
      distance,
      duration,
      success: true,
      error: 'Used fallback distance calculation',
    };
  }
};

/**
 * Reverse geocode coordinates to address
 */
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<{
  address: string;
  success: boolean;
  error?: string;
}> => {
  try {
    if (!env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY === '') {
      return {
        address: `${lat}, ${lng}`,
        success: false,
        error: 'Google Maps API key not configured',
      };
    }

    const response = await client.reverseGeocode({
      params: {
        latlng: `${lat},${lng}`,
        key: env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 5000,
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      return {
        address: response.data.results[0].formatted_address,
        success: true,
      };
    } else {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }
  } catch (error: any) {
    console.error('Error reverse geocoding:', error);
    return {
      address: `${lat}, ${lng}`,
      success: false,
      error: error.message,
    };
  }
};

/**
 * Geocode address to coordinates
 */
export const geocodeAddress = async (
  address: string
): Promise<{
  lat: number;
  lng: number;
  formattedAddress: string;
  success: boolean;
  error?: string;
}> => {
  try {
    if (!env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY === '') {
      return {
        lat: 0,
        lng: 0,
        formattedAddress: address,
        success: false,
        error: 'Google Maps API key not configured',
      };
    }

    const response = await client.geocode({
      params: {
        address,
        key: env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 5000,
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        success: true,
      };
    } else {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }
  } catch (error: any) {
    console.error('Error geocoding address:', error);
    return {
      lat: 0,
      lng: 0,
      formattedAddress: address,
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if coordinates are in ULEZ zone (London) using Google Maps Geocoding API
 * More accurate than postcode prefix matching
 */
export const checkUlezZone = async (
  lat: number,
  lng: number
): Promise<{
  isUlez: boolean;
  locality?: string;
  administrativeArea?: string;
  success: boolean;
  error?: string;
}> => {
  try {
    if (!env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY === '') {
      // Fallback: return false if no API key
      return {
        isUlez: false,
        success: false,
        error: 'Google Maps API key not configured',
      };
    }

    const response = await client.reverseGeocode({
      params: {
        latlng: `${lat},${lng}`,
        key: env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 5000,
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const addressComponents = result.address_components;

      let locality = '';
      let administrativeArea = '';
      let postalTown = '';

      // Extract location information from address components
      for (const component of addressComponents) {
        if (component.types.includes('postal_town' as any)) {
          postalTown = component.long_name.toLowerCase();
        }
        if (component.types.includes('locality' as any)) {
          locality = component.long_name.toLowerCase();
        }
        if (component.types.includes('administrative_area_level_2' as any)) {
          administrativeArea = component.long_name.toLowerCase();
        }
      }

      // Check if location is in Greater London
      // ULEZ covers all of Greater London as of August 2023
      const isInLondon =
        postalTown === 'london' ||
        locality === 'london' ||
        administrativeArea === 'greater london' ||
        postalTown.includes('london') ||
        locality.includes('london');

      return {
        isUlez: isInLondon,
        locality,
        administrativeArea,
        success: true,
      };
    } else {
      throw new Error(`Reverse geocoding failed: ${response.data.status}`);
    }
  } catch (error: any) {
    console.error('Error checking ULEZ zone:', error);
    return {
      isUlez: false,
      success: false,
      error: error.message,
    };
  }
};

export default {
  calculateRoute,
  reverseGeocode,
  geocodeAddress,
  checkUlezZone,
};
