import { useEffect, useRef, useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { TrackingWebSocket } from '@/services/websocket';
import { useTripStore } from '@/store/tripStore';
import { useAuthStore } from '@/store/authStore';
import type { TripWaypoint } from '@/types';

interface UseTripTrackingOptions {
  sendInterval?: number; // How often to send GPS pings (ms)
  highAccuracy?: boolean;
}

export function useTripTracking(options: UseTripTrackingOptions = {}) {
  const { sendInterval = 5000, highAccuracy = true } = options;
  const { activeTrip, phase } = useTripStore();
  const { token } = useAuthStore();
  const { position, error: gpsError, isSupported } = useGeolocation({
    enableHighAccuracy: highAccuracy,
    timeout: 10000,
    maximumAge: 1000
  });

  const [isTracking, setIsTracking] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<TripWaypoint[]>([]);
  
  const wsRef = useRef<TrackingWebSocket | null>(null);
  const sendIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket connection when trip becomes active
  useEffect(() => {
    console.log('useTripTracking effect:', { 
      phase, 
      hasActiveTrip: !!activeTrip, 
      hasToken: !!token, 
      isSupported,
      gpsError,
      position: position ? `${position.latitude}, ${position.longitude}` : null
    });
    
    if (phase === 'active' && activeTrip && token && isSupported) {
      // Ensure API service has the token for any API calls
      import('@/services/api').then(({ api }) => {
        api.setToken(token);
      });
      console.log('Initializing tracking for trip:', activeTrip.id);
      initializeTracking();
    } else {
      console.log('Stopping tracking - conditions not met');
      stopTracking();
    }

    return () => stopTracking();
  }, [phase, activeTrip, token, isSupported]);

  // Send GPS updates at regular intervals
  useEffect(() => {
    if (isTracking && position && wsRef.current?.isConnected()) {
      // Send initial location immediately
      sendCurrentLocation();
      
      // Set up interval for regular updates
      sendIntervalRef.current = setInterval(() => {
        sendCurrentLocation();
      }, sendInterval);
    } else {
      // Clear interval if tracking stopped or no position
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
        sendIntervalRef.current = null;
      }
    }

    return () => {
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
      }
    };
  }, [isTracking, position, sendInterval]);

  const initializeTracking = () => {
    if (!activeTrip || !token) {
      console.log('Cannot initialize tracking - missing activeTrip or token');
      return;
    }

    console.log('Creating TrackingWebSocket for trip:', activeTrip.id);

    try {
      wsRef.current = new TrackingWebSocket({
        tripId: activeTrip.id,
        accessToken: token,
        onConnect: () => {
          console.log('Trip tracking connected successfully');
          setIsTracking(true);
          setConnectionError(null);
        },
        onDisconnect: () => {
          console.log('Trip tracking disconnected');
          setIsTracking(false);
        },
        onError: (error) => {
          console.error('Trip tracking error:', error);
          setConnectionError('Failed to connect to tracking service');
          setIsTracking(false);
        },
        onLocationUpdate: (waypoint) => {
          console.log('Received location update:', waypoint);
          // Handle incoming waypoints (for multi-user scenarios)
          setWaypoints(prev => [...prev, waypoint]);
        }
      });

      console.log('Starting WebSocket connection...');
      wsRef.current.connect();
    } catch (error) {
      console.error('Failed to initialize trip tracking:', error);
      setConnectionError('Failed to initialize tracking');
    }
  };

  const sendCurrentLocation = () => {
    if (!position) {
      console.log('No GPS position available');
      return;
    }
    
    if (!wsRef.current?.isConnected()) {
      console.log('WebSocket not connected, cannot send location');
      return;
    }

    console.log('Sending location:', position.latitude, position.longitude);

    try {
      wsRef.current.sendLocation(position.latitude, position.longitude);
      
      // Add waypoint to local state
      const waypoint: TripWaypoint = {
        lat: position.latitude,
        lng: position.longitude,
        timestamp: Date.now()
      };
      
      setWaypoints(prev => {
        // Avoid duplicates by checking if the last waypoint is very close
        const lastWaypoint = prev[prev.length - 1];
        if (lastWaypoint) {
          const distance = calculateDistance(
            lastWaypoint.lat, lastWaypoint.lng,
            waypoint.lat, waypoint.lng
          );
          // Only add if moved more than 10 meters
          if (distance > 0.01) {
            console.log('Added new waypoint:', waypoint);
            return [...prev, waypoint];
          }
          console.log('Skipping waypoint - too close to previous');
          return prev;
        }
        console.log('Added first waypoint:', waypoint);
        return [...prev, waypoint];
      });
    } catch (error) {
      console.error('Failed to send location:', error);
    }
  };

  const stopTracking = () => {
    setIsTracking(false);
    setConnectionError(null);
    setWaypoints([]);
    
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
  };

  const getShareableLink = (): string | null => {
    const { shareToken } = useTripStore.getState();
    if (!activeTrip || !shareToken) return null;
    
    // Construct the shareable link as per backend specification
    const baseUrl = window.location.origin;
    return `${baseUrl}/view.html?trip=${activeTrip.id}&token=${shareToken}`;
  };

  return {
    isTracking,
    waypoints,
    currentPosition: position,
    connectionError,
    gpsError,
    isGpsSupported: isSupported,
    getShareableLink,
    sendCurrentLocation,
    stopTracking
  };
}

// Helper function to calculate distance between two GPS points (in km)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}