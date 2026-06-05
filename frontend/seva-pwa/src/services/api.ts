import type { Trip, Driver, User } from '@/types';

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

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Error: ${response.status} ${errorData}`);
    }
    return response.json();
  }

  async login(phoneNumber: string, password: string): Promise<{ access_token: string; refresh_token: string; user: User }> {
    const response = await fetch(`${AUTH_BASE}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ phone_number: phoneNumber, password }),
    });
    return this.handleResponse(response);
  }

  async register(payload: { 
    full_name: string; 
    phone_number: string; 
    password: string; 
  }): Promise<{ access_token: string; refresh_token: string; user: User }> {
    const response = await fetch(`${AUTH_BASE}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse(response);
  }

  async fetchActiveTrip(): Promise<Trip | null> {
    try {
      const response = await fetch(`${TRACKING_BASE}/trips/active`, {
        headers: this.getHeaders(),
      });
      if (response.status === 404) return null;
      return this.handleResponse(response);
    } catch (error) {
      console.warn('Failed to fetch active trip:', error);
      return null;
    }
  }

  async fetchHistory(): Promise<Trip[]> {
    try {
      const response = await fetch(`${TRACKING_BASE}/trips/history`, {
        headers: this.getHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.warn('Failed to fetch trip history:', error);
      return [];
    }
  }

  async startTrip(): Promise<Trip> {
    const response = await fetch(`${TRACKING_BASE}/trips/start`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async completeTrip(tripId: string): Promise<Trip> {
    const response = await fetch(`${TRACKING_BASE}/trips/${tripId}/complete`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async triggerSOS(userId: string, tripId?: string, latitude?: number, longitude?: number): Promise<{ status: string; message: string }> {
    const response = await fetch(`${EMERGENCY_BASE}/emergency/panic`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        user_id: userId,
        trip_id: tripId,
        latitude,
        longitude,
      }),
    });
    return this.handleResponse(response);
  }

  async triggerVoiceSOS(payload: {
    user_id: string;
    transcript: string;
    trip_id?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{ status: string; message: string }> {
    const response = await fetch(`${EMERGENCY_BASE}/emergency/voice`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse(response);
  }

  async fetchEmergencyContacts(userId: string) {
    const response = await fetch(`${AUTH_BASE}/auth/contacts/${userId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async addEmergencyContact(userId: string, contact: {
    name: string;
    phone: string;
    relation: string;
    is_primary?: boolean;
  }) {
    const response = await fetch(`${AUTH_BASE}/auth/contacts`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...contact, user_id: userId }),
    });
    return this.handleResponse(response);
  }
}

export const api = new ApiService();
