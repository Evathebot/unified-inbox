import { Mail, MessageCircle, Send, Hash } from 'lucide-react';
import { Channel } from '@/lib/mockData';

interface ChannelBadgeProps {
  channel: Channel;
  size?: 'sm' | 'md' | 'lg';
}

export default function ChannelBadge({ channel, size = 'md' }: ChannelBadgeProps) {
  const configs = {
    gmail: {
      icon: Mail,
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      label: 'Gmail'
    },
    whatsapp: {
      icon: MessageCircle,
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      label: 'WhatsApp'
    },
    telegram: {
      icon: Send,
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      label: 'Telegram'
    },
    slack: {
      icon: Hash,
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      label: 'Slack'
    }
  };

  const config = configs[channel];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'p-1 rounded-md',
    md: 'p-1.5 rounded-lg',
    lg: 'p-2 rounded-xl'
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  return (
    <div
      className={`${config.bg} ${config.text} ${sizeClasses[size]} inline-flex items-center justify-center`}
      title={config.label}
    >
      <Icon size={iconSizes[size]} />
    </div>
  );
}
