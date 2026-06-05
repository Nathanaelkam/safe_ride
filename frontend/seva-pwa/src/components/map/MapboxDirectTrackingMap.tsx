'use client';
import { useEffect, useRef, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { useTheme } from '@/contexts/ThemeContext';
import type { TripWaypoint } from '@/types';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxDirectTrackingMapProps {
  waypoints: TripWaypoint[];
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  height?: string;
}

// You'll need to get a free Mapbox token from https://www.mapbox.com/
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGZ4eHh4eHgifQ.xxxxxxxxxxxxxxxxxxxxxxxx';

export function MapboxDirectTrackingMap({ waypoints, origin, destination, height = '420px' }: MapboxDirectTrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { theme } = useTheme();

  // Calculate center point and zoom
  const viewport = useMemo(() => {
    if (waypoints.length > 0) {
      const last = waypoints[waypoints.length - 1];
      return {
        longitude: last.lng,
        latitude: last.lat,
        zoom: 14
      };
    }
    return {
      longitude: origin.lng,
      latitude: origin.lat,
      zoom: 14
    };
  }, [waypoints, origin]);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    if (mapContainer.current) {
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
        addMarkersAndPath();
      });
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
      
      // Re-add sources and layers after style change
      map.current.on('styledata', () => {
        addMarkersAndPath();
      });
    }
  }, [theme]);

  // Update map center when waypoints change
  useEffect(() => {
    if (map.current && waypoints.length > 0) {
      const last = waypoints[waypoints.length - 1];
      map.current.setCenter([last.lng, last.lat]);
      updatePath();
    }
  }, [waypoints]);

  const addMarkersAndPath = () => {
    if (!map.current) return;

    // Add origin marker
    new mapboxgl.Marker({
      color: '#F5EFE6',
      scale: 0.6
    })
      .setLngLat([origin.lng, origin.lat])
      .addTo(map.current);

    // Add destination marker
    new mapboxgl.Marker({
      color: '#D4A574',
      scale: 0.6
    })
      .setLngLat([destination.lng, destination.lat])
      .addTo(map.current);

    // Add current position marker if waypoints exist
    if (waypoints.length > 0) {
      const currentPos = waypoints[waypoints.length - 1];
      new mapboxgl.Marker({
        color: '#E2725B',
        scale: 0.8
      })
        .setLngLat([currentPos.lng, currentPos.lat])
        .addTo(map.current);
    }

    updatePath();
  };

  const updatePath = () => {
    if (!map.current || waypoints.length < 2) return;

    // Remove existing path if it exists
    if (map.current.getSource('path')) {
      map.current.removeLayer('path');
      map.current.removeSource('path');
    }

    // Create path from waypoints
    const pathData = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: waypoints.map(w => [w.lng, w.lat])
      }
    };

    // Add path source and layer
    map.current.addSource('path', {
      type: 'geojson',
      data: pathData
    });

    map.current.addLayer({
      id: 'path',
      type: 'line',
      source: 'path',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#E2725B',
        'line-width': 3,
        'line-opacity': 0.85,
        'line-dasharray': [4, 8]
      }
    });
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-cream/10 dark:border-cream/10 light:border-ink/10"
      style={{ height }}
    >
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Overlay info */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex justify-between text-[10px] uppercase tracking-[0.22em] font-mono text-cream/55 dark:text-cream/55 light:text-ink/55">
        <span>Live route</span>
        <span>{waypoints.length} ping{waypoints.length === 1 ? '' : 's'}</span>
      </div>

      {/* Frame overlay */}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cream/5 dark:ring-cream/5 light:ring-ink/5 rounded-2xl" />
    </div>
  );
}