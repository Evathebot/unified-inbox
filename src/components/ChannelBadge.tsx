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
      color: 'text-red-500',
      label: 'Gmail'
    },
    whatsapp: {
      icon: MessageCircle,
      color: 'text-green-500',
      label: 'WhatsApp'
    },
    telegram: {
      icon: Send,
      color: 'text-blue-500',
      label: 'Telegram'
    },
    slack: {
      icon: Hash,
      color: 'text-purple-700',
      label: 'Slack'
    }
  };

  const config = configs[channel];
  const Icon = config.icon;

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22
  };

  return (
    <div
      className={`${config.color} inline-flex items-center justify-center`}
      title={config.label}
    >
      <Icon size={iconSizes[size]} />
    </div>
  );
}
