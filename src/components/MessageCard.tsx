import { Sparkles } from 'lucide-react';
import ChannelBadge from './ChannelBadge';
import PriorityDot from './PriorityDot';
import { Message, getRelativeTime } from '@/lib/mockData';

interface MessageCardProps {
  message: Message;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function MessageCard({ message, isSelected = false, onClick }: MessageCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-xl cursor-pointer
        transition-all duration-200
        ${isSelected 
          ? 'bg-white/[0.12] border border-white/[0.15]' 
          : 'hover:bg-white/[0.06] border border-transparent'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Channel Badge */}
        <ChannelBadge channel={message.channel} size="md" />

        {/* Avatar */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xl">
            {message.sender.avatar}
          </div>
          {message.sender.online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold ${message.unread ? 'text-white' : 'text-gray-300'}`}>
                {message.sender.name}
              </h3>
              {message.unread && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {getRelativeTime(message.timestamp)}
            </span>
          </div>

          {message.subject && (
            <p className={`text-sm mb-1 ${message.unread ? 'text-gray-200' : 'text-gray-400'}`}>
              {message.subject}
            </p>
          )}

          <p className="text-sm text-gray-400 line-clamp-2">
            {message.preview}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-3 mt-2">
            <PriorityDot priority={message.priority} size="sm" />
            {message.hasAIDraft && (
              <div className="flex items-center gap-1 text-xs text-purple-400">
                <Sparkles size={12} />
                <span>AI draft ready</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
