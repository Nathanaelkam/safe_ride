'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTripTracking } from '@/hooks/useTripTracking';
import type { TripWaypoint } from '@/types';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), { ssr: false });

interface TrackingMapProps {
  waypoints?: TripWaypoint[];
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  height?: string;
  useRealTimeTracking?: boolean;
}

export function TrackingMap({ 
  waypoints: propWaypoints, 
  origin: propOrigin, 
  destination: propDestination, 
  height = '420px',
  useRealTimeTracking = false 
}: TrackingMapProps) {
  const { theme } = useTheme();
  const tracking = useTripTracking();
  
  useEffect(() => {
    // Import Leaflet CSS dynamically to ensure it's loaded
    import('leaflet/dist/leaflet.css');
  }, []);

  // Use real-time data if enabled and available, otherwise use props
  const waypoints = useRealTimeTracking ? tracking.waypoints : (propWaypoints || []);
  const origin = useRealTimeTracking && tracking.currentPosition 
    ? { lat: tracking.currentPosition.latitude, lng: tracking.currentPosition.longitude }
    : (propOrigin || { lat: 0, lng: 0 });
  const destination = propDestination || { lat: 0, lng: 0 };

  const center = useMemo<[number, number]>(() => {
    if (waypoints.length > 0) {
      const last = waypoints[waypoints.length - 1];
      return [last.lat, last.lng];
    }
    return [origin.lat, origin.lng];
  }, [waypoints, origin]);

  const pathLatLngs: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);
  
  // Theme-aware tile layer URL
  const tileUrl = theme === 'light' 
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-cream/10 dark:border-cream/10 light:border-ink/10"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        key={theme} // Force re-render when theme changes
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={tileUrl}
        />

        {pathLatLngs.length >= 2 && (
          <Polyline
            positions={pathLatLngs}
            pathOptions={{ color: '#E2725B', weight: 3, opacity: 0.85, dashArray: '4 8' }}
          />
        )}

        <CircleMarker
          center={[origin.lat, origin.lng]}
          radius={7}
          pathOptions={{ color: '#F5EFE6', weight: 2, fillColor: '#F5EFE6', fillOpacity: 1 }}
        />
        <CircleMarker
          center={[destination.lat, destination.lng]}
          radius={7}
          pathOptions={{ color: '#D4A574', weight: 2, fillColor: '#D4A574', fillOpacity: 1 }}
        />
        {waypoints.length > 0 && (
          <CircleMarker
            center={[waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng]}
            radius={9}
            pathOptions={{ color: '#E2725B', weight: 3, fillColor: '#E2725B', fillOpacity: 0.85 }}
          />
        )}
      </MapContainer>

      {/* Overlay frame for editorial polish */}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cream/5 dark:ring-cream/5 light:ring-ink/5 rounded-2xl" />
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex justify-between text-[10px] uppercase tracking-[0.22em] font-mono text-cream/55 dark:text-cream/55 light:text-ink/55">
        <span>
          {useRealTimeTracking ? (tracking.isTracking ? 'Live tracking' : 'Tracking offline') : 'Route preview'}
        </span>
        <span>
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
    </div>
  );
}
