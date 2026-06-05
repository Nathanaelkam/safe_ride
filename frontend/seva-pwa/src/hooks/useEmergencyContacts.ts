'use client';
import { useCallback, useEffect, useState } from 'react';
import type { EmergencyContact } from '@/types';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export function useEmergencyContacts() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const fetchContacts = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetchedContacts = await api.fetchEmergencyContacts(user.id);
      setContacts(fetchedContacts);
    } catch (err) {
      console.error('Failed to fetch emergency contacts:', err);
      setError('Failed to load emergency contacts');
      // Fallback to user's existing contacts if available
      if (user.emergencyContacts) {
        setContacts(user.emergencyContacts);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const addContact = useCallback(async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const newContact = await api.addEmergencyContact(user.id, {
        name: contact.name,
        phone: contact.phone,
        relation: contact.relation,
        is_primary: contact.isPrimary,
      });
      
      setContacts(prev => [...prev, newContact]);
      return newContact;
    } catch (err) {
      console.error('Failed to add emergency contact:', err);
      throw new Error('Failed to add emergency contact');
    }
  }, [user]);

  const removeContact = useCallback(async (id: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // TODO: Implement delete API endpoint on backend
      // await api.deleteEmergencyContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to remove emergency contact:', err);
      throw new Error('Failed to remove emergency contact');
    }
  }, [user]);

  return { 
    contacts, 
    addContact, 
    removeContact, 
    loading, 
    error,
    refetch: fetchContacts 
  };
}
