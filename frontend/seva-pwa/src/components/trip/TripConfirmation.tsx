'use client';
import { useState } from 'react';
import { MapPin, Clock, Navigation, ArrowRight } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { MapboxDirectRoutePreview } from '@/components/map/MapboxDirectRoutePreview';
import { SimpleMapFallback } from '@/components/map/SimpleMapFallback';
import { cn } from '@/utils/cn';

interface Destination {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

interface TripConfirmationProps {
  destination: Destination;
  onStartTrip: () => void;
  onBack: () => void;
  className?: string;
}

export function TripConfirmation({ destination, onStartTrip, onBack, className }: TripConfirmationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [useMapboxFallback, setUseMapboxFallback] = useState(false);
  
  // Check if Mapbox token is available
  const hasMapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN && 
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.length > 10;

  const handleStartTrip = async () => {
    setIsLoading(true);
    // Simulate trip initialization
    await new Promise(resolve => setTimeout(resolve, 1500));
    onStartTrip();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <header className="text-center">
        <p className="eyebrow mb-4">Ready to go</p>
        <h1 className="font-display text-display-md tracking-tight mb-4">
          Confirm your<br/>
          <span className="italic">journey</span>
        </h1>
      </header>

      {/* Route Preview Map */}
      {hasMapboxToken && !useMapboxFallback ? (
        <MapboxDirectRoutePreview 
          destination={destination}
          height="300px"
        />
      ) : (
        <SimpleMapFallback 
          destination={destination}
          height="300px"
        />
      )}

      {/* Trip Details */}
      <Card className="!p-6">
        <div className="space-y-6">
          {/* Route */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-terracotta"></div>
              <div className="w-px h-8 bg-cream/20"></div>
              <MapPin size={16} className="text-terracotta" />
            </div>
            <div className="flex-1">
              <div className="mb-4">
                <p className="text-sm text-cream/55 dark:text-cream/55 light:text-ink/55">From</p>
                <p className="font-display text-base tracking-tight">Current Location</p>
                <p className="text-sm text-cream/45 dark:text-cream/45 light:text-ink/45">Your current position</p>
              </div>
              <div>
                <p className="text-sm text-cream/55 dark:text-cream/55 light:text-ink/55">To</p>
                <p className="font-display text-lg tracking-tight">{destination.label}</p>
                <p className="text-sm text-cream/45 dark:text-cream/45 light:text-ink/45">{destination.address}</p>
              </div>
            </div>
          </div>

          {/* Trip Info */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-cream/10 dark:border-cream/10 light:border-ink/10">
            <div className="text-center">
              <div className="h-10 w-10 rounded-full bg-terracotta/10 flex items-center justify-center mx-auto mb-2">
                <Clock size={16} className="text-terracotta" />
              </div>
              <p className="text-sm text-cream/55 dark:text-cream/55 light:text-ink/55">Est. time</p>
              <p className="font-display text-base tracking-tight">15-20 min</p>
            </div>
            <div className="text-center">
              <div className="h-10 w-10 rounded-full bg-terracotta/10 flex items-center justify-center mx-auto mb-2">
                <Navigation size={16} className="text-terracotta" />
              </div>
              <p className="text-sm text-cream/55 dark:text-cream/55 light:text-ink/55">Distance</p>
              <p className="font-display text-base tracking-tight">8.5 km</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Safety Notice */}
      <Card className="!p-5 !border-terracotta/20 !bg-terracotta/5">
        <div className="flex items-start gap-4">
          <div className="h-8 w-8 rounded-full bg-terracotta/20 flex items-center justify-center shrink-0 mt-1">
            <MapPin size={14} className="text-terracotta" />
          </div>
          <div>
            <p className="font-display text-base tracking-tight mb-2">Safety features active</p>
            <ul className="space-y-1 text-sm text-cream/65 dark:text-cream/65 light:text-ink/65">
              <li>• Live location sharing with your circle</li>
              <li>• SOS button will be available during trip</li>
              <li>• Voice trigger ready with your codeword</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleStartTrip}
          disabled={isLoading}
          size="lg"
          fullWidth
          className="!bg-terracotta hover:!bg-terracotta/90"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Starting trip...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Start Trip <ArrowRight size={16} />
            </span>
          )}
        </Button>
        
        <button
          onClick={onBack}
          disabled={isLoading}
          className="w-full py-3 text-sm text-cream/65 dark:text-cream/65 light:text-ink/65 hover:text-cream dark:hover:text-cream light:hover:text-ink transition-colors"
        >
          Choose different destination
        </button>
      </div>
    </div>
  );
}