import { Sparkles } from 'lucide-react';
import ChannelBadge from './ChannelBadge';
import Avatar from './Avatar';
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
        px-4 py-3 cursor-pointer border-b border-gray-100
        transition-all duration-150
        ${isSelected 
          ? 'bg-blue-50' 
          : 'hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <Avatar src={message.sender.avatar} name={message.sender.name} size="md" online={message.sender.online} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-2">
              <h3 className={`text-sm ${message.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                {message.sender.name}
              </h3>
              <ChannelBadge channel={message.channel} size="sm" />
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {getRelativeTime(message.timestamp)}
            </span>
          </div>

          {/* Topic label + preview */}
          <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
            {message.topicLabel && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 ${message.topicColor || 'bg-gray-100 text-gray-600'}`}>
                {message.topicLabel}
              </span>
            )}
            <p className="text-sm text-gray-500 line-clamp-1">
              {message.subject || message.preview}
            </p>
          </div>

          {/* AI draft indicator */}
          {message.hasAIDraft && (
            <div className="flex items-center gap-1 mt-1 text-xs text-orange-500">
              <Sparkles size={11} />
              <span>AI draft ready</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
