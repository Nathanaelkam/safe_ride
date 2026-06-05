# Backend Integration Guide - Seva PWA

## Overview
This guide provides step-by-step instructions to connect the Seva PWA frontend to the backend services and remove all mock data.

## Current Architecture

### Backend Services (Docker)
- **Auth Service**: Port 8001 - User authentication and emergency contacts
- **Tracking Service**: Port 8002 - Trip management and real-time tracking
- **Emergency Service**: Port 8003 - SOS/panic button functionality
- **Notification Service**: Port 8005 - Emergency notifications
- **Route Analysis Service**: Port 8004 - Route analysis and monitoring

### Frontend Mock Data Locations
- `src/services/api.ts` - All API calls are mocked
- `src/components/trip/DestinationSearch.tsx` - Static destination list
- `src/app/(dashboard)/trip/page.tsx` - Mock trip creation

## Step-by-Step Integration

### Step 1: Environment Configuration

Create environment variables for backend URLs:

```bash
# .env.local
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:8001
NEXT_PUBLIC_TRACKING_SERVICE_URL=http://localhost:8002
NEXT_PUBLIC_EMERGENCY_SERVICE_URL=http://localhost:8003
NEXT_PUBLIC_WS_URL=ws://localhost:8002
```

### Step 2: Start Backend Services

```bash
cd ../backend
docker-compose up -d
```

Verify services are running:
- Auth: http://localhost:8001/health
- Tracking: http://localhost:8002/health
- Emergency: http://localhost:8003/health

### Step 3: Install Required Dependencies

```bash
npm install axios
# or if using fetch, no additional dependencies needed
```

### Step 4: Create Real API Service Layer

Replace `src/services/api.ts` with actual backend calls:

```typescript
// src/services/api.ts
const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:8001';
const TRACKING_BASE = process.env.NEXT_PUBLIC_TRACKING_SERVICE_URL || 'http://localhost:8002';
const EMERGENCY_BASE = process.env.NEXT_PUBLIC_EMERGENCY_SERVICE_URL || 'http://localhost:8003';

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  // Auth endpoints
  async login(phone_number: string, password: string) {
    const response = await fetch(`${AUTH_BASE}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ phone_number, password }),
    });
    return response.json();
  }

  async register(payload: {
    full_name: string;
    phone_number: string;
    password: string;
  }) {
    const response = await fetch(`${AUTH_BASE}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  // Trip endpoints
  async startTrip() {
    const response = await fetch(`${TRACKING_BASE}/trips/start`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async completeTrip(tripId: string) {
    const response = await fetch(`${TRACKING_BASE}/trips/${tripId}/complete`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return response.json();
  }

  // Emergency endpoints
  async triggerPanic(payload: {
    user_id: string;
    trip_id?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const response = await fetch(`${EMERGENCY_BASE}/emergency/panic`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  async triggerVoiceSOS(payload: {
    user_id: string;
    transcript: string;
    trip_id?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const response = await fetch(`${EMERGENCY_BASE}/emergency/voice`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return response.json();
  }
}

export const api = new ApiService();
```

### Step 5: Update Authentication Flow

Update auth store to use real tokens:

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (phone: string, password: string) => {
        const response = await api.login(phone, password);
        api.setToken(response.access_token);
        set({ 
          token: response.access_token,
          user: response.user // Assuming backend returns user data
        });
      },
      register: async (data) => {
        const response = await api.register(data);
        api.setToken(response.access_token);
        set({ 
          token: response.access_token,
          user: response.user
        });
      },
      logout: () => {
        api.setToken('');
        set({ user: null, token: null });
      },
    }),
    { name: 'auth-storage' }
  )
);
```

### Step 6: Replace Mock Destinations

Replace the static destinations in `DestinationSearch.tsx`:

```typescript
// Create a new service for places/geocoding
// src/services/places.ts
export async function searchPlaces(query: string): Promise<Destination[]> {
  // Option 1: Use Mapbox Geocoding API
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=CM&proximity=11.5167,3.8667`
  );
  const data = await response.json();
  
  return data.features.map((feature: any) => ({
    id: feature.id,
    label: feature.place_name,
    address: feature.place_name,
    lat: feature.center[1],
    lng: feature.center[0],
  }));
}
```

### Step 7: WebSocket Integration for Real-Time Tracking

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';

export function useWebSocket(url: string, onMessage: (data: any) => void) {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(url);
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    return () => {
      ws.current?.close();
    };
  }, [url, onMessage]);

  const sendMessage = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { sendMessage };
}
```

### Step 8: Update Trip Management

Remove mock trip creation in trip page:

```typescript
// src/app/(dashboard)/trip/page.tsx
const handleStartTrip = async () => {
  if (plannedDestination && user) {
    try {
      const trip = await api.startTrip();
      setActiveTrip(trip);
      startTrip();
    } catch (error) {
      console.error('Failed to start trip:', error);
    }
  }
};
```

### Step 9: Update Emergency Functions

Replace mock SOS with real emergency calls:

```typescript
// In trip page or SOS component
const handleSOS = async () => {
  if (!trip || !user) return;
  
  const position = await getCurrentPosition(); // Implement geolocation
  
  try {
    await api.triggerPanic({
      user_id: user.id,
      trip_id: trip.id,
      latitude: position.latitude,
      longitude: position.longitude,
    });
    
    triggerSOS(); // Update local state
  } catch (error) {
    console.error('Failed to trigger SOS:', error);
  }
};
```

### Step 10: Error Handling and Loading States

Add proper error boundaries and loading states:

```typescript
// src/components/common/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please try again.</div>;
    }

    return this.props.children;
  }
}
```

### Step 11: Testing the Integration

1. **Start Backend Services**:
   ```bash
   cd backend && docker-compose up -d
   ```

2. **Start Frontend**:
   ```bash
   cd frontend/seva-pwa && npm run dev
   ```

3. **Test Authentication**:
   - Register a new user
   - Login with credentials
   - Verify token storage

4. **Test Trip Flow**:
   - Start a new trip
   - Verify real-time updates
   - Complete trip

5. **Test Emergency**:
   - Trigger SOS button
   - Verify backend receives the alert

### Step 12: Remove All Mock Data

Files to update:
- [x] `src/services/api.ts` - Replace with real API calls
- [x] `src/components/trip/DestinationSearch.tsx` - Use real geocoding
- [x] `src/app/(dashboard)/trip/page.tsx` - Remove mock trip creation
- [x] `src/app/(dashboard)/history/page.tsx` - Fetch real trip history
- [x] `src/hooks/useEmergencyContacts.ts` - Fetch real contacts

### Step 13: Production Considerations

1. **Environment Variables**:
   ```bash
   # .env.production
   NEXT_PUBLIC_AUTH_SERVICE_URL=https://api.seva.cm/auth
   NEXT_PUBLIC_TRACKING_SERVICE_URL=https://api.seva.cm/tracking
   NEXT_PUBLIC_EMERGENCY_SERVICE_URL=https://api.seva.cm/emergency
   ```

2. **CORS Configuration**: Ensure backend allows frontend domain

3. **SSL/TLS**: Use HTTPS for production

4. **Rate Limiting**: Implement on backend

5. **Error Monitoring**: Add Sentry or similar

## Troubleshooting

### Common Issues

1. **CORS Errors**: 
   - Add frontend URL to backend CORS settings
   - Use proxy in development

2. **WebSocket Connection Failed**:
   - Check firewall settings
   - Verify WebSocket endpoint

3. **Authentication Errors**:
   - Check token expiration
   - Verify JWT secret consistency

4. **Database Connection Issues**:
   - Ensure PostgreSQL is running
   - Check connection strings

### Development Proxy Setup

For development, add to `next.config.js`:

```javascript
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:8001/:path*',
      },
      {
        source: '/api/tracking/:path*',
        destination: 'http://localhost:8002/:path*',
      },
      {
        source: '/api/emergency/:path*',
        destination: 'http://localhost:8003/:path*',
      },
    ];
  },
};
```

This guide provides a complete path from mock data to real backend integration. Follow the steps sequentially and test each component before moving to the next.