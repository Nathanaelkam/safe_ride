import type { Trip, Driver, User } from '@/types';

/**
 * Lightweight mock API surface.
 * In production these would hit the Seva backend (Supabase / custom Node service).
 * Mocked here so the UI is fully demoable offline.
 */

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export const api = {
  async login(_email: string, _password: string): Promise<User> {
    await sleep(400);
    return mockUser();
  },
  async register(payload: { fullName: string; email: string; phone: string; password: string }): Promise<User> {
    await sleep(500);
    return { ...mockUser(), fullName: payload.fullName, email: payload.email, phone: payload.phone };
  },
  async fetchActiveTrip(): Promise<Trip | null> {
    await sleep(250);
    return mockActiveTrip();
  },
  async fetchHistory(): Promise<Trip[]> {
    await sleep(250);
    return mockHistory();
  },
  async triggerSOS(tripId: string): Promise<{ ok: true; notified: number }> {
    await sleep(300);
    return { ok: true, notified: 3 };
  },
};

function mockUser(): User {
  return {
    id: 'u_001',
    fullName: 'Amara Nkeng',
    email: 'amara@example.cm',
    phone: '+237 670 112 880',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 87,
    voiceCodeword: 'lavender',
    emergencyContacts: [
      { id: 'c1', name: 'Sister Bih', relation: 'Sister', phone: '+237 677 442 199', isPrimary: true },
      { id: 'c2', name: 'Mama Florence', relation: 'Mother', phone: '+237 699 008 312' },
      { id: 'c3', name: 'Tanto Eric', relation: 'Uncle', phone: '+237 651 220 904' },
    ],
  };
}

function mockDriver(): Driver {
  return {
    id: 'd_44',
    name: 'Jean-Paul Tchoumi',
    rating: 4.92,
    yearsActive: 6,
    tripsCompleted: 2148,
    verified: true,
    vehicle: { make: 'Toyota', model: 'Corolla 2018', plate: 'CE 480 EH', color: 'Pearl white' },
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&q=80&auto=format&fit=crop',
  };
}

function mockActiveTrip(): Trip | null {
  // Return null to show the planning flow
  // Uncomment the return statement below to simulate an active trip
  return null;
  
  // const now = Date.now();
  // return {
  //   id: 't_active',
  //   status: 'active',
  //   startedAt: now - 11 * 60_000,
  //   origin: { label: 'Bastos, Yaoundé', lat: 3.8867, lng: 11.5226 },
  //   destination: { label: 'Mvog-Ada, Yaoundé', lat: 3.8534, lng: 11.5128 },
  //   driver: mockDriver(),
  //   waypoints: [
  //     { lat: 3.8867, lng: 11.5226, timestamp: now - 11 * 60_000, label: 'Pickup' },
  //     { lat: 3.8801, lng: 11.5198, timestamp: now - 7 * 60_000 },
  //     { lat: 3.8702, lng: 11.5172, timestamp: now - 3 * 60_000 },
  //     { lat: 3.8634, lng: 11.5149, timestamp: now - 30_000, label: 'Current' },
  //   ],
  // };
}

function mockHistory(): Trip[] {
  const day = 86_400_000;
  const base = Date.now();
  return [
    {
      id: 't_201',
      status: 'completed',
      startedAt: base - 2 * day,
      endedAt: base - 2 * day + 23 * 60_000,
      origin: { label: 'Bonapriso, Douala', lat: 4.0383, lng: 9.7011 },
      destination: { label: 'Akwa, Douala', lat: 4.0468, lng: 9.7045 },
      driver: { ...mockDriver(), name: 'Marie Eyenga', rating: 4.88 },
      waypoints: [],
      fare: 2500,
    },
    {
      id: 't_198',
      status: 'completed',
      startedAt: base - 5 * day,
      endedAt: base - 5 * day + 17 * 60_000,
      origin: { label: 'Nlongkak, Yaoundé', lat: 3.8901, lng: 11.5311 },
      destination: { label: 'Centre-ville, Yaoundé', lat: 3.8665, lng: 11.5174 },
      driver: { ...mockDriver(), name: 'Paul Atangana', rating: 4.71 },
      waypoints: [],
      fare: 1800,
    },
    {
      id: 't_188',
      status: 'completed',
      startedAt: base - 9 * day,
      endedAt: base - 9 * day + 41 * 60_000,
      origin: { label: 'Bafoussam Centre', lat: 5.4781, lng: 10.4179 },
      destination: { label: 'Marché A, Bafoussam', lat: 5.4651, lng: 10.4159 },
      driver: { ...mockDriver(), name: 'Bertille Fotso', rating: 4.95 },
      waypoints: [],
      fare: 1200,
    },
    {
      id: 't_181',
      status: 'completed',
      startedAt: base - 14 * day,
      endedAt: base - 14 * day + 31 * 60_000,
      origin: { label: 'Bonamoussadi, Douala', lat: 4.0989, lng: 9.7385 },
      destination: { label: 'Bonanjo, Douala', lat: 4.0512, lng: 9.6919 },
      driver: { ...mockDriver(), name: 'Jean-Paul Tchoumi', rating: 4.92 },
      waypoints: [],
      fare: 3100,
    },
  ];
}
