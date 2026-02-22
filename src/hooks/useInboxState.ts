'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Message, Channel } from '@/lib/mockData';
import { ConversationGroup, SortType, AccountFilter } from '@/components/inbox/types';

export function useInboxState(initialMessages: Message[]) {
  const searchParams = useSearchParams();
  const channelFilter = searchParams.get('channel');

  const [selectedGroup, setSelectedGroup] = useState<ConversationGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [readMessages, setReadMessages] = useState<Set<string>>(new Set());

  // AI state
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeChannel, setComposeChannel] = useState<Channel>('gmail');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // Filters
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterUnanswered, setFilterUnanswered] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');

  const isMessageRead = (msg: Message) => !msg.unread || readMessages.has(msg.id);

  const unreadCount = initialMessages.filter((m) => !isMessageRead(m)).length;
  const activeCount = initialMessages.length;

  const conversationGroups = useMemo(() => {
    const filtered = initialMessages.filter((message) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          message.sender.name.toLowerCase().includes(query) ||
          message.preview.toLowerCase().includes(query) ||
          (message.subject?.toLowerCase().includes(query) || false) ||
          (message.topicLabel?.toLowerCase().includes(query) || false);
        if (!matchesSearch) return false;
      }
      if (filterUnread && isMessageRead(message)) return false;
      if (filterUnanswered && message.answered) return false;
      if (accountFilter !== 'all' && message.account !== accountFilter) return false;
      if (channelFilter && message.channel !== channelFilter) return false;
      return true;
    });

    const groupMap = new Map<string, ConversationGroup>();
    for (const msg of filtered) {
      const key = `${msg.sender.name}::${msg.channel}`;
      const existing = groupMap.get(key);
      if (existing) {
        existing.messages.push(msg);
        if (msg.timestamp > existing.latestTimestamp) existing.latestTimestamp = msg.timestamp;
        if (msg.priority > existing.highestPriority) existing.highestPriority = msg.priority;
        if (!isMessageRead(msg)) existing.unreadCount++;
        if (msg.hasAIDraft) existing.hasAIDraft = true;
        if (!existing.topicLabel && msg.topicLabel) {
          existing.topicLabel = msg.topicLabel;
          existing.topicColor = msg.topicColor;
        }
      } else {
        groupMap.set(key, {
          senderName: msg.sender.name,
          senderAvatar: msg.sender.avatar,
          senderOnline: msg.sender.online,
          channel: msg.channel,
          channelContext: msg.channelContext,
          messages: [msg],
          latestTimestamp: msg.timestamp,
          highestPriority: msg.priority,
          unreadCount: isMessageRead(msg) ? 0 : 1,
          hasAIDraft: msg.hasAIDraft,
          topicLabel: msg.topicLabel,
          topicColor: msg.topicColor,
        });
      }
    }

    const groups = Array.from(groupMap.values());
    groups.forEach(g => g.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));

    if (sortBy === 'priority') {
      groups.sort((a, b) => b.highestPriority - a.highestPriority);
    } else {
      groups.sort((a, b) => b.latestTimestamp.getTime() - a.latestTimestamp.getTime());
    }

    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages, searchQuery, filterUnread, filterUnanswered, accountFilter, channelFilter, sortBy, readMessages]);

  const effectiveSelected = selectedGroup || conversationGroups[0] || null;

  const handleSelectGroup = (group: ConversationGroup) => {
    setSelectedGroup(group);
    setShowCompose(false);
    const newRead = new Set(readMessages);
    group.messages.forEach(m => newRead.add(m.id));
    setReadMessages(newRead);
  };

  const handleAskAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setTimeout(() => {
      const responses = [
        `Based on your ${activeCount} conversations, here's a summary: You have ${unreadCount} unread messages. The highest priority is from ${conversationGroups[0]?.senderName || 'unknown'}. I'd recommend addressing their message first.`,
        `Looking at your inbox, ${conversationGroups.filter(g => g.hasAIDraft).length} conversations have AI draft replies ready. Would you like me to review them?`,
        `Your most active conversation is with ${conversationGroups[0]?.senderName || 'a contact'}. They sent ${conversationGroups[0]?.messages.length || 0} messages recently.`,
      ];
      setAiResponse(responses[Math.floor(Math.random() * responses.length)]);
      setAiLoading(false);
      setAiQuery('');
    }, 1200);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const activeFiltersCount = [filterUnread, filterUnanswered, accountFilter !== 'all'].filter(Boolean).length;

  const handleOpenCompose = () => {
    setShowCompose(true);
    setSelectedGroup(null);
  };

  const handleDiscardCompose = () => {
    setShowCompose(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
  };

  const handleSendCompose = () => {
    alert(`Message to ${composeTo} via ${composeChannel} queued! (Demo mode)`);
    handleDiscardCompose();
  };

  return {
    // State
    searchQuery, setSearchQuery,
    showFilterPanel, setShowFilterPanel,
    showCompose,
    filterUnread, setFilterUnread,
    filterUnanswered, setFilterUnanswered,
    sortBy, setSortBy,
    accountFilter, setAccountFilter,
    // AI
    aiQuery, setAiQuery, aiResponse, setAiResponse, aiLoading, handleAskAI,
    // Compose
    composeTo, setComposeTo,
    composeChannel, setComposeChannel,
    composeSubject, setComposeSubject,
    composeBody, setComposeBody,
    handleOpenCompose, handleDiscardCompose, handleSendCompose,
    // Computed
    conversationGroups,
    effectiveSelected,
    unreadCount,
    activeCount,
    activeFiltersCount,
    getGreeting,
    // Actions
    handleSelectGroup,
  };
}
