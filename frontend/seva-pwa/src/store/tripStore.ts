'use client';
import { create } from 'zustand';
import type { Trip } from '@/types';

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
  setPhase: (phase: TripPhase) => void;
  setPlannedDestination: (destination: Destination | null) => void;
  setActiveTrip: (trip: Trip | null) => void;
  startTrip: () => void;
  endTrip: () => void;
  triggerSOS: () => void;
  resolveSOS: () => void;
}

export const useTripStore = create<TripState>((set) => ({
  phase: 'planning',
  activeTrip: null,
  plannedDestination: null,
  sosActive: false,
  setPhase: (phase) => set({ phase }),
  setPlannedDestination: (destination) => set({ plannedDestination: destination }),
  setActiveTrip: (trip) => set({ activeTrip: trip }),
  startTrip: () => set({ phase: 'active' }),
  endTrip: () => set({ phase: 'completed', activeTrip: null, plannedDestination: null }),
  triggerSOS: () => set({ sosActive: true }),
  resolveSOS: () => set({ sosActive: false }),
}));
