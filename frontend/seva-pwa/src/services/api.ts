import type { Trip, Driver, User, BackendTripResponse } from '@/types';

const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:8001';
const TRACKING_BASE = process.env.NEXT_PUBLIC_TRACKING_SERVICE_URL || 'http://localhost:8002';
const EMERGENCY_BASE = process.env.NEXT_PUBLIC_EMERGENCY_SERVICE_URL || 'http://localhost:8003';

console.log('=== API Service URLs ===');
console.log('AUTH_BASE:', AUTH_BASE);
console.log('TRACKING_BASE:', TRACKING_BASE);
console.log('EMERGENCY_BASE:', EMERGENCY_BASE);
console.log('Environment variables:');
console.log('NEXT_PUBLIC_AUTH_SERVICE_URL:', process.env.NEXT_PUBLIC_AUTH_SERVICE_URL);
console.log('NEXT_PUBLIC_TRACKING_SERVICE_URL:', process.env.NEXT_PUBLIC_TRACKING_SERVICE_URL);
console.log('NEXT_PUBLIC_EMERGENCY_SERVICE_URL:', process.env.NEXT_PUBLIC_EMERGENCY_SERVICE_URL);

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    console.log('API.setToken called with:', token ? `${token.substring(0, 20)}...` : 'null');
    this.token = token;
  }

  private getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
    console.log('API.getHeaders called, token exists:', !!this.token);
    console.log('Headers:', headers);
    return headers;
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

  async registerInit(payload: { 
    full_name: string; 
    phone_number: string; 
    password: string;
    email: string;
  }): Promise<{ session_token: string; message: string }> {
    const response = await fetch(`${AUTH_BASE}/auth/register/init`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse(response);
  }

  async registerVerify(payload: {
    session_token: string;
    otp: string;
  }): Promise<{ access_token: string; refresh_token: string; user: User }> {
    const response = await fetch(`${AUTH_BASE}/auth/register/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse(response);
  }

  async fetchActiveTrip(): Promise<Trip | null> {
    try {
      // Backend doesn't have this endpoint yet, return null for now
      // TODO: Implement /trips/active endpoint in backend or fetch all trips and filter
      console.warn('fetchActiveTrip: Backend endpoint not implemented yet');
      return null;
    } catch (error) {
      console.warn('Failed to fetch active trip:', error);
      return null;
    }
  }

  async fetchHistory(): Promise<Trip[]> {
    try {
      // Backend doesn't have this endpoint yet, return empty array for now
      // TODO: Implement /trips/history endpoint in backend
      console.warn('fetchHistory: Backend endpoint not implemented yet');
      return [];
    } catch (error) {
      console.warn('Failed to fetch trip history:', error);
      return [];
    }
  }

  async startTrip(): Promise<BackendTripResponse> {
    const response = await fetch(`${TRACKING_BASE}/trips/start`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async completeTrip(tripId: string): Promise<BackendTripResponse> {
    const response = await fetch(`${TRACKING_BASE}/trips/${tripId}/complete`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async shareTrip(tripId: string): Promise<{ share_token: string; expires_in: number }> {
    const response = await fetch(`${TRACKING_BASE}/trips/${tripId}/share`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async triggerSOS(userId: string, tripId?: string, latitude?: number, longitude?: number): Promise<{ status: string; message: string }> {
    const url = `${EMERGENCY_BASE}/emergency/panic`;
    const payload = {
      user_id: userId,
      trip_id: tripId,
      latitude,
      longitude,
    };
    
    console.log('=== SOS API Call Debug ===');
    console.log('URL:', url);
    console.log('Headers:', this.getHeaders());
    console.log('Payload:', payload);
    console.log('Emergency Base URL:', EMERGENCY_BASE);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      
      console.log('SOS Response Status:', response.status, response.statusText);
      console.log('SOS Response Headers:', [...response.headers.entries()]);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('SOS Error Response:', errorText);
        throw new Error(`SOS API Error: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('SOS Success Response:', result);
      return result;
      
    } catch (error) {
      console.error('SOS Fetch Error:', error);
      throw error;
    }
  }

  async triggerVoiceSOS(payload: {
    user_id: string;
    transcript: string;
    trip_id?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{ status: string; message: string }> {
    const url = `${EMERGENCY_BASE}/emergency/voice`;
    
    console.log('=== Voice SOS API Call Debug ===');
    console.log('URL:', url);
    console.log('Headers:', this.getHeaders());
    console.log('Payload:', payload);
    console.log('Emergency Base URL:', EMERGENCY_BASE);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      
      console.log('Voice SOS Response Status:', response.status, response.statusText);
      console.log('Voice SOS Response Headers:', [...response.headers.entries()]);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Voice SOS Error Response:', errorText);
        throw new Error(`Voice SOS API Error: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Voice SOS Success Response:', result);
      return result;
      
    } catch (error) {
      console.error('Voice SOS Fetch Error:', error);
      throw error;
    }
  }

  async fetchEmergencyContacts(userId?: string): Promise<any[]> {
    try {
      // Use authenticated endpoint for own contacts, or internal endpoint for specific user
      const url = userId 
        ? `${AUTH_BASE}/contacts/user/${userId}` 
        : `${AUTH_BASE}/contacts/`;
      
      console.log('Fetching contacts from:', url);
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.warn('Failed to fetch emergency contacts:', error);
      return [];
    }
  }

  async addEmergencyContact(contact: {
    contact_name: string;
    contact_phone: string;
  }) {
    const payload = {
      contact_name: contact.contact_name,
      contact_phone: contact.contact_phone,
    };
    
    console.log('=== ADD CONTACT API DEBUG ===');
    console.log('URL:', `${AUTH_BASE}/contacts/`);
    console.log('Headers:', this.getHeaders());
    console.log('Payload:', payload);
    
    const response = await fetch(`${AUTH_BASE}/contacts/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    
    console.log('Add contact response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Add contact error response:', errorText);
      throw new Error(`Failed to add contact: ${response.status} ${errorText}`);
    }
    
    return this.handleResponse(response);
  }

  async deleteEmergencyContact(contactId: string) {
    // TODO: Backend doesn't have delete endpoint yet
    console.warn('Delete contact endpoint not implemented in backend');
    throw new Error('Delete contact not available');
  }

  async getPendingContactRequests(): Promise<any[]> {
    try {
      console.log('=== GET INCOMING CONTACT REQUESTS DEBUG ===');
      
      // Use the new incoming endpoint to get requests where others want to add me
      const response = await fetch(`${AUTH_BASE}/contacts/incoming`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch incoming requests:', response.status, errorText);
        return [];
      }
      
      const incomingRequests = await response.json();
      console.log('Incoming contact requests:', incomingRequests);
      
      return incomingRequests;
    } catch (error) {
      console.warn('Failed to fetch pending contact requests:', error);
      return [];
    }
  }

  async respondToContactRequest(contactId: string, action: 'ACCEPTED' | 'REJECTED'): Promise<any> {
    console.log('=== RESPOND TO CONTACT REQUEST DEBUG ===');
    console.log('Contact ID:', contactId);
    console.log('Action:', action);
    
    const url = `${AUTH_BASE}/contacts/${contactId}/respond?action=${action}`;
    console.log('URL:', url);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Respond to request error:', errorText);
      throw new Error(`Failed to respond to request: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Response result:', result);
    return result;
  }
}

export const api = new ApiService();
