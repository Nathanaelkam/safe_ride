'use client';
import { useState, useEffect } from 'react';
import { Search, MapPin, Navigation, School, Heart, Hotel, UtensilsCrossed } from 'lucide-react';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { POIMap } from '@/components/map/POIMap';
import { cn } from '@/utils/cn';

interface Destination {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  category?: 'school' | 'hospital' | 'hotel' | 'restaurant' | 'general';
  distance?: number;
}

interface DestinationSearchProps {
  onDestinationSelect: (destination: Destination) => void;
  className?: string;
}

interface UserLocation {
  lat: number;
  lng: number;
}

type POICategory = 'school' | 'hospital' | 'hotel' | 'restaurant';

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

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getCurrentLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        // Fallback to Yaoundé center if geolocation fails
        console.warn('Geolocation failed:', error);
        resolve({ lat: 3.8667, lng: 11.5167 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}

async function searchPlaces(query: string, userLocation?: UserLocation): Promise<Destination[]> {
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your-mapbox-token') {
    // Fallback to filtering popular destinations if no API key
    const filtered = popularDestinations.filter(dest =>
      dest.label.toLowerCase().includes(query.toLowerCase()) ||
      dest.address.toLowerCase().includes(query.toLowerCase())
    );
    
    if (userLocation) {
      return filtered.map(dest => ({
        ...dest,
        distance: calculateDistance(userLocation.lat, userLocation.lng, dest.lat, dest.lng)
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
    
    return filtered;
  }

  try {
    const proximity = userLocation ? `${userLocation.lng},${userLocation.lat}` : '11.5167,3.8667';
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=CM&proximity=${proximity}&limit=8`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();
    
    const results = data.features.map((feature: any) => {
      const destination: Destination = {
        id: feature.id,
        label: feature.text,
        address: feature.place_name,
        lat: feature.center[1],
        lng: feature.center[0],
      };
      
      if (userLocation) {
        destination.distance = calculateDistance(userLocation.lat, userLocation.lng, destination.lat, destination.lng);
      }
      
      return destination;
    });
    
    return results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } catch (error) {
    console.error('Geocoding failed:', error);
    return searchPlaces(query); // Fallback without user location
  }
}

async function searchPOIByCategory(category: POICategory, userLocation: UserLocation): Promise<Destination[]> {
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your-mapbox-token') {
    // Mock POI data for fallback
    const mockPOIs: Record<POICategory, Destination[]> = {
      school: [
        { id: 's1', label: 'École Publique de Bastos', address: 'Bastos, Yaoundé', lat: 3.8867, lng: 11.5226, category: 'school' },
        { id: 's2', label: 'Lycée Général Leclerc', address: 'Centre-Ville, Yaoundé', lat: 3.8665, lng: 11.5174, category: 'school' },
      ],
      hospital: [
        { id: 'h1', label: 'Hôpital Central de Yaoundé', address: 'Centre-Ville, Yaoundé', lat: 3.8644, lng: 11.5196, category: 'hospital' },
        { id: 'h2', label: 'Clinique des Sœurs', address: 'Nlongkak, Yaoundé', lat: 3.8901, lng: 11.5311, category: 'hospital' },
      ],
      hotel: [
        { id: 'ht1', label: 'Hilton Yaoundé', address: 'Centre-Ville, Yaoundé', lat: 3.8665, lng: 11.5174, category: 'hotel' },
        { id: 'ht2', label: 'Hotel des Députés', address: 'Bastos, Yaoundé', lat: 3.8867, lng: 11.5226, category: 'hotel' },
      ],
      restaurant: [
        { id: 'r1', label: 'La Fourchette', address: 'Bastos, Yaoundé', lat: 3.8867, lng: 11.5226, category: 'restaurant' },
        { id: 'r2', label: 'Le Bougainvillier', address: 'Centre-Ville, Yaoundé', lat: 3.8665, lng: 11.5174, category: 'restaurant' },
      ],
    };
    
    return (mockPOIs[category] || []).map(poi => ({
      ...poi,
      distance: calculateDistance(userLocation.lat, userLocation.lng, poi.lat, poi.lng)
    })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  try {
    // Mapbox POI categories
    const categoryMap: Record<POICategory, string> = {
      school: 'school',
      hospital: 'hospital',
      hotel: 'lodging',
      restaurant: 'restaurant',
    };
    
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/poi.json?access_token=${MAPBOX_TOKEN}&proximity=${userLocation.lng},${userLocation.lat}&country=CM&types=poi&category=${categoryMap[category]}&limit=10`
    );
    
    if (!response.ok) {
      throw new Error('POI search failed');
    }

    const data = await response.json();
    
    return data.features.map((feature: any) => ({
      id: feature.id,
      label: feature.text,
      address: feature.place_name,
      lat: feature.center[1],
      lng: feature.center[0],
      category,
      distance: calculateDistance(userLocation.lat, userLocation.lng, feature.center[1], feature.center[0])
    })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } catch (error) {
    console.error(`${category} POI search failed:`, error);
    return [];
  }
}

export function DestinationSearch({ onDestinationSelect, className }: DestinationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<POICategory | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [poiResults, setPOIResults] = useState<Destination[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<string | null>(null);

  // Get user's current location on component mount
  useEffect(() => {
    getCurrentLocation()
      .then(location => {
        setUserLocation(location);
        setLoadingLocation(false);
      })
      .catch(error => {
        console.error('Failed to get location:', error);
        setLoadingLocation(false);
      });
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSelectedCategory(null); // Clear category when searching
    setPOIResults([]);
    
    if (query.trim().length > 2) {
      try {
        const results = await searchPlaces(query, userLocation || undefined);
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

  const handleCategorySelect = async (category: POICategory) => {
    if (!userLocation) return;
    
    setSelectedCategory(category);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    
    try {
      const results = await searchPOIByCategory(category, userLocation);
      setPOIResults(results);
    } catch (error) {
      console.error(`Failed to search ${category}:`, error);
      setPOIResults([]);
    }
  };

  const clearCategory = () => {
    setSelectedCategory(null);
    setPOIResults([]);
  };

  const handleDestinationClick = (destination: Destination) => {
    setSearchQuery(destination.label);
    setShowSuggestions(false);
    setSelectedPOI(null);
    onDestinationSelect(destination);
  };

  const handlePOIMapSelect = (poi: any) => {
    setSelectedPOI(selectedPOI === poi.id ? null : poi.id);
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
          {loadingLocation 
            ? 'Getting your location...' 
            : userLocation 
              ? 'Search for destinations or browse nearby places.'
              : 'Search for your destination to start planning your safe journey.'
          }
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
                    <div className="flex-1">
                      <p className="font-display text-sm tracking-tight text-cream dark:text-cream light:text-ink">
                        {destination.label}
                      </p>
                      <p className="text-xs text-cream/55 dark:text-cream/55 light:text-ink/55 mt-1">
                        {destination.address}
                        {destination.distance && (
                          <span className="ml-2 text-terracotta">
                            • {destination.distance.toFixed(1)} km away
                          </span>
                        )}
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
            if (userLocation) {
              const currentLocation: Destination = {
                id: 'current',
                label: 'Current Location',
                address: 'Your current location',
                lat: userLocation.lat,
                lng: userLocation.lng,
              };
              handleDestinationClick(currentLocation);
            }
          }}
          disabled={!userLocation}
          className="w-full flex items-center gap-4 text-left group disabled:opacity-50"
        >
          <div className="h-12 w-12 rounded-full bg-terracotta/10 flex items-center justify-center group-hover:bg-terracotta/15 transition-colors">
            <Navigation size={18} className="text-terracotta" />
          </div>
          <div>
            <p className="font-display text-base tracking-tight text-cream dark:text-cream light:text-ink">
              Use Current Location
            </p>
            <p className="text-sm text-cream/55 dark:text-cream/55 light:text-ink/55">
              {loadingLocation ? 'Getting location...' : 'Set your current position as destination'}
            </p>
          </div>
        </button>
      </Card>

      {/* POI Category Buttons */}
      {userLocation && !selectedCategory && (
        <div className="space-y-3">
          <p className="eyebrow">Find nearby places</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleCategorySelect('hospital')}
              className="flex items-center gap-3 p-4 rounded-xl border border-cream/10 dark:border-cream/10 light:border-ink/10 hover:border-terracotta/30 transition-colors group text-left"
            >
              <Heart size={20} className="text-red-400 group-hover:text-red-300 transition-colors" />
              <div>
                <p className="font-display text-sm tracking-tight text-cream dark:text-cream light:text-ink group-hover:text-terracotta transition-colors">
                  Hospitals
                </p>
                <p className="text-xs text-cream/45 dark:text-cream/45 light:text-ink/45">
                  Medical centers
                </p>
              </div>
            </button>
            
            <button
              onClick={() => handleCategorySelect('school')}
              className="flex items-center gap-3 p-4 rounded-xl border border-cream/10 dark:border-cream/10 light:border-ink/10 hover:border-terracotta/30 transition-colors group text-left"
            >
              <School size={20} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
              <div>
                <p className="font-display text-sm tracking-tight text-cream dark:text-cream light:text-ink group-hover:text-terracotta transition-colors">
                  Schools
                </p>
                <p className="text-xs text-cream/45 dark:text-cream/45 light:text-ink/45">
                  Educational
                </p>
              </div>
            </button>
            
            <button
              onClick={() => handleCategorySelect('hotel')}
              className="flex items-center gap-3 p-4 rounded-xl border border-cream/10 dark:border-cream/10 light:border-ink/10 hover:border-terracotta/30 transition-colors group text-left"
            >
              <Hotel size={20} className="text-purple-400 group-hover:text-purple-300 transition-colors" />
              <div>
                <p className="font-display text-sm tracking-tight text-cream dark:text-cream light:text-ink group-hover:text-terracotta transition-colors">
                  Hotels
                </p>
                <p className="text-xs text-cream/45 dark:text-cream/45 light:text-ink/45">
                  Accommodation
                </p>
              </div>
            </button>
            
            <button
              onClick={() => handleCategorySelect('restaurant')}
              className="flex items-center gap-3 p-4 rounded-xl border border-cream/10 dark:border-cream/10 light:border-ink/10 hover:border-terracotta/30 transition-colors group text-left"
            >
              <UtensilsCrossed size={20} className="text-green-400 group-hover:text-green-300 transition-colors" />
              <div>
                <p className="font-display text-sm tracking-tight text-cream dark:text-cream light:text-ink group-hover:text-terracotta transition-colors">
                  Restaurants
                </p>
                <p className="text-xs text-cream/45 dark:text-cream/45 light:text-ink/45">
                  Dining
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* POI Results */}
      {selectedCategory && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="eyebrow">
              Nearest {selectedCategory === 'restaurant' ? 'Restaurants' : 
                      selectedCategory === 'hospital' ? 'Hospitals' : 
                      selectedCategory === 'hotel' ? 'Hotels' : 'Schools'}
            </p>
            <button 
              onClick={clearCategory}
              className="text-xs text-terracotta hover:text-terracotta/80 transition-colors"
            >
              Clear
            </button>
          </div>
          
          {poiResults.length > 0 ? (
            <div className="space-y-2">
              {poiResults.slice(0, 6).map((poi) => (
                <button
                  key={poi.id}
                  onClick={() => handleDestinationClick(poi)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors group ${
                    selectedPOI === poi.id
                      ? 'border-terracotta/50 bg-terracotta/5'
                      : 'border-cream/10 dark:border-cream/10 light:border-ink/10 hover:border-terracotta/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {poi.category === 'hospital' && <Heart size={16} className="text-red-400" />}
                      {poi.category === 'school' && <School size={16} className="text-blue-400" />}
                      {poi.category === 'hotel' && <Hotel size={16} className="text-purple-400" />}
                      {poi.category === 'restaurant' && <UtensilsCrossed size={16} className="text-green-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-sm tracking-tight text-cream dark:text-cream light:text-ink group-hover:text-terracotta transition-colors">
                        {poi.label}
                      </p>
                      <p className="text-xs text-cream/45 dark:text-cream/45 light:text-ink/45 mt-1">
                        {poi.address.split(',')[0]}
                        {poi.distance && (
                          <span className="ml-2 text-terracotta">
                            • {poi.distance.toFixed(1)} km away
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-cream/55 dark:text-cream/55 light:text-ink/55 text-sm">
                No {selectedCategory === 'restaurant' ? 'restaurants' : 
                    selectedCategory === 'hospital' ? 'hospitals' : 
                    selectedCategory === 'hotel' ? 'hotels' : 'schools'} found nearby
              </p>
            </div>
          )}

          {/* POI Map */}
          {poiResults.length > 0 && (
            <Card className="!p-4">
              <POIMap
                userLocation={userLocation}
                pois={poiResults.map(poi => ({
                  id: poi.id,
                  label: poi.label,
                  lat: poi.lat,
                  lng: poi.lng,
                  category: poi.category as 'hospital' | 'school' | 'hotel' | 'restaurant'
                }))}
                selectedPOI={selectedPOI}
                onPOISelect={handlePOIMapSelect}
                height="250px"
              />
            </Card>
          )}
        </div>
      )}

      {/* Quick Actions - only show when no category selected */}
      {!selectedCategory && (
        <div className="space-y-3">
          <p className="eyebrow">Quick destinations</p>
          <div className="grid grid-cols-2 gap-3">
            {popularDestinations.slice(0, 4).map((destination) => {
              const distance = userLocation ? 
                calculateDistance(userLocation.lat, userLocation.lng, destination.lat, destination.lng) : null;
              
              return (
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
                    {distance && (
                      <span className="ml-2 text-terracotta">
                        • {distance.toFixed(1)} km
                      </span>
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}