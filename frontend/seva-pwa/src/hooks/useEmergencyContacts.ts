'use client';
import { useCallback, useEffect, useState } from 'react';
import type { EmergencyContact, BackendContact } from '@/types';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

// Convert backend contact to frontend format
function backendToFrontend(backendContact: BackendContact): EmergencyContact {
  return {
    id: backendContact.id,
    name: backendContact.contact_name,
    relation: 'Contact', // Default since backend doesn't have relation
    phone: backendContact.contact_phone,
    isPrimary: false, // Could determine this from status or order
  };
}

// Convert frontend contact to backend format
function frontendToBackend(frontendContact: Omit<EmergencyContact, 'id'>): {
  contact_name: string;
  contact_phone: string;
} {
  return {
    contact_name: frontendContact.name,
    contact_phone: frontendContact.phone,
  };
}

export function useEmergencyContacts(initialContacts?: EmergencyContact[]) {
  const [contacts, setContacts] = useState<EmergencyContact[]>(initialContacts || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, token, _hasHydrated } = useAuthStore();

  console.log('=== useEmergencyContacts AUTH DEBUG ===');
  console.log('user:', user);
  console.log('token:', token);
  console.log('_hasHydrated:', _hasHydrated);
  console.log('initialContacts:', initialContacts);

  const fetchContacts = useCallback(async () => {
    if (!_hasHydrated) {
      console.log('useEmergencyContacts: Waiting for auth hydration...');
      return;
    }

    if (!token) {
      console.log('useEmergencyContacts: No token available, using initial contacts');
      setLoading(false);
      return;
    }

    // Extract user ID from token if user object is null
    let shouldFetchFromBackend = false;
    let userId = user?.id;
    
    if (!userId && token) {
      try {
        // Decode JWT token to extract user ID from "sub" claim
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
        console.log('useEmergencyContacts: Extracted user ID from token:', userId);
        shouldFetchFromBackend = true;
      } catch (err) {
        console.error('useEmergencyContacts: Failed to decode token:', err);
        userId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'; // Fallback
        shouldFetchFromBackend = true;
      }
    } else if (userId && token) {
      shouldFetchFromBackend = true;
    }

    if (!shouldFetchFromBackend) {
      console.log('useEmergencyContacts: No valid auth, using initial contacts');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Set token for API calls
      api.setToken(token);
      
      console.log('useEmergencyContacts: Fetching from backend with userId:', userId);
      const backendContacts: BackendContact[] = await api.fetchEmergencyContacts();
      
      // Only use accepted contacts
      const acceptedContacts = backendContacts.filter(c => c.status === 'ACCEPTED');
      
      // Convert to frontend format
      const frontendContacts = acceptedContacts.map(backendToFrontend);
      
      console.log('useEmergencyContacts: Fetched contacts:', frontendContacts);
      setContacts(frontendContacts);
    } catch (err) {
      console.error('Failed to fetch emergency contacts:', err);
      setError('Failed to load emergency contacts');
      
      // Fallback to initial contacts or empty array
      if (initialContacts) {
        console.log('useEmergencyContacts: Using initial contacts as fallback');
        setContacts(initialContacts);
      }
    } finally {
      setLoading(false);
    }
  }, [user, token, _hasHydrated, initialContacts]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const addContact = useCallback(async (contact: Omit<EmergencyContact, 'id'>) => {
    console.log('useEmergencyContacts addContact called with:', contact);
    console.log('Current auth state - user:', user, 'token:', token, '_hasHydrated:', _hasHydrated);
    
    if (!_hasHydrated) {
      throw new Error('Authentication not ready. Please wait and try again.');
    }

    if (!token) {
      throw new Error('No authentication token available. Please log in again.');
    }

    // Extract user ID from token if user object is null
    let userId = user?.id;
    if (!userId && token) {
      try {
        // Decode JWT token to extract user ID from "sub" claim
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
        console.log('useEmergencyContacts: Extracted user ID from token for addContact:', userId);
      } catch (err) {
        console.error('useEmergencyContacts: Failed to decode token:', err);
        userId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'; // Fallback
      }
    }

    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // Set token for API calls
      api.setToken(token);
      
      // Convert to backend format
      const backendContact = frontendToBackend(contact);
      
      console.log('useEmergencyContacts: Adding contact with contact:', backendContact);
      const newBackendContact: BackendContact = await api.addEmergencyContact(backendContact);
      
      // Convert back to frontend format
      const newFrontendContact = backendToFrontend(newBackendContact);
      
      setContacts(prev => [...prev, newFrontendContact]);
      return newFrontendContact;
    } catch (err) {
      console.error('Failed to add emergency contact:', err);
      throw new Error('Failed to add emergency contact');
    }
  }, [user, token, _hasHydrated]);

  const removeContact = useCallback(async (id: string) => {
    if (!user?.id || !token) throw new Error('User not authenticated');

    try {
      // Set token for API calls
      api.setToken(token);
      
      // Backend doesn't have delete endpoint yet, so just remove locally
      console.log('useEmergencyContacts: Removing contact (local only):', id);
      await api.deleteEmergencyContact(id);
      
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.warn('Backend delete not available, removing locally:', err);
      // Still remove from local state even if backend delete fails
      setContacts(prev => prev.filter(c => c.id !== id));
    }
  }, [user, token]);

  return { 
    contacts, 
    addContact, 
    removeContact, 
    loading, 
    error,
    refetch: fetchContacts 
  };
}
