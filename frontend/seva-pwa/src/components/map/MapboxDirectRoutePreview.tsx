'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useTheme } from '@/contexts/ThemeContext';

interface Destination {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

interface MapboxDirectRoutePreviewProps {
  destination: Destination;
  currentLocation?: { lat: number; lng: number };
  height?: string;
}

// You'll need to get a free Mapbox token from https://www.mapbox.com/
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export function MapboxDirectRoutePreview({ 
  destination, 
  currentLocation = { lat: 3.8667, lng: 11.5167 }, // Default to Yaoundé center
  height = '300px' 
}: MapboxDirectRoutePreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { theme } = useTheme();
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    // Check for valid token
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN.length < 10) {
      setMapError('Invalid or missing Mapbox access token. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment variables.');
      setIsLoadingRoute(false);
      return;
    }

    if (mapContainer.current) {
      try {
        mapboxgl.accessToken = MAPBOX_TOKEN;

        // Calculate bounds to fit both points
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([currentLocation.lng, currentLocation.lat]);
        bounds.extend([destination.lng, destination.lat]);

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: theme === 'light' 
            ? 'mapbox://styles/mapbox/streets-v12'  // Better for showing streets and quarters
            : 'mapbox://styles/mapbox/dark-v11',
          center: [
            (currentLocation.lng + destination.lng) / 2,
            (currentLocation.lat + destination.lat) / 2
          ],
          zoom: 13  // Higher zoom for better detail
        });

        map.current.on('error', (e) => {
          console.error('Mapbox error:', e);
          setMapError('Failed to load map. Please check your Mapbox access token.');
          setIsLoadingRoute(false);
        });

        map.current.on('load', () => {
          setMapLoaded(true);
          fetchAndDisplayRoute();
        });

        map.current.fitBounds(bounds, {
          padding: 60,
          maxZoom: 16  // Allow higher zoom to show more detail
        });

        // Add custom markers with better visibility
        new mapboxgl.Marker({
          color: '#E2725B',
          scale: 1.0
        })
          .setLngLat([currentLocation.lng, currentLocation.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Current Location'))
          .addTo(map.current!);

        new mapboxgl.Marker({
          color: '#D4A574',
          scale: 1.0
        })
          .setLngLat([destination.lng, destination.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(destination.label))
          .addTo(map.current!);

      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('Failed to initialize map. Please check your Mapbox configuration.');
        setIsLoadingRoute(false);
      }
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Only run once

  // Update map style when theme changes
  useEffect(() => {
    if (map.current) {
      const newStyle = theme === 'light' 
        ? 'mapbox://styles/mapbox/light-v11'
        : 'mapbox://styles/mapbox/dark-v11';
      map.current.setStyle(newStyle);
    }
  }, [theme]);

  const fetchAndDisplayRoute = async () => {
    if (!map.current) return;

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
        
        // Add route source and layer
        map.current!.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          }
        });

        // Add route with outline for better visibility
        map.current!.addLayer({
          id: 'route-outline',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 8,
            'line-opacity': 0.4
          }
        });

        map.current!.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#E2725B',
            'line-width': 5,
            'line-opacity': 0.9
          }
        });

        setRouteDistance(route.distance / 1000); // Convert to km
      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      console.warn('Failed to fetch Mapbox route, using fallback:', error);
      // Add simple line as fallback
      map.current!.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [currentLocation.lng, currentLocation.lat],
              [destination.lng, destination.lat]
            ]
          }
        }
      });

      // Fallback route with better visibility
      map.current!.addLayer({
        id: 'route-outline',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 7,
          'line-opacity': 0.3
        }
      });

      map.current!.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#E2725B',
          'line-width': 4,
          'line-opacity': 0.8,
          'line-dasharray': [6, 6]
        }
      });

      setRouteDistance(calculateDistance(currentLocation, destination));
    } finally {
      setIsLoadingRoute(false);
    }
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-cream/10 dark:border-cream/10 light:border-ink/10"
      style={{ height }}
    >
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Error State */}
      {mapError && (
        <div className="absolute inset-0 bg-ink/90 dark:bg-ink/90 light:bg-white/90 flex items-center justify-center rounded-2xl">
          <div className="text-center p-6">
            <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-red-500 text-sm">!</span>
            </div>
            <p className="text-sm text-cream/75 dark:text-cream/75 light:text-ink/75 mb-2">Map Error</p>
            <p className="text-xs text-cream/55 dark:text-cream/55 light:text-ink/55 leading-relaxed">
              {mapError}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoadingRoute && !mapError && (
        <div className="absolute inset-0 bg-ink/20 dark:bg-ink/20 light:bg-white/20 backdrop-blur-sm flex items-center justify-center rounded-2xl">
          <div className="text-center">
            <div className="h-6 w-6 border-2 border-terracotta/30 border-t-terracotta rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-cream/55 dark:text-cream/55 light:text-ink/55">
              {mapLoaded ? 'Loading route...' : 'Initializing map...'}
            </p>
          </div>
        </div>
      )}

      {/* Overlay info */}
      {!mapError && (
        <div className="pointer-events-none absolute top-3 left-3 right-3 flex justify-between text-[10px] uppercase tracking-[0.22em] font-mono text-cream/55 dark:text-cream/55 light:text-ink/55">
          <span>{isLoadingRoute ? 'Loading...' : 'Route preview'}</span>
          <span>{isLoadingRoute ? '...' : `~${Math.round(routeDistance * 10) / 10} km`}</span>
        </div>
      )}

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