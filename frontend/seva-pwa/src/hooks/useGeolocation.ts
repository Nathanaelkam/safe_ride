'use client';
import { useEffect, useState } from 'react';

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface UseGeolocationReturn {
  position: GeolocationPosition | null;
  error: string | null;
  isSupported: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 5000
  } = options;
  
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  });

  useEffect(() => {
    if (!isSupported) {
      setError('Geolocation not supported by this browser');
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      setPosition({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      setError(null);
    };

    const handleError = (err: GeolocationPositionError) => {
      let errorMessage = 'Failed to get your location';
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'Location access denied. Please enable location permissions.';
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'Location information unavailable.';
          break;
        case err.TIMEOUT:
          errorMessage = 'Location request timed out.';
          break;
      }
      
      setError(errorMessage);
    };

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enableHighAccuracy, timeout, maximumAge, isSupported]);

  return { position, error, isSupported };
}
