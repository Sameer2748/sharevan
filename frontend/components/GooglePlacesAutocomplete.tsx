'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { loadGoogleMapsScript, isGoogleMapsLoaded } from '@/lib/googleMapsLoader';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  onFocus?: () => void;
  onClear?: () => void;
  clearable?: boolean;
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Enter address',
  label,
  className = '',
  onFocus,
  onClear,
  clearable = false,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const setup = async () => {
      try {
        const apiKey =
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_FALLBACK ||
          'AIzaSyAg1QBIXXbGLiNO26G6GvHQwmdJJ0usUV0';

        await loadGoogleMapsScript(apiKey);
        await initAutocomplete();
      } catch (error) {
        console.error('Failed to load Google Maps script:', error);
        setIsLoading(false);
        setError('Unable to load location suggestions');
      }
    };

    setup();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const initAutocomplete = async () => {
    try {
      if (!inputRef.current) return;

      if (!isGoogleMapsLoaded() || !window.google?.maps) {
        throw new Error('Google Maps library not available');
      }

      const { Autocomplete } = (await window.google.maps.importLibrary(
        'places'
      )) as google.maps.PlacesLibrary;

      autocompleteRef.current = new Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'in' },
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['address'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();

        if (!place || !place.geometry || !place.geometry.location) {
          console.error('No valid place selected');
          setError('Unable to fetch location. Try again.');
          return;
        }

        const address = place.formatted_address || place.name || '';
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        setInputValue(address);
        setError(null);
        onChange(address, lat, lng);
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing Google Places:', error);
      setError('Google Autocomplete unavailable');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={onFocus}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-[#E4E8F7] bg-[#F8F9FF] px-4 py-3 text-sm font-medium text-gray-700 focus:border-[#0F58FF] focus:bg-white focus:outline-none"
          disabled={isLoading}
        />
        {clearable && inputValue && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              onClear?.();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-1 text-gray-400 shadow"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}
      </div>
      {isLoading && (
        <p className="text-xs text-gray-500 mt-1">Loading Google Maps...</p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
