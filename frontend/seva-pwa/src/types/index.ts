export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  isPrimary?: boolean;
}

export interface Driver {
  id: string;
  name: string;
  rating: number;
  vehicle: { make: string; model: string; plate: string; color: string };
  photoUrl?: string;
  yearsActive: number;
  tripsCompleted: number;
  verified: boolean;
}

export interface TripWaypoint {
  lat: number;
  lng: number;
  timestamp: number;
  label?: string;
}

export type TripStatus = 'idle' | 'requested' | 'active' | 'completed' | 'sos';

export interface Trip {
  id: string;
  status: TripStatus;
  startedAt: number;
  endedAt?: number;
  origin: { label: string; lat: number; lng: number };
  destination: { label: string; lat: number; lng: number };
  driver?: Driver;
  waypoints: TripWaypoint[];
  fare?: number;
  watchersNotified?: string[];
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  emergencyContacts: EmergencyContact[];
  voiceCodeword?: string;
  joinedAt: number;
}

// Backend trip response structure
export interface BackendTripResponse {
  id: string;
  passenger_id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'SOS_TRACKED';
  started_at: string;
  completed_at?: string;
}
