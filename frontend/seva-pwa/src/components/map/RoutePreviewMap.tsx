'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), { ssr: false });

interface Destination {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

interface RoutePreviewMapProps {
  destination: Destination;
  currentLocation?: { lat: number; lng: number };
  height?: string;
}

export function RoutePreviewMap({ 
  destination, 
  currentLocation = { lat: 3.8667, lng: 11.5167 }, // Default to Yaoundé center
  height = '300px' 
}: RoutePreviewMapProps) {
  const { theme } = useTheme();
  
  useEffect(() => {
    // Import Leaflet CSS dynamically to ensure it's loaded
    import('leaflet/dist/leaflet.css');
  }, []);

  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);

  // Fetch real route from OpenStreetMap routing service
  useEffect(() => {
    const fetchRoute = async () => {
      setIsLoadingRoute(true);
      try {
        // Using OSRM (Open Source Routing Machine) - free, no API key required
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${currentLocation.lng},${currentLocation.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
        );
        
        if (!response.ok) {
          throw new Error('Routing service unavailable');
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates;
          
          // Convert [lng, lat] to [lat, lng] for Leaflet
          const leafletCoords: [number, number][] = coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]]
          );
          
          setRoutePath(leafletCoords);
          setRouteDistance(data.routes[0].distance / 1000); // Convert to km
        } else {
          throw new Error('No route found');
        }
      } catch (error) {
        console.warn('Failed to fetch route, using fallback:', error);
        // Fallback to simple interpolation if routing service fails
        const start = [currentLocation.lat, currentLocation.lng] as [number, number];
        const end = [destination.lat, destination.lng] as [number, number];
        
        const points: [number, number][] = [start];
        const steps = 8;
        
        for (let i = 1; i <= steps; i++) {
          const ratio = i / (steps + 1);
          const lat = start[0] + (end[0] - start[0]) * ratio;
          const lng = start[1] + (end[1] - start[1]) * ratio;
          points.push([lat, lng]);
        }
        
        points.push(end);
        setRoutePath(points);
        setRouteDistance(calculateDistance(currentLocation, destination));
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [currentLocation, destination]);

  // Calculate center point and zoom level
  const { center, zoom } = useMemo(() => {
    const lats = [currentLocation.lat, destination.lat];
    const lngs = [currentLocation.lng, destination.lng];
    
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    
    // Calculate distance to determine zoom level
    const latDiff = Math.abs(destination.lat - currentLocation.lat);
    const lngDiff = Math.abs(destination.lng - currentLocation.lng);
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoomLevel = 14;
    if (maxDiff > 0.1) zoomLevel = 11;
    else if (maxDiff > 0.05) zoomLevel = 12;
    else if (maxDiff > 0.02) zoomLevel = 13;
    
    return {
      center: [centerLat, centerLng] as [number, number],
      zoom: zoomLevel
    };
  }, [currentLocation, destination]);
  
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
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        key={theme} // Force re-render when theme changes
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={tileUrl}
        />

        {/* Route path */}
        <Polyline
          positions={routePath}
          pathOptions={{ 
            color: '#E2725B', 
            weight: 4, 
            opacity: 0.8, 
            dashArray: '8 12',
            lineCap: 'round' 
          }}
        />

        {/* Current location marker */}
        <CircleMarker
          center={[currentLocation.lat, currentLocation.lng]}
          radius={8}
          pathOptions={{ 
            color: '#F5EFE6', 
            weight: 3, 
            fillColor: '#E2725B', 
            fillOpacity: 1 
          }}
        />
        
        {/* Destination marker */}
        <CircleMarker
          center={[destination.lat, destination.lng]}
          radius={8}
          pathOptions={{ 
            color: '#F5EFE6', 
            weight: 3, 
            fillColor: '#D4A574', 
            fillOpacity: 1 
          }}
        />
      </MapContainer>

      {/* Overlay frame for editorial polish */}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cream/5 dark:ring-cream/5 light:ring-ink/5 rounded-2xl" />
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex justify-between text-[10px] uppercase tracking-[0.22em] font-mono text-cream/55 dark:text-cream/55 light:text-ink/55">
        <span>{isLoadingRoute ? 'Loading route...' : 'Route preview'}</span>
        <span>{isLoadingRoute ? '...' : `~${Math.round(routeDistance * 10) / 10} km`}</span>
      </div>
      
      {isLoadingRoute && (
        <div className="absolute inset-0 bg-ink/20 dark:bg-ink/20 light:bg-white/20 backdrop-blur-sm flex items-center justify-center rounded-2xl">
          <div className="h-6 w-6 border-2 border-terracotta/30 border-t-terracotta rounded-full animate-spin"></div>
        </div>
      )}
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