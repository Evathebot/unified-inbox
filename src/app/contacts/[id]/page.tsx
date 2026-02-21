'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Video } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import ChannelBadge from '@/components/ChannelBadge';
import PersonalityProfile from '@/components/PersonalityProfile';
import MessageCard from '@/components/MessageCard';
import { mockContacts, mockMessages, getRelativeTime } from '@/lib/mockData';

export default function ContactProfilePage() {
  const params = useParams();
  const contact = mockContacts.find(c => c.id === params.id);

  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Contact not found</p>
      </div>
    );
  }

  // Get messages from this contact
  const contactMessages = mockMessages.filter(
    m => m.sender.name === contact.name
  );

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <Link href="/contacts">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={20} />
            <span>Back to Contacts</span>
          </button>
        </Link>

        {/* Contact Header Card */}
        <GlassCard className="p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-5xl shrink-0">
              {contact.avatar}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{contact.name}</h1>
              <p className="text-xl text-gray-300 mb-1">{contact.role}</p>
              <p className="text-gray-400 mb-4">{contact.company}</p>

              {/* Channels */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm text-gray-400">Available on:</span>
                {contact.channels.map((channel) => (
                  <ChannelBadge key={channel} channel={channel} size="md" />
                ))}
              </div>

              {/* Relationship Score */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Relationship Score</span>
                  <span className="text-2xl font-bold text-white">{contact.relationshipScore}%</span>
                </div>
                <div className="h-3 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${contact.relationshipScore}%` }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
                  <Mail size={18} />
                  <span>Send Message</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.08] text-white rounded-lg hover:bg-white/[0.12] transition-all border border-white/[0.08]">
                  <Phone size={18} />
                  <span>Call</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.08] text-white rounded-lg hover:bg-white/[0.12] transition-all border border-white/[0.08]">
                  <Video size={18} />
                  <span>Video</span>
                </button>
              </div>
            </div>

            {/* Last interaction */}
            <div className="text-right">
              <p className="text-sm text-gray-400 mb-1">Last contact</p>
              <p className="text-white font-semibold">
                {getRelativeTime(contact.lastInteraction)}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Personality & Details */}
          <div className="space-y-6">
            <PersonalityProfile personality={contact.personality} />

            {/* Quick Stats */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Total Conversations</span>
                  <span className="text-white font-semibold">{contactMessages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Unread Messages</span>
                  <span className="text-white font-semibold">
                    {contactMessages.filter(m => m.unread).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Avg Response Time</span>
                  <span className="text-white font-semibold">2.4 hours</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right column - Recent Conversations */}
          <div className="lg:col-span-2">
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Recent Conversations</h2>
              
              {contactMessages.length > 0 ? (
                <div className="space-y-3">
                  {contactMessages.map((message) => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">
                  No recent conversations
                </p>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
