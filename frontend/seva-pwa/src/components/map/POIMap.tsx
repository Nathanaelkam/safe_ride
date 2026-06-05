'use client';
import { useEffect, useState } from 'react';
import { MapPin, Heart, School, Hotel, UtensilsCrossed, Navigation } from 'lucide-react';

interface POI {
  id: string;
  label: string;
  lat: number;
  lng: number;
  category: 'hospital' | 'school' | 'hotel' | 'restaurant';
}

interface UserLocation {
  lat: number;
  lng: number;
}

interface POIMapProps {
  userLocation: UserLocation | null;
  pois: POI[];
  selectedPOI?: string | null;
  onPOISelect?: (poi: POI) => void;
  height?: string;
}

export function POIMap({ 
  userLocation, 
  pois, 
  selectedPOI, 
  onPOISelect,
  height = "300px" 
}: POIMapProps) {
  const [mapCenter, setMapCenter] = useState<UserLocation>({ lat: 3.8667, lng: 11.5167 });
  
  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  }, [userLocation]);

  const getCategoryIcon = (category: POI['category']) => {
    switch (category) {
      case 'hospital': return <Heart size={16} className="text-red-400" />;
      case 'school': return <School size={16} className="text-blue-400" />;
      case 'hotel': return <Hotel size={16} className="text-purple-400" />;
      case 'restaurant': return <UtensilsCrossed size={16} className="text-green-400" />;
    }
  };

  const getCategoryColor = (category: POI['category']) => {
    switch (category) {
      case 'hospital': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'school': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'hotel': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'restaurant': return 'text-green-400 bg-green-400/10 border-green-400/20';
    }
  };

  // Calculate bounds to fit all POIs
  const allPoints = userLocation ? [userLocation, ...pois] : pois;
  const bounds = allPoints.length > 0 ? {
    minLat: Math.min(...allPoints.map(p => p.lat)),
    maxLat: Math.max(...allPoints.map(p => p.lat)),
    minLng: Math.min(...allPoints.map(p => p.lng)),
    maxLng: Math.max(...allPoints.map(p => p.lng)),
  } : null;

  // Simple map scale calculation
  const latRange = bounds ? bounds.maxLat - bounds.minLat : 0.1;
  const lngRange = bounds ? bounds.maxLng - bounds.minLng : 0.1;
  const scale = Math.max(latRange, lngRange) || 0.1;

  // Convert lat/lng to screen coordinates
  const getScreenPosition = (lat: number, lng: number) => {
    if (!bounds) return { x: 50, y: 50 };
    
    const x = ((lng - bounds.minLng) / lngRange) * 100;
    const y = ((bounds.maxLat - lat) / latRange) * 100; // Flip Y axis
    
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="eyebrow mb-2">Map View</p>
        <p className="text-xs text-cream/45 dark:text-cream/45 light:text-ink/45">
          {userLocation ? 'Your location and nearby places' : 'Points of interest in your area'}
        </p>
      </div>
      
      <div 
        className="relative bg-ink-900 dark:bg-ink-900 light:bg-gray-100 rounded-xl overflow-hidden border border-cream/10 dark:border-cream/10 light:border-ink/10"
        style={{ height }}
      >
        {/* Grid background */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }} />
        </div>

        {/* User location marker */}
        {userLocation && (
          <div
            className="absolute w-6 h-6 -translate-x-3 -translate-y-3 z-20"
            style={{
              left: `${getScreenPosition(userLocation.lat, userLocation.lng).x}%`,
              top: `${getScreenPosition(userLocation.lat, userLocation.lng).y}%`,
            }}
          >
            <div className="w-6 h-6 rounded-full bg-terracotta shadow-lg flex items-center justify-center">
              <Navigation size={12} className="text-white" />
            </div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-medium text-terracotta">You</span>
            </div>
          </div>
        )}

        {/* POI markers */}
        {pois.map((poi) => {
          const position = getScreenPosition(poi.lat, poi.lng);
          const isSelected = selectedPOI === poi.id;
          
          return (
            <div
              key={poi.id}
              className="absolute -translate-x-3 -translate-y-3 z-10"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
              }}
            >
              <button
                onClick={() => onPOISelect?.(poi)}
                className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                  ${getCategoryColor(poi.category)}
                  ${isSelected ? 'scale-125 shadow-lg' : 'hover:scale-110'}
                `}
              >
                {getCategoryIcon(poi.category)}
              </button>
              {isSelected && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs font-medium text-cream dark:text-cream light:text-ink bg-ink-800 dark:bg-ink-800 light:bg-white px-2 py-1 rounded shadow">
                    {poi.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Map info overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-ink-800/80 dark:bg-ink-800/80 light:bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-cream/10 dark:border-cream/10 light:border-ink/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cream/45 dark:text-cream/45 light:text-ink/45">
                Showing {pois.length} places
              </span>
              {scale && (
                <span className="text-cream/45 dark:text-cream/45 light:text-ink/45">
                  ~{(scale * 100).toFixed(1)}km view
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        {pois.length > 0 && (
          <div className="absolute top-4 right-4">
            <div className="bg-ink-800/80 dark:bg-ink-800/80 light:bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-cream/10 dark:border-cream/10 light:border-ink/10">
              {['hospital', 'school', 'hotel', 'restaurant'].map(category => {
                const categoryPOIs = pois.filter(p => p.category === category);
                if (categoryPOIs.length === 0) return null;
                
                return (
                  <div key={category} className="flex items-center gap-2 mb-1 last:mb-0">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${getCategoryColor(category as POI['category'])}`}>
                      {getCategoryIcon(category as POI['category'])}
                    </div>
                    <span className="text-xs text-cream/70 dark:text-cream/70 light:text-ink/70 capitalize">
                      {category}s ({categoryPOIs.length})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      <p className="text-center text-xs text-cream/45 dark:text-cream/45 light:text-ink/45">
        Click on markers to see details • Simplified map view
      </p>
    </div>
  );
}