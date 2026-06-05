'use client';
import { useEffect, useState } from 'react';

interface Coords {
  lat: number;
  lng: number;
  accuracy?: number;
}

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (e) => setError(e.message),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { coords, error };
}
