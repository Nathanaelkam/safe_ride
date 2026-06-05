'use client';
import { useCallback, useEffect, useState } from 'react';
import type { EmergencyContact } from '@/types';

const STORAGE_KEY = 'seva.contacts.v1';

export function useEmergencyContacts(initial: EmergencyContact[] = []) {
  const [contacts, setContacts] = useState<EmergencyContact[]>(initial);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setContacts(JSON.parse(raw)); } catch {}
    }
  }, []);

  const persist = useCallback((next: EmergencyContact[]) => {
    setContacts(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const addContact = useCallback((c: Omit<EmergencyContact, 'id'>) => {
    persist([...contacts, { ...c, id: `c_${Date.now()}` }]);
  }, [contacts, persist]);

  const removeContact = useCallback((id: string) => {
    persist(contacts.filter((c) => c.id !== id));
  }, [contacts, persist]);

  return { contacts, addContact, removeContact };
}
