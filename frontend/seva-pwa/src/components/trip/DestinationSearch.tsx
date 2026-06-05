'use client';
import { useState } from 'react';
import { Search, MapPin, Navigation } from 'lucide-react';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { cn } from '@/utils/cn';

interface Destination {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

interface DestinationSearchProps {
  onDestinationSelect: (destination: Destination) => void;
  className?: string;
}

// Popular destinations as fallback when no search query
const popularDestinations: Destination[] = [
  {
    id: '1',
    label: 'Marché Central',
    address: 'Centre-Ville, Yaoundé, Cameroun',
    lat: 3.8665,
    lng: 11.5174,
  },
  {
    id: '2',
    label: 'University of Yaoundé I',
    address: 'Ngoa-Ekellé, Yaoundé, Cameroun',
    lat: 3.8480,
    lng: 11.4820,
  },
  {
    id: '3',
    label: 'Stade Omnisports',
    address: 'Omnisport, Yaoundé, Cameroun',
    lat: 3.8370,
    lng: 11.5180,
  },
  {
    id: '4',
    label: 'Musée National',
    address: 'Centre-Ville, Yaoundé, Cameroun',
    lat: 3.8644,
    lng: 11.5196,
  },
];

// TODO: Replace with actual Mapbox API key
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'your-mapbox-token';

async function searchPlaces(query: string): Promise<Destination[]> {
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your-mapbox-token') {
    // Fallback to filtering popular destinations if no API key
    return popularDestinations.filter(dest =>
      dest.label.toLowerCase().includes(query.toLowerCase()) ||
      dest.address.toLowerCase().includes(query.toLowerCase())
    );
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=CM&proximity=11.5167,3.8667&limit=8`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();
    
    return data.features.map((feature: any) => ({
      id: feature.id,
      label: feature.text,
      address: feature.place_name,
      lat: feature.center[1],
      lng: feature.center[0],
    }));
  } catch (error) {
    console.error('Geocoding failed:', error);
    // Fallback to filtering popular destinations
    return popularDestinations.filter(dest =>
      dest.label.toLowerCase().includes(query.toLowerCase()) ||
      dest.address.toLowerCase().includes(query.toLowerCase())
    );
  }
}

export function DestinationSearch({ onDestinationSelect, className }: DestinationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 2) {
      try {
        const results = await searchPlaces(query);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Search failed:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleDestinationClick = (destination: Destination) => {
    setSearchQuery(destination.label);
    setShowSuggestions(false);
    onDestinationSelect(destination);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <header className="text-center">
        <p className="eyebrow mb-4">Plan your journey</p>
        <h1 className="font-display text-display-md tracking-tight mb-4">
          Where would you<br/>
          <span className="italic">like to go</span>?
        </h1>
        <p className="text-cream/55 dark:text-cream/55 light:text-ink/55 text-sm max-w-md mx-auto">
          Search for your destination to start planning your safe journey.
        </p>
      </header>

      {/* Search Input */}
      <Card className="!p-6">
        <div className="relative">
          <div className="relative">
            <Search 
              size={18} 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cream/45 dark:text-cream/45 light:text-ink/45" 
            />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search for a destination..."
              className="pl-12"
              autoFocus
            />
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-ink-800 dark:bg-ink-800 light:bg-white border border-cream/10 dark:border-cream/10 light:border-ink/10 rounded-xl shadow-xl z-10 max-h-64 overflow-y-auto">
              {suggestions.map((destination) => (
                <button
                  key={destination.id}
                  onClick={() => handleDestinationClick(destination)}
                  className="w-full text-left px-4 py-3 hover:bg-cream/5 dark:hover:bg-cream/5 light:hover:bg-ink/5 transition-colors border-b border-cream/5 dark:border-cream/5 light:border-ink/5 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-terracotta mt-1 shrink-0" />
                    <div>
                      <p className="font-display text-sm tracking-tight text-cream dark:text-cream light:text-ink">
                        {destination.label}
                      </p>
                      <p className="text-xs text-cream/55 dark:text-cream/55 light:text-ink/55 mt-1">
                        {destination.address}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Current Location Option */}
      <Card className="!p-4">
        <button
          onClick={() => {
            // Mock current location
            const currentLocation: Destination = {
              id: 'current',
              label: 'Current Location',
              address: 'Your current location',
              lat: 3.8667,
              lng: 11.5167,
            };
            handleDestinationClick(currentLocation);
          }}
          className="w-full flex items-center gap-4 text-left group"
        >
          <div className="h-12 w-12 rounded-full bg-terracotta/10 flex items-center justify-center group-hover:bg-terracotta/15 transition-colors">
            <Navigation size={18} className="text-terracotta" />
          </div>
          <div>
            <p className="font-display text-base tracking-tight text-cream dark:text-cream light:text-ink">
              Use Current Location
            </p>
            <p className="text-sm text-cream/55 dark:text-cream/55 light:text-ink/55">
              Set your current position as destination
            </p>
          </div>
        </button>
      </Card>

      {/* Quick Actions */}
      <div className="space-y-3">
        <p className="eyebrow">Quick destinations</p>
        <div className="grid grid-cols-2 gap-3">
          {popularDestinations.slice(0, 4).map((destination) => (
            <button
              key={destination.id}
              onClick={() => handleDestinationClick(destination)}
              className="text-left p-4 rounded-xl border border-cream/10 dark:border-cream/10 light:border-ink/10 hover:border-terracotta/30 transition-colors group"
            >
              <p className="font-display text-sm tracking-tight text-cream dark:text-cream light:text-ink group-hover:text-terracotta transition-colors">
                {destination.label}
              </p>
              <p className="text-xs text-cream/45 dark:text-cream/45 light:text-ink/45 mt-1">
                {destination.address.split(',')[0]}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}