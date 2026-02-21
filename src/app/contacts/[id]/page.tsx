import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Video } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import ChannelBadge from '@/components/ChannelBadge';
import PersonalityProfile from '@/components/PersonalityProfile';
import MessageCard from '@/components/MessageCard';
import { getContactWithPersonality, getMessages } from '@/lib/data';
import { getRelativeTime } from '@/lib/mockData';

import PlatformLogo from '@/components/PlatformLogo';

interface ContactProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactProfilePage({ params }: ContactProfilePageProps) {
  const { id } = await params;
  const contact = await getContactWithPersonality(id);

  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Contact not found</p>
      </div>
    );
  }

  const allMessages = await getMessages();
  const contactMessages = allMessages.filter((m) => m.sender.name === contact.name);

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Link href="/contacts">
          <button className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors text-sm">
            <ArrowLeft size={16} />
            <span>Contacts</span>
          </button>
        </Link>

        {/* Contact Header — Kinso style */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-4xl shrink-0 ring-2 ring-gray-100">
              {contact.avatar}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {contact.role} · {contact.company} · {contact.location || 'Unknown'}
              </p>

              {/* Platform icons row */}
              <div className="flex items-center gap-1.5 mt-3">
                {(contact.allPlatforms || contact.channels).map((platform) => (
                  <div key={platform} className="w-7 h-7 flex items-center justify-center" title={platform}>
                    <PlatformLogo platform={platform} size={20} />
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
                  <Mail size={14} />
                  Message
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <Phone size={14} />
                  Call
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <Video size={14} />
                  Video
                </button>
              </div>
            </div>

            {/* Relationship score */}
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold text-gray-900">{contact.relationshipScore}%</p>
              <p className="text-xs text-gray-500">Relationship</p>
              <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-orange-400 rounded-full"
                  style={{ width: `${contact.relationshipScore}%` }}
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* AI Bio — Kinso "Remember every detail" style */}
        {contact.bio && (
          <GlassCard className="p-6 mb-6">
            <p className="text-sm text-gray-700 leading-relaxed">{contact.bio}</p>
          </GlassCard>
        )}

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <PersonalityProfile personality={contact.personality} />

            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Stats</h3>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Conversations</span>
                  <span className="text-gray-900 font-medium">{contactMessages.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Unread</span>
                  <span className="text-gray-900 font-medium">
                    {contactMessages.filter((m) => m.unread).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Avg Response</span>
                  <span className="text-gray-900 font-medium">2.4h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Contact</span>
                  <span className="text-gray-900 font-medium">{getRelativeTime(contact.lastInteraction)}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2">
            <GlassCard className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Conversations</h2>
              {contactMessages.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {contactMessages.map((message) => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8 text-sm">No recent conversations</p>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
