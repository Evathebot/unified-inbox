import Link from 'next/link';
import ChannelBadge from './ChannelBadge';
import Avatar from './Avatar';
import { Contact, getRelativeTime } from '@/lib/mockData';
import GlassCard from './GlassCard';

interface ContactCardProps {
  contact: Contact;
}

export default function ContactCard({ contact }: ContactCardProps) {
  return (
    <Link href={`/contacts/${contact.id}`}>
      <GlassCard hover className="p-5">
        <div className="flex items-start gap-4">
          <Avatar src={contact.avatarUrl || contact.avatar} name={contact.name} size="lg" />

          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 font-semibold mb-0.5">{contact.name}</h3>
            <p className="text-sm text-gray-500 mb-0.5">{contact.role}</p>
            <p className="text-xs text-gray-400 mb-3">{contact.company}</p>

            {/* Platform logos */}
            <div className="flex items-center gap-2 mb-3">
              {contact.channels.map((channel) => (
                <ChannelBadge key={channel} channel={channel} size="sm" />
              ))}
            </div>

            {/* Relationship Score */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Relationship</span>
                <span className="text-gray-900 font-medium">{contact.relationshipScore}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${contact.relationshipScore}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-2">
              Last contact: {getRelativeTime(contact.lastInteraction)}
            </p>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
