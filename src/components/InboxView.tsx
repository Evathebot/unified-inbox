'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUp, SlidersHorizontal, ChevronRight, X, Plus, Send, Sparkles } from 'lucide-react';
import Avatar from '@/components/Avatar';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import MessageCard from '@/components/MessageCard';
import AIReplyBox from '@/components/AIReplyBox';
import ChannelBadge from '@/components/ChannelBadge';
import { Message, Channel, ChannelContext, getRelativeTime } from '@/lib/mockData';
import ChannelContextBadge from '@/components/ChannelContextBadge';

type SortType = 'priority' | 'recent';

interface ConversationGroup {
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

interface InboxViewProps {
  initialMessages: Message[];
}

export default function InboxView({ initialMessages }: InboxViewProps) {
  const searchParams = useSearchParams();
  const channelFilter = searchParams.get('channel');

  const [selectedGroup, setSelectedGroup] = useState<ConversationGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [readMessages, setReadMessages] = useState<Set<string>>(new Set());

  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeChannel, setComposeChannel] = useState<Channel>('gmail');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);

  // Filters
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterUnanswered, setFilterUnanswered] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [accountFilter, setAccountFilter] = useState<'all' | 'work' | 'personal'>('all');

  // Compute effective unread status
  const isMessageRead = (msg: Message) => !msg.unread || readMessages.has(msg.id);

  const unreadCount = initialMessages.filter((m) => !isMessageRead(m)).length;
  const activeCount = initialMessages.length;

  // Group messages by sender+channel into conversations
  const conversationGroups = useMemo(() => {
    let filtered = initialMessages.filter((message) => {
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

    // Group by sender name + channel
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

    let groups = Array.from(groupMap.values());

    // Sort messages within each group by time
    groups.forEach(g => g.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));

    // Sort groups
    if (sortBy === 'priority') {
      groups.sort((a, b) => b.highestPriority - a.highestPriority);
    } else {
      groups.sort((a, b) => b.latestTimestamp.getTime() - a.latestTimestamp.getTime());
    }

    return groups;
  }, [initialMessages, searchQuery, filterUnread, filterUnanswered, accountFilter, channelFilter, sortBy, readMessages]);

  // Auto-select first group
  const effectiveSelected = selectedGroup || conversationGroups[0] || null;

  const handleSelectGroup = (group: ConversationGroup) => {
    setSelectedGroup(group);
    setShowCompose(false);
    // Mark all messages in group as read
    const newRead = new Set(readMessages);
    group.messages.forEach(m => newRead.add(m.id));
    setReadMessages(newRead);
  };

  const handleAskAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    // Simulate AI response
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

  // Platform unread counts for notification badges (used by sidebar)
  const platformUnreads = useMemo(() => {
    const counts: Record<string, number> = {};
    initialMessages.forEach(m => {
      if (!isMessageRead(m)) {
        counts[m.channel] = (counts[m.channel] || 0) + 1;
      }
    });
    return counts;
  }, [initialMessages, readMessages]);

  return (
    <div className="h-screen flex">
      {/* Message List Column */}
      <div className="w-full md:w-96 lg:w-[400px] border-r border-gray-200 flex flex-col bg-white relative">
        {/* Greeting header */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {getGreeting()}, Alex.
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                You&apos;ve got {unreadCount} new and {activeCount} active conversations.
              </p>
            </div>
            {/* Compose button */}
            <button
              onClick={() => { setShowCompose(true); setSelectedGroup(null); }}
              className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
              title="New message"
            >
              <Plus size={18} />
            </button>
          </div>
          <Link href="/briefing" className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Today&apos;s briefing <ChevronRight size={12} />
          </Link>
        </div>

        {/* Search + Filter toggle */}
        <div className="p-3 flex gap-2">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Start typing to ask or search..."
            />
          </div>
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
              showFilterPanel || activeFiltersCount > 0
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={16} />
            {activeFiltersCount > 0 && !showFilterPanel && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter/Sort Panel */}
        {showFilterPanel && (
          <div className="mx-3 mb-2 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filters</span>
              <button onClick={() => setShowFilterPanel(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Accounts</p>
              <div className="flex gap-2">
                {(['all', 'work', 'personal'] as const).map((acc) => (
                  <button
                    key={acc}
                    onClick={() => setAccountFilter(acc)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      accountFilter === acc
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {acc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter By</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={filterUnread} onChange={(e) => setFilterUnread(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500" />
                  <span className="text-sm text-gray-700">Unread</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={filterUnanswered} onChange={(e) => setFilterUnanswered(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500" />
                  <span className="text-sm text-gray-700">Unanswered</span>
                </label>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sort By</p>
              <div className="flex gap-2">
                {(['priority', 'recent'] as SortType[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      sortBy === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {s === 'recent' ? 'Most Recent' : 'Priority'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conversation List (grouped) */}
        <div className="flex-1 overflow-y-auto">
          {conversationGroups.map((group) => {
            const latest = group.messages[group.messages.length - 1];
            const isSelected = effectiveSelected?.senderName === group.senderName && effectiveSelected?.channel === group.channel;
            return (
              <div
                key={`${group.senderName}::${group.channel}`}
                onClick={() => handleSelectGroup(group)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 transition-all duration-150 ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <Avatar src={group.senderAvatar} name={group.senderName} size="md" online={group.senderOnline} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm ${group.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {group.senderName}
                        </h3>
                        <ChannelBadge channel={group.channel} size="sm" />
                        {group.messages.length > 1 && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                            {group.messages.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {group.unreadCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        )}
                        <span className="text-xs text-gray-400 shrink-0">
                          {getRelativeTime(group.latestTimestamp)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      {group.topicLabel && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 ${group.topicColor || 'bg-gray-100 text-gray-600'}`}>
                          {group.topicLabel}
                        </span>
                      )}
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {latest.subject || latest.preview}
                      </p>
                    </div>

                    {/* Channel context (workspace/group) */}
                    {group.channelContext && !group.channelContext.isDM && (
                      <div className="mt-1">
                        <ChannelContextBadge channel={group.channel} context={group.channelContext} compact />
                      </div>
                    )}

                    {group.hasAIDraft && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-orange-500">
                        <Sparkles size={11} />
                        <span>AI draft ready</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {conversationGroups.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No messages found</div>
          )}
        </div>

        {/* AI Ask input at bottom */}
        <div className="p-3 border-t border-gray-100">
          {aiResponse && (
            <div className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-orange-400 to-teal-500"></div>
                <span className="text-[11px] font-medium text-gray-500">AI</span>
                <button onClick={() => setAiResponse('')} className="ml-auto text-gray-400 hover:text-gray-600"><X size={12} /></button>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{aiResponse}</p>
            </div>
          )}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-teal-500 shadow-[0_0_8px_2px_rgba(249,115,22,0.4),0_0_8px_2px_rgba(20,184,166,0.4)]"></div>
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              placeholder="Start typing to ask or search AI..."
              className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
            <button
              onClick={handleAskAI}
              disabled={aiLoading}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${aiLoading ? 'text-orange-400 animate-spin' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel: Compose or Conversation Detail */}
      <div className="hidden lg:flex flex-1 flex-col bg-gray-50">
        {showCompose ? (
          /* Compose New Message */
          <div className="flex-1 flex flex-col">
            <div className="p-6 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">New Message</h2>
                <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-500 w-16 shrink-0">To</label>
                  <input
                    type="text"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="Recipient name or email..."
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-500 w-16 shrink-0">Channel</label>
                  <div className="flex gap-2">
                    {(['gmail', 'whatsapp', 'telegram', 'slack'] as Channel[]).map(ch => (
                      <button
                        key={ch}
                        onClick={() => setComposeChannel(ch)}
                        className={`p-2 rounded-lg border transition-all ${
                          composeChannel === ch ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <ChannelBadge channel={ch} size="md" />
                      </button>
                    ))}
                  </div>
                </div>

                {composeChannel === 'gmail' && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-500 w-16 shrink-0">Subject</label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Subject..."
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-6">
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Write your message..."
                className="w-full h-full p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder-gray-400"
              />
            </div>

            <div className="p-6 bg-white border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => { setShowCompose(false); setComposeTo(''); setComposeSubject(''); setComposeBody(''); }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => {
                  alert(`Message to ${composeTo} via ${composeChannel} queued! (Demo mode)`);
                  setShowCompose(false);
                  setComposeTo('');
                  setComposeSubject('');
                  setComposeBody('');
                }}
                className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Send size={14} />
                Send
              </button>
            </div>
          </div>
        ) : effectiveSelected ? (
          /* Conversation Detail */
          <>
            <div className="p-6 bg-white border-b border-gray-200">
              <div className="flex items-start gap-4">
                <Avatar src={effectiveSelected.senderAvatar} name={effectiveSelected.senderName} size="lg" online={effectiveSelected.senderOnline} />

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {effectiveSelected.senderName}
                        </h2>
                        <ChannelBadge channel={effectiveSelected.channel} size="md" />
                        {effectiveSelected.messages.length > 1 && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {effectiveSelected.messages.length} messages
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {getRelativeTime(effectiveSelected.latestTimestamp)}
                      </p>
                    </div>
                    {effectiveSelected.topicLabel && (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${effectiveSelected.topicColor || 'bg-gray-100 text-gray-600'}`}>
                        {effectiveSelected.topicLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <div className="h-1.5 w-28 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 w-[85%] rounded-full" />
                    </div>
                    <span className="text-xs text-gray-400">85% relationship</span>
                  </div>

                  {/* Channel context */}
                  {effectiveSelected.channelContext && !effectiveSelected.channelContext.isDM && (
                    <div className="mt-3">
                      <ChannelContextBadge channel={effectiveSelected.channel} context={effectiveSelected.channelContext} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* All messages in the conversation thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {effectiveSelected.messages.map((msg, idx) => (
                <div key={msg.id || idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3 mb-2">
                    <Avatar src={msg.sender.avatar} name={msg.sender.name} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{msg.sender.name}</p>
                        <p className="text-xs text-gray-400">{getRelativeTime(msg.timestamp)}</p>
                      </div>
                      {msg.subject && <p className="text-xs text-gray-500 font-medium mt-0.5">{msg.subject}</p>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{msg.preview}</p>
                  {msg.topicLabel && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium mt-2 ${msg.topicColor || 'bg-gray-100 text-gray-600'}`}>
                      {msg.topicLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* AI Reply Box */}
            {effectiveSelected.hasAIDraft && (() => {
              const draftMsg = effectiveSelected.messages.find(m => m.hasAIDraft && m.aiDraft);
              return draftMsg?.aiDraft ? (
                <div className="px-6 pt-4 bg-white border-t border-gray-100">
                  <AIReplyBox
                    suggestedReply={draftMsg.aiDraft}
                    onSend={(text) => alert(`Reply sent: "${text.substring(0, 50)}..." (Demo mode)`)}
                  />
                </div>
              ) : null;
            })()}

            {/* Reply Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              {replySent ? (
                <div className="flex items-center justify-center gap-2 py-3 text-green-600 text-sm font-medium">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Message sent!
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (replyText.trim()) {
                            setReplySent(true);
                            setReplyText('');
                            setTimeout(() => setReplySent(false), 2500);
                          }
                        }
                      }}
                      placeholder={`Reply to ${effectiveSelected.senderName}...`}
                      rows={1}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 focus:bg-white placeholder-gray-400 min-h-[40px] max-h-[120px]"
                      style={{ height: 'auto', overflow: 'hidden' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (replyText.trim()) {
                        setReplySent(true);
                        setReplyText('');
                        setTimeout(() => setReplySent(false), 2500);
                      }
                    }}
                    disabled={!replyText.trim()}
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      replyText.trim()
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Send size={16} />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}
