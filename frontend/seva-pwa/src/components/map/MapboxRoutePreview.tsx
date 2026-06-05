'use client';
import { useEffect, useState, useCallback } from 'react';
import { Map, Marker, Source, Layer } from 'react-map-gl';
import { useTheme } from '@/contexts/ThemeContext';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Destination {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

interface MapboxRoutePreviewProps {
  destination: Destination;
  currentLocation?: { lat: number; lng: number };
  height?: string;
}

// You'll need to get a free Mapbox token from https://www.mapbox.com/
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGZ4eHh4eHgifQ.xxxxxxxxxxxxxxxxxxxxxxxx';

export function MapboxRoutePreview({ 
  destination, 
  currentLocation = { lat: 3.8667, lng: 11.5167 }, // Default to Yaoundé center
  height = '300px' 
}: MapboxRoutePreviewProps) {
  const { theme } = useTheme();
  const [routeData, setRouteData] = useState<any>(null);
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);

  // Calculate viewport bounds to fit both points
  const getViewport = useCallback(() => {
    const lats = [currentLocation.lat, destination.lat];
    const lngs = [currentLocation.lng, destination.lng];
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Add padding
    const padding = 0.01;
    
    return {
      longitude: (minLng + maxLng) / 2,
      latitude: (minLat + maxLat) / 2,
      zoom: calculateZoom(minLat, maxLat, minLng, maxLng),
    };
  }, [currentLocation, destination]);

  // Fetch route from Mapbox Directions API
  useEffect(() => {
    const fetchRoute = async () => {
      setIsLoadingRoute(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${currentLocation.lng},${currentLocation.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        
        if (!response.ok) {
          throw new Error('Mapbox routing service unavailable');
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          setRouteData({
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          });
          setRouteDistance(route.distance / 1000); // Convert to km
        } else {
          throw new Error('No route found');
        }
      } catch (error) {
        console.warn('Failed to fetch Mapbox route, using fallback:', error);
        // Fallback to simple line if Mapbox fails
        const fallbackRoute = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [currentLocation.lng, currentLocation.lat],
              [destination.lng, destination.lat]
            ]
          }
        };
        setRouteData(fallbackRoute);
        setRouteDistance(calculateDistance(currentLocation, destination));
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [currentLocation, destination]);

  // Map style based on theme
  const mapStyle = theme === 'light' 
    ? 'mapbox://styles/mapbox/light-v11'
    : 'mapbox://styles/mapbox/dark-v11';

  // Route line layer style
  const routeLayerStyle = {
    id: 'route',
    type: 'line' as const,
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#E2725B',
      'line-width': 4,
      'line-opacity': 0.8
    }
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-cream/10 dark:border-cream/10 light:border-ink/10"
      style={{ height }}
    >
      <Map
        {...getViewport()}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        interactive={true}
        scrollZoom={false}
        dragPan={true}
        dragRotate={false}
        pitchWithRotate={false}
      >
        {/* Route line */}
        {routeData && (
          <Source id="route-source" type="geojson" data={routeData}>
            <Layer {...routeLayerStyle} />
          </Source>
        )}

        {/* Start marker (current location) */}
        <Marker
          longitude={currentLocation.lng}
          latitude={currentLocation.lat}
          anchor="center"
        >
          <div className="h-6 w-6 rounded-full bg-terracotta border-2 border-white shadow-lg flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-white"></div>
          </div>
        </Marker>

        {/* Destination marker */}
        <Marker
          longitude={destination.lng}
          latitude={destination.lat}
          anchor="center"
        >
          <div className="h-6 w-6 rounded-full bg-ochre border-2 border-white shadow-lg flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-white"></div>
          </div>
        </Marker>
      </Map>

      {/* Overlay info */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex justify-between text-[10px] uppercase tracking-[0.22em] font-mono text-cream/55 dark:text-cream/55 light:text-ink/55">
        <span>{isLoadingRoute ? 'Loading route...' : 'Route preview'}</span>
        <span>{isLoadingRoute ? '...' : `~${Math.round(routeDistance * 10) / 10} km`}</span>
      </div>
      
      {isLoadingRoute && (
        <div className="absolute inset-0 bg-ink/20 dark:bg-ink/20 light:bg-white/20 backdrop-blur-sm flex items-center justify-center rounded-2xl">
          <div className="h-6 w-6 border-2 border-terracotta/30 border-t-terracotta rounded-full animate-spin"></div>
        </div>
      )}

      {/* Frame overlay */}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cream/5 dark:ring-cream/5 light:ring-ink/5 rounded-2xl" />
    </div>
  );
}

// Helper function to calculate zoom level based on bounds
function calculateZoom(minLat: number, maxLat: number, minLng: number, maxLng: number): number {
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);
  
  if (maxDiff > 0.2) return 10;
  if (maxDiff > 0.1) return 11;
  if (maxDiff > 0.05) return 12;
  if (maxDiff > 0.02) return 13;
  return 14;
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