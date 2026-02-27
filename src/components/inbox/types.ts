import { Channel, ChannelContext, Message } from '@/lib/mockData';

export interface ConversationGroup {
  senderName: string;
  senderAvatar: string;
  senderOnline: boolean;
  channel: Channel;
  channelContext?: ChannelContext;
  messages: Message[];
  latestTimestamp: Date;
  highestPriority: number;
  unreadCount: number;
  hasAIDraft: boolean;
  topicLabel?: string;
  topicColor?: string;
}

export type SortType = 'priority' | 'recent';
export type AccountFilter = 'all' | 'work' | 'personal';

export interface InboxViewProps {
  initialMessages: Message[];
}
