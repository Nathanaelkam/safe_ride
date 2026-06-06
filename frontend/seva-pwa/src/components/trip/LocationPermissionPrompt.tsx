'use client';
import { useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';

interface LocationPermissionPromptProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export function LocationPermissionPrompt({ onPermissionGranted, onPermissionDenied }: LocationPermissionPromptProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser');
      onPermissionDenied();
      return;
    }

    setIsRequesting(true);
    setError(null);

    try {
      // Request permission by trying to get current position
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false, // Use less accurate but faster GPS
            timeout: 15000, // Increase timeout
            maximumAge: 60000 // Accept cached position up to 1 minute old
          }
        );
      });

      console.log('Location permission granted');
      onPermissionGranted();
    } catch (err: any) {
      console.error('Location permission error:', err);
      
      let errorMessage = 'Failed to get location permission';
      if (err.code === err.PERMISSION_DENIED) {
        errorMessage = 'Location access was denied. Please enable location permissions in your browser settings.';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        errorMessage = 'Location services are not available.';
      } else if (err.code === err.TIMEOUT) {
        errorMessage = 'Location request timed out. Please try again.';
      }
      
      setError(errorMessage);
      onPermissionDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Card className="!p-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-terracotta/10 flex items-center justify-center">
        <MapPin className="w-8 h-8 text-terracotta" />
      </div>
      
      <h3 className="font-display text-xl tracking-tight mb-3">
        Enable Location Tracking
      </h3>
      
      <p className="text-sm text-cream/65 dark:text-cream/65 light:text-ink/65 mb-6 leading-relaxed">
        To track your trip and share your location with emergency contacts, we need access to your device's location.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-500 text-left">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <Button
          onClick={requestPermission}
          disabled={isRequesting}
          size="lg"
          fullWidth
          className="!bg-terracotta hover:!bg-terracotta/90"
        >
          {isRequesting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Requesting permission...
            </span>
          ) : (
            'Enable Location Access'
          )}
        </Button>

        <button
          onClick={onPermissionDenied}
          className="w-full py-2 text-sm text-cream/65 dark:text-cream/65 light:text-ink/65 hover:text-cream dark:hover:text-cream light:hover:text-ink transition-colors"
        >
          Skip (tracking will not work)
        </button>
      </div>
    </Card>
  );
}