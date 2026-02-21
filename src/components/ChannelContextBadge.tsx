import { Hash, Users, MessageCircle } from 'lucide-react';
import type { ChannelContext } from '@/lib/mockData';
import type { Channel } from '@/lib/mockData';

interface ChannelContextBadgeProps {
  channel: Channel;
  context?: ChannelContext;
  compact?: boolean;
}

export default function ChannelContextBadge({ channel, context, compact = false }: ChannelContextBadgeProps) {
  if (!context || context.isDM) return null;

  const channelColors: Record<string, string> = {
    slack: 'bg-purple-50 text-purple-700 border-purple-100',
    whatsapp: 'bg-green-50 text-green-700 border-green-100',
    telegram: 'bg-blue-50 text-blue-700 border-blue-100',
    gmail: 'bg-red-50 text-red-700 border-red-100',
  };

  const color = channelColors[channel] || 'bg-gray-50 text-gray-600 border-gray-100';

  if (compact) {
    // Single-line compact version for message list
    const label = context.channelName
      ? `${context.workspace || ''} › ${context.channelName}`
      : context.groupName || '';
    return label ? (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${color}`}>
        {channel === 'slack' && <Hash size={9} />}
        {channel === 'whatsapp' && <Users size={9} />}
        {label}
      </span>
    ) : null;
  }

  // Full version for conversation header
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${color}`}>
      {channel === 'slack' && context.workspace && (
        <>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-purple-600 flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">D</span>
            </div>
            <span className="text-xs font-semibold">{context.workspace}</span>
          </div>
          {context.channelName && (
            <>
              <span className="text-xs opacity-40">›</span>
              <div className="flex items-center gap-1">
                <Hash size={11} />
                <span className="text-xs font-medium">{context.channelName.replace('#', '')}</span>
              </div>
            </>
          )}
        </>
      )}

      {channel === 'whatsapp' && context.groupName && (
        <div className="flex items-center gap-1.5">
          <Users size={12} />
          <span className="text-xs font-semibold">{context.groupName}</span>
        </div>
      )}

      {channel === 'telegram' && context.groupName && (
        <div className="flex items-center gap-1.5">
          <MessageCircle size={12} />
          <span className="text-xs font-semibold">{context.groupName}</span>
        </div>
      )}
    </div>
  );
}
