'use client';
import { MapPin, Navigation } from 'lucide-react';

interface Destination {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

interface SimpleMapFallbackProps {
  destination: Destination;
  currentLocation?: { lat: number; lng: number };
  height?: string;
}

export function SimpleMapFallback({ 
  destination, 
  currentLocation = { lat: 3.8667, lng: 11.5167 },
  height = '300px' 
}: SimpleMapFallbackProps) {
  // Calculate approximate distance
  const distance = calculateDistance(currentLocation, destination);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-cream/10 dark:border-cream/10 light:border-ink/10 bg-gradient-to-br from-terracotta/5 to-ochre/5"
      style={{ height }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
        {/* Route visualization */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex flex-col items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-terracotta border-2 border-white shadow-lg"></div>
            <span className="text-xs text-cream/55 dark:text-cream/55 light:text-ink/55">Start</span>
          </div>
          
          <div className="flex-1 h-px bg-gradient-to-r from-terracotta via-ochre to-ochre bg-opacity-50 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-terracotta/30 via-ochre/30 to-ochre/30 animate-pulse"></div>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-ochre border-2 border-white shadow-lg"></div>
            <span className="text-xs text-cream/55 dark:text-cream/55 light:text-ink/55">End</span>
          </div>
        </div>

        {/* Destination info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 justify-center">
            <Navigation size={16} className="text-terracotta" />
            <span className="font-display text-lg tracking-tight text-cream dark:text-cream light:text-ink">
              {destination.label}
            </span>
          </div>
          <p className="text-sm text-cream/55 dark:text-cream/55 light:text-ink/55">
            ~{Math.round(distance * 10) / 10} km away
          </p>
        </div>

        {/* Map notice */}
        <div className="bg-cream/5 dark:bg-cream/5 light:bg-ink/5 rounded-xl p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-terracotta mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-display tracking-tight text-cream/75 dark:text-cream/75 light:text-ink/75 mb-1">
                Route Preview
              </p>
              <p className="text-xs text-cream/55 dark:text-cream/55 light:text-ink/55 leading-relaxed">
                Map is loading or unavailable. Your route will be displayed once the trip starts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Frame overlay */}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cream/5 dark:ring-cream/5 light:ring-ink/5 rounded-2xl" />
    </div>
  );
}

// Helper function to calculate distance between two points
function calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}