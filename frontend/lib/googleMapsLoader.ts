// Global Google Maps loader to prevent multiple script loads
let googleMapsPromise: Promise<void> | null = null;
let isLoading = false;
let isLoaded = false;

export const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  // If already loaded, return resolved promise
  if (isLoaded && window.google?.maps) {
    return Promise.resolve();
  }

  // If currently loading, return existing promise
  if (isLoading && googleMapsPromise) {
    return googleMapsPromise;
  }

  // Create new loading promise
  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if script already exists in DOM
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api"]'
    );

    if (existingScript) {
      // Script exists, wait for it to load
      if (window.google?.maps) {
        isLoaded = true;
        resolve();
      } else {
        existingScript.addEventListener('load', () => {
          isLoaded = true;
          isLoading = false;
          resolve();
        });
        existingScript.addEventListener('error', (error) => {
          isLoading = false;
          reject(error);
        });
      }
      return;
    }

    // Create new script tag
    isLoading = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isLoaded = true;
      isLoading = false;
      resolve();
    };

    script.onerror = (error) => {
      isLoading = false;
      reject(error);
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

// Check if Google Maps is already loaded
export const isGoogleMapsLoaded = (): boolean => {
  return isLoaded && !!window.google?.maps;
};
