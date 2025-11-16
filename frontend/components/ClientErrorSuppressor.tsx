'use client';

import { useEffect } from 'react';

export default function ClientErrorSuppressor() {
  useEffect(() => {
    // Suppress Google Maps DOM manipulation errors in development
    const originalError = console.error;
    console.error = (...args) => {
      // Check if it's the Google Maps removeChild error
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('removeChild') ||
         args[0].includes('NotFoundError') ||
         args[0].includes('The node to be removed is not a child'))
      ) {
        // Suppress this specific error - it's a known issue with Google Maps and React
        return;
      }
      // Log all other errors normally
      originalError.apply(console, args);
    };

    // Also suppress unhandled errors
    const handleError = (event: ErrorEvent) => {
      if (
        event.message.includes('removeChild') ||
        event.message.includes('NotFoundError') ||
        event.message.includes('The node to be removed is not a child')
      ) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener('error', handleError);

    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}
