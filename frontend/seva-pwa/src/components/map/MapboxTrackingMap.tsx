'use client';
import { useMemo } from 'react';
import { Map, Marker, Source, Layer } from 'react-map-gl';
import { useTheme } from '@/contexts/ThemeContext';
import type { TripWaypoint } from '@/types';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxTrackingMapProps {
  waypoints: TripWaypoint[];
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  height?: string;
}

// You'll need to get a free Mapbox token from https://www.mapbox.com/
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGZ4eHh4eHgifQ.xxxxxxxxxxxxxxxxxxxxxxxx';

export function MapboxTrackingMap({ waypoints, origin, destination, height = '420px' }: MapboxTrackingMapProps) {
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

  // Create GeoJSON for the traveled path
  const pathData = useMemo(() => {
    if (waypoints.length < 2) return null;
    
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: waypoints.map(w => [w.lng, w.lat])
      }
    };
  }, [waypoints]);

  // Map style based on theme
  const mapStyle = theme === 'light' 
    ? 'mapbox://styles/mapbox/light-v11'
    : 'mapbox://styles/mapbox/dark-v11';

  // Path line layer style
  const pathLayerStyle = {
    id: 'path',
    type: 'line' as const,
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
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-cream/10 dark:border-cream/10 light:border-ink/10"
      style={{ height }}
    >
      <Map
        {...viewport}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        interactive={true}
        scrollZoom={true}
        dragPan={true}
        dragRotate={false}
        pitchWithRotate={false}
      >
        {/* Traveled path */}
        {pathData && (
          <Source id="path-source" type="geojson" data={pathData}>
            <Layer {...pathLayerStyle} />
          </Source>
        )}

        {/* Origin marker */}
        <Marker
          longitude={origin.lng}
          latitude={origin.lat}
          anchor="center"
        >
          <div className="h-4 w-4 rounded-full bg-cream border-2 border-cream shadow-lg"></div>
        </Marker>

        {/* Destination marker */}
        <Marker
          longitude={destination.lng}
          latitude={destination.lat}
          anchor="center"
        >
          <div className="h-4 w-4 rounded-full bg-ochre border-2 border-cream shadow-lg"></div>
        </Marker>

        {/* Current position (last waypoint) */}
        {waypoints.length > 0 && (
          <Marker
            longitude={waypoints[waypoints.length - 1].lng}
            latitude={waypoints[waypoints.length - 1].lat}
            anchor="center"
          >
            <div className="relative">
              <div className="h-5 w-5 rounded-full bg-terracotta border-3 border-white shadow-lg animate-pulse"></div>
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-terracotta/30 animate-ping"></div>
            </div>
          </Marker>
        )}
      </Map>

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