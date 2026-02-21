import PlatformLogo from './PlatformLogo';
import { Channel } from '@/lib/mockData';

interface ChannelBadgeProps {
  channel: Channel;
  size?: 'sm' | 'md' | 'lg';
}

export default function ChannelBadge({ channel, size = 'md' }: ChannelBadgeProps) {
  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22
  };

  return <PlatformLogo platform={channel} size={iconSizes[size]} />;
}
