import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const RELATIONSHIPS = [
  'Mom', 'Dad', 'Sister', 'Brother',
  'Best Friend', 'Guardian', 'Partner', 'Roommate', 'Other',
] as const;

export type Relationship = typeof RELATIONSHIPS[number];

export interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship?: Relationship | string;
  addedAt?: number;
}

interface ContactsContextType {
  contacts: Contact[];
  addContact: (name: string, phone: string, relationship?: string) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  updateContact: (id: string, updates: Partial<Omit<Contact, 'id'>>) => Promise<void>;
}

const ContactsContext = createContext<ContactsContextType | null>(null);

const STORAGE_KEY = '@shieldher_contacts_v2';

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(data => { if (data) setContacts(JSON.parse(data)); })
      .catch(() => {});
  }, []);

  async function persist(list: Contact[]) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  async function addContact(name: string, phone: string, relationship?: string) {
    const contact: Contact = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship?.trim() || undefined,
      addedAt: Date.now(),
    };
    const updated = [...contacts, contact];
    setContacts(updated);
    await persist(updated);
  }

  async function removeContact(id: string) {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    await persist(updated);
  }

  async function updateContact(id: string, updates: Partial<Omit<Contact, 'id'>>) {
    const updated = contacts.map(c => c.id === id ? { ...c, ...updates } : c);
    setContacts(updated);
    await persist(updated);
  }

  return (
    <ContactsContext.Provider value={{ contacts, addContact, removeContact, updateContact }}>
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error('useContacts must be used inside ContactsProvider');
  return ctx;
}
