'use client';
import { create } from 'zustand';
import type { Trip, BackendTripResponse } from '@/types';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

interface Destination {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

type TripPhase = 'planning' | 'active' | 'completed';

interface TripState {
  phase: TripPhase;
  activeTrip: Trip | null;
  plannedDestination: Destination | null;
  sosActive: boolean;
  shareToken: string | null;
  isLoading: boolean;
  error: string | null;
  setPhase: (phase: TripPhase) => void;
  setPlannedDestination: (destination: Destination | null) => void;
  setActiveTrip: (trip: Trip | null) => void;
  startTrip: () => Promise<void>;
  endTrip: () => Promise<void>;
  shareTrip: () => Promise<string | null>;
  triggerSOS: () => void;
  resolveSOS: () => void;
  setError: (error: string | null) => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  phase: 'planning',
  activeTrip: null,
  plannedDestination: null,
  sosActive: false,
  shareToken: null,
  isLoading: false,
  error: null,
  setPhase: (phase) => set({ phase }),
  setPlannedDestination: (destination) => set({ plannedDestination: destination }),
  setActiveTrip: (trip) => set({ activeTrip: trip }),
  setError: (error) => set({ error }),
  
  startTrip: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Ensure API has current token
      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('No authentication token available');
      }
      api.setToken(token);
      
      const backendTrip = await api.startTrip();
      
      // Convert backend response to frontend Trip format
      const { plannedDestination } = get();
      const trip: Trip = {
        id: backendTrip.id,
        status: 'active',
        startedAt: new Date(backendTrip.started_at).getTime(),
        origin: { 
          label: 'Current Location', 
          lat: 0, // Will be updated with actual GPS
          lng: 0 
        },
        destination: plannedDestination ? {
          label: plannedDestination.label,
          lat: plannedDestination.lat,
          lng: plannedDestination.lng
        } : { label: 'Unknown', lat: 0, lng: 0 },
        waypoints: []
      };
      
      set({ 
        phase: 'active', 
        activeTrip: trip,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to start trip:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to start trip',
        isLoading: false 
      });
    }
  },
  
  endTrip: async () => {
    const { activeTrip } = get();
    if (!activeTrip) return;
    
    try {
      set({ isLoading: true, error: null });
      
      // Ensure API has current token
      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('No authentication token available');
      }
      api.setToken(token);
      
      await api.completeTrip(activeTrip.id);
      set({ 
        phase: 'completed', 
        activeTrip: null, 
        plannedDestination: null,
        shareToken: null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to complete trip:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to complete trip',
        isLoading: false 
      });
    }
  },
  
  shareTrip: async () => {
    const { activeTrip } = get();
    if (!activeTrip) return null;
    
    try {
      // Ensure API has current token
      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('No authentication token available');
      }
      api.setToken(token);
      
      const shareResponse = await api.shareTrip(activeTrip.id);
      set({ shareToken: shareResponse.share_token });
      return shareResponse.share_token;
    } catch (error) {
      console.error('Failed to share trip:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to share trip' });
      return null;
    }
  },
  
  triggerSOS: () => set({ sosActive: true }),
  resolveSOS: () => set({ sosActive: false }),
}));
