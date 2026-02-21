'use client';

import { useState } from 'react';
import SearchBar from '@/components/SearchBar';
import ContactCard from '@/components/ContactCard';
import type { Contact } from '@/lib/mockData';

interface ContactsViewProps {
  initialContacts: Contact[];
}

export default function ContactsView({ initialContacts }: ContactsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = initialContacts.filter((contact) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.company.toLowerCase().includes(query) ||
      contact.role.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contacts</h1>
          <p className="text-gray-500">
            Manage your professional relationships across all platforms
          </p>
        </div>

        {/* Search */}
        <div className="mb-6 max-w-xl">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search contacts..."
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="backdrop-blur-xl bg-gray-50 border border-gray-200 rounded-xl p-5">
            <p className="text-gray-500 text-sm mb-1">Total Contacts</p>
            <p className="text-3xl font-bold text-gray-900">{initialContacts.length}</p>
          </div>
          <div className="backdrop-blur-xl bg-gray-50 border border-gray-200 rounded-xl p-5">
            <p className="text-gray-500 text-sm mb-1">Avg Relationship Score</p>
            <p className="text-3xl font-bold text-gray-900">
              {initialContacts.length > 0
                ? Math.round(
                    initialContacts.reduce((acc, c) => acc + c.relationshipScore, 0) /
                      initialContacts.length
                  )
                : 0}
              %
            </p>
          </div>
          <div className="backdrop-blur-xl bg-gray-50 border border-gray-200 rounded-xl p-5">
            <p className="text-gray-500 text-sm mb-1">Active Today</p>
            <p className="text-3xl font-bold text-gray-900">
              {
                initialContacts.filter(
                  (c) => Date.now() - c.lastInteraction.getTime() < 24 * 60 * 60 * 1000
                ).length
              }
            </p>
          </div>
        </div>

        {/* Contacts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>

        {filteredContacts.length === 0 && (
          <div className="text-center py-12 text-gray-500">No contacts found</div>
        )}
      </div>
    </div>
  );
}
