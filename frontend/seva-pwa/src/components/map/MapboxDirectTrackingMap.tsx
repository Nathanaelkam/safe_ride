'use client';
import { useEffect, useRef, useMemo, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useTheme } from '@/contexts/ThemeContext';
import { useTripTracking } from '@/hooks/useTripTracking';
import { LocationPermissionPrompt } from '@/components/trip/LocationPermissionPrompt';
import type { TripWaypoint } from '@/types';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxDirectTrackingMapProps {
  waypoints?: TripWaypoint[];
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  height?: string;
  useRealTimeTracking?: boolean;
}

// Mapbox token - falls back to OpenStreetMap if not available
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export function MapboxDirectTrackingMap({ 
  waypoints: propWaypoints, 
  origin: propOrigin, 
  destination: propDestination, 
  height = '420px',
  useRealTimeTracking = false 
}: MapboxDirectTrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { theme } = useTheme();
  const tracking = useTripTracking();
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [plannedRoute, setPlannedRoute] = useState<[number, number][]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  
  // Refs for markers to update them dynamically
  const currentPositionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  
  // Use real-time data if enabled, otherwise use props
  const waypoints = useRealTimeTracking ? tracking.waypoints : (propWaypoints || []);
  
  // For origin, use the starting position or current GPS position
  const origin = useMemo(() => {
    if (useRealTimeTracking) {
      // Use first waypoint as origin if available, otherwise current position
      if (tracking.waypoints.length > 0) {
        const firstWaypoint = tracking.waypoints[0];
        return { lat: firstWaypoint.lat, lng: firstWaypoint.lng };
      } else if (tracking.currentPosition) {
        return { lat: tracking.currentPosition.latitude, lng: tracking.currentPosition.longitude };
      }
    }
    return propOrigin || { lat: 3.848, lng: 11.502 }; // Default to Yaoundé
  }, [useRealTimeTracking, tracking.waypoints, tracking.currentPosition, propOrigin]);
  
  const destination = propDestination || { lat: 3.848, lng: 11.502 };

  // Check if we need to show location permission prompt
  useEffect(() => {
    if (useRealTimeTracking && !tracking.isGpsSupported) {
      setShowLocationPrompt(false); // GPS not supported, don't show prompt
    } else if (useRealTimeTracking && tracking.gpsError && tracking.gpsError.includes('denied')) {
      setShowLocationPrompt(true);
    } else if (useRealTimeTracking && tracking.isGpsSupported && !tracking.currentPosition && !tracking.gpsError) {
      // GPS supported but no position yet, might need permission
      // Only show prompt if we haven't been waiting too long
      setTimeout(() => {
        if (!tracking.currentPosition) {
          setShowLocationPrompt(true);
        }
      }, 3000);
    } else if (tracking.currentPosition) {
      // We have position, don't show prompt
      setShowLocationPrompt(false);
    }
  }, [useRealTimeTracking, tracking.isGpsSupported, tracking.gpsError, tracking.currentPosition]);

  // Calculate route between origin and destination
  const calculateRoute = async (start: {lat: number, lng: number}, end: {lat: number, lng: number}) => {
    setIsLoadingRoute(true);
    
    try {
      if (MAPBOX_TOKEN) {
        // Use Mapbox Directions API
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates = route.geometry.coordinates;
            setPlannedRoute(coordinates);
            console.log('Mapbox route calculated:', coordinates.length, 'points');
            return;
          }
        }
      }

      // Fallback to OSRM (OpenStreetMap routing) - free alternative
      console.log('Using OSRM fallback routing');
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates;
          setPlannedRoute(coordinates);
          console.log('OSRM route calculated:', coordinates.length, 'points');
          return;
        }
      }

      // Final fallback to straight line
      console.log('Using straight line fallback');
      setPlannedRoute([[start.lng, start.lat], [end.lng, end.lat]]);
      
    } catch (error) {
      console.error('Error calculating route:', error);
      // Fallback to straight line if all routing fails
      setPlannedRoute([[start.lng, start.lat], [end.lng, end.lat]]);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Calculate route when origin/destination changes
  useEffect(() => {
    if (origin.lat !== 0 && origin.lng !== 0 && destination.lat !== 0 && destination.lng !== 0) {
      calculateRoute(origin, destination);
    }
  }, [origin.lat, origin.lng, destination.lat, destination.lng]);

  // Calculate center point and zoom - prioritize real GPS position
  const viewport = useMemo(() => {
    // Use real-time GPS position if available
    if (useRealTimeTracking && tracking.currentPosition) {
      return {
        longitude: tracking.currentPosition.longitude,
        latitude: tracking.currentPosition.latitude,
        zoom: 16
      };
    }
    
    // Fall back to latest waypoint
    if (waypoints.length > 0) {
      const last = waypoints[waypoints.length - 1];
      return {
        longitude: last.lng,
        latitude: last.lat,
        zoom: 14
      };
    }
    
    // Final fallback to origin
    return {
      longitude: origin.lng,
      latitude: origin.lat,
      zoom: 14
    };
  }, [useRealTimeTracking, tracking.currentPosition, waypoints, origin]);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    if (mapContainer.current && MAPBOX_TOKEN) {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: theme === 'light' 
          ? 'mapbox://styles/mapbox/light-v11'
          : 'mapbox://styles/mapbox/dark-v11',
        center: [viewport.longitude, viewport.latitude],
        zoom: viewport.zoom
      });

      map.current.on('load', () => {
        addMarkersAndRoute();
      });
    }

    return () => {
      // Clean up markers
      if (currentPositionMarkerRef.current) {
        currentPositionMarkerRef.current.remove();
        currentPositionMarkerRef.current = null;
      }
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
        destinationMarkerRef.current = null;
      }
      
      // Clean up map
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
      
      // Re-add sources and layers after style change
      map.current.on('styledata', () => {
        addMarkersAndRoute();
      });
    }
  }, [theme]);

  // Update current position marker when GPS position changes
  useEffect(() => {
    if (map.current && useRealTimeTracking && tracking.currentPosition) {
      updateCurrentPositionMarker();
    }
  }, [tracking.currentPosition, useRealTimeTracking]);

  // Update live tracking path when waypoints change
  useEffect(() => {
    if (map.current && waypoints.length >= 2) {
      updateLiveTrackingPath();
    }
    
    // Also update current position marker if using waypoints
    if (map.current && !useRealTimeTracking && waypoints.length > 0) {
      updateCurrentPositionMarker();
    }
  }, [waypoints, useRealTimeTracking]);

  // Update planned route when it changes
  useEffect(() => {
    if (map.current && plannedRoute.length > 0) {
      addPlannedRoute();
    }
  }, [plannedRoute]);

  const addMarkersAndRoute = () => {
    if (!map.current) return;

    // Add origin marker (starting point)
    if (!originMarkerRef.current) {
      originMarkerRef.current = new mapboxgl.Marker({
        color: '#F5EFE6',
        scale: 0.6
      })
        .setLngLat([origin.lng, origin.lat])
        .addTo(map.current);
    }

    // Add destination marker
    if (!destinationMarkerRef.current) {
      destinationMarkerRef.current = new mapboxgl.Marker({
        color: '#D4A574',
        scale: 0.6
      })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map.current);
    }

    // Add/update current position marker for real-time tracking
    updateCurrentPositionMarker();

    // Add planned route
    addPlannedRoute();
    
    // Add live tracking path if we have waypoints
    if (waypoints.length >= 2) {
      updateLiveTrackingPath();
    }
  };

  const updateCurrentPositionMarker = () => {
    if (!map.current) return;

    // Get current position from real-time tracking or latest waypoint
    let currentLat, currentLng;
    
    if (useRealTimeTracking && tracking.currentPosition) {
      // Use live GPS position
      currentLat = tracking.currentPosition.latitude;
      currentLng = tracking.currentPosition.longitude;
      console.log('Updating marker to GPS position:', currentLat, currentLng);
    } else if (waypoints.length > 0) {
      // Use latest waypoint
      const latest = waypoints[waypoints.length - 1];
      currentLat = latest.lat;
      currentLng = latest.lng;
      console.log('Updating marker to waypoint position:', currentLat, currentLng);
    } else {
      // No position data available
      console.log('No position data available for marker');
      return;
    }

    if (currentPositionMarkerRef.current) {
      // Update existing marker position
      currentPositionMarkerRef.current.setLngLat([currentLng, currentLat]);
    } else {
      // Create standard location pin marker for current position
      currentPositionMarkerRef.current = new mapboxgl.Marker({
        color: '#E2725B',
        scale: 1.0
      })
        .setLngLat([currentLng, currentLat])
        .addTo(map.current);
    }

    // Auto-center map on current position if tracking is active
    if (useRealTimeTracking && tracking.isTracking) {
      map.current.easeTo({
        center: [currentLng, currentLat],
        zoom: 16,
        duration: 800
      });
    }
  };

  const addPlannedRoute = () => {
    if (!map.current || plannedRoute.length === 0) return;

    // Remove existing planned route if it exists
    if (map.current.getSource('planned-route')) {
      map.current.removeLayer('planned-route');
      map.current.removeSource('planned-route');
    }

    // Create planned route data
    const routeData = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: plannedRoute
      }
    };

    // Add planned route source and layer
    map.current.addSource('planned-route', {
      type: 'geojson',
      data: routeData
    });

    map.current.addLayer({
      id: 'planned-route',
      type: 'line',
      source: 'planned-route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#D4A574',
        'line-width': 3,
        'line-opacity': 0.7,
        'line-dasharray': [2, 4]
      }
    });
  };

  const updateLiveTrackingPath = () => {
    if (!map.current || waypoints.length < 2) return;

    // Remove existing live tracking path if it exists
    if (map.current.getSource('live-path')) {
      map.current.removeLayer('live-path');
      map.current.removeSource('live-path');
    }

    // Create live tracking path from waypoints
    const pathData = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: waypoints.map(w => [w.lng, w.lat])
      }
    };

    // Add live tracking path source and layer
    map.current.addSource('live-path', {
      type: 'geojson',
      data: pathData
    });

    map.current.addLayer({
      id: 'live-path',
      type: 'line',
      source: 'live-path',
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
  };

  // Show location permission prompt if needed
  if (showLocationPrompt) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden border border-cream/10 dark:border-cream/10 light:border-ink/10 bg-gradient-to-br from-stone-900 to-stone-800 dark:from-stone-900 dark:to-stone-800 light:from-stone-100 light:to-stone-200"
        style={{ height }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <LocationPermissionPrompt
            onPermissionGranted={() => {
              console.log('Location permission granted');
              setShowLocationPrompt(false);
            }}
            onPermissionDenied={() => {
              console.log('Location permission denied');
              setShowLocationPrompt(false);
            }}
          />
        </div>
      </div>
    );
  }

  // Fallback when no Mapbox token
  if (!MAPBOX_TOKEN) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden border border-cream/10 dark:border-cream/10 light:border-ink/10 bg-gradient-to-br from-stone-900 to-stone-800 dark:from-stone-900 dark:to-stone-800 light:from-stone-100 light:to-stone-200"
        style={{ height }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-terracotta/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-terracotta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-lg tracking-tight mb-2">
                {useRealTimeTracking ? 'Live Tracking Active' : 'Trip Route'}
              </h3>
              <p className="text-sm text-cream/65 dark:text-cream/65 light:text-ink/65">
                {useRealTimeTracking && tracking.isTracking 
                  ? `Tracking active • ${waypoints.length} GPS pings recorded`
                  : `Route from ${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`
                }
              </p>
              {useRealTimeTracking && tracking.isTracking && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Live GPS</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Overlay info */}
        <div className="pointer-events-none absolute top-3 left-3 right-3 flex justify-between text-[10px] uppercase tracking-[0.22em] font-mono text-cream/55 dark:text-cream/55 light:text-ink/55">
          <span>
            {useRealTimeTracking ? (tracking.isTracking ? 'Live tracking' : 'Tracking offline') : 'Route preview'}
          </span>
          <span>
            {waypoints.length} ping{waypoints.length === 1 ? '' : 's'}
          </span>
        </div>
        
        {/* Connection status */}
        {useRealTimeTracking && (tracking.connectionError || tracking.gpsError) && (
          <div className="absolute bottom-3 left-3 right-3 bg-red-500/90 text-white text-xs px-3 py-2 rounded-lg">
            {tracking.connectionError || tracking.gpsError}
          </div>
        )}

        {/* Frame overlay */}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cream/5 dark:ring-cream/5 light:ring-ink/5 rounded-2xl" />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-cream/10 dark:border-cream/10 light:border-ink/10"
      style={{ height }}
    >
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Overlay info */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex justify-between text-[10px] uppercase tracking-[0.22em] font-mono text-cream/55 dark:text-cream/55 light:text-ink/55">
        <span>
          {isLoadingRoute ? 'Calculating route...' : 
           useRealTimeTracking ? (tracking.isTracking ? 'Live tracking' : 'Tracking offline') : 'Route preview'}
        </span>
        <span>
          {plannedRoute.length > 0 && `${Math.round(plannedRoute.length / 100)}km route • `}
          {waypoints.length} ping{waypoints.length === 1 ? '' : 's'}
          {useRealTimeTracking && tracking.isTracking && (
            <span className="ml-2 inline-block h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
          )}
        </span>
      </div>
      
      {/* Connection status */}
      {useRealTimeTracking && (tracking.connectionError || tracking.gpsError) && (
        <div className="absolute bottom-3 left-3 right-3 bg-red-500/90 text-white text-xs px-3 py-2 rounded-lg">
          {tracking.connectionError || tracking.gpsError}
        </div>
      )}

      {/* Frame overlay */}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cream/5 dark:ring-cream/5 light:ring-ink/5 rounded-2xl" />
    </div>
  );
}