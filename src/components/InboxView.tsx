'use client';

import { useState } from 'react';
import { Sparkles, ArrowUp, SlidersHorizontal, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import MessageCard from '@/components/MessageCard';
import AIReplyBox from '@/components/AIReplyBox';
import ChannelBadge from '@/components/ChannelBadge';
import { Message, getRelativeTime } from '@/lib/mockData';

type SortType = 'priority' | 'recent';

interface InboxViewProps {
  initialMessages: Message[];
}

export default function InboxView({ initialMessages }: InboxViewProps) {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(
    initialMessages[0] || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Filters
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterUnanswered, setFilterUnanswered] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [accountFilter, setAccountFilter] = useState<'all' | 'work' | 'personal'>('all');

  const unreadCount = initialMessages.filter((m) => m.unread).length;
  const activeCount = initialMessages.length;

  let filteredMessages = initialMessages.filter((message) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        message.sender.name.toLowerCase().includes(query) ||
        message.preview.toLowerCase().includes(query) ||
        (message.subject?.toLowerCase().includes(query) || false) ||
        (message.topicLabel?.toLowerCase().includes(query) || false);
      if (!matchesSearch) return false;
    }
    if (filterUnread && !message.unread) return false;
    if (filterUnanswered && message.answered) return false;
    if (accountFilter !== 'all' && message.account !== accountFilter) return false;
    return true;
  });

  // Sort
  if (sortBy === 'priority') {
    filteredMessages = [...filteredMessages].sort((a, b) => b.priority - a.priority);
  } else {
    filteredMessages = [...filteredMessages].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const activeFiltersCount = [filterUnread, filterUnanswered, accountFilter !== 'all'].filter(Boolean).length;

  return (
    <div className="h-screen flex">
      {/* Message List Column */}
      <div className="w-full md:w-96 lg:w-[400px] border-r border-gray-200 flex flex-col bg-white relative">
        {/* Greeting header */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <h1 className="text-xl font-semibold text-gray-900">
            {getGreeting()}, Alex.
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            You&apos;ve got {unreadCount} new and {activeCount} active conversations.
          </p>
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

            {/* Accounts */}
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

            {/* Filter By */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter By</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterUnread}
                    onChange={(e) => setFilterUnread(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">Unread</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterUnanswered}
                    onChange={(e) => setFilterUnanswered(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">Unanswered</span>
                </label>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sort By</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('priority')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortBy === 'priority'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Priority
                </button>
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortBy === 'recent'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Most Recent
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {filteredMessages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              isSelected={selectedMessage?.id === message.id}
              onClick={() => setSelectedMessage(message)}
            />
          ))}
          {filteredMessages.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No messages found</div>
          )}
        </div>

        {/* AI Ask input at bottom */}
        <div className="p-3 border-t border-gray-100">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-teal-500"></div>
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Start typing to ask or search AI..."
              className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
            <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Conversation Detail Column */}
      <div className="hidden lg:flex flex-1 flex-col bg-gray-50">
        {selectedMessage ? (
          <>
            {/* Conversation Header */}
            <div className="p-6 bg-white border-b border-gray-200">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-600">
                    {selectedMessage.sender.avatar}
                  </div>
                  {selectedMessage.sender.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {selectedMessage.sender.name}
                        </h2>
                        <ChannelBadge channel={selectedMessage.channel} size="md" />
                      </div>
                      <p className="text-sm text-gray-400">
                        {getRelativeTime(selectedMessage.timestamp)}
                      </p>
                    </div>
                    {selectedMessage.topicLabel && (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${selectedMessage.topicColor || 'bg-gray-100 text-gray-600'}`}>
                        {selectedMessage.topicLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <div className="h-1.5 w-28 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 w-[85%] rounded-full" />
                    </div>
                    <span className="text-xs text-gray-400">85% relationship</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {selectedMessage.subject && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedMessage.subject}
                </h3>
              )}

              {selectedMessage.thread?.messages.map((msg, idx) => (
                <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600">
                      {selectedMessage.sender.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{msg.from}</p>
                      <p className="text-xs text-gray-400">{getRelativeTime(msg.timestamp)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{msg.content}</p>
                </div>
              ))}
            </div>

            {/* AI Reply Box */}
            {selectedMessage.hasAIDraft && selectedMessage.aiDraft && (
              <div className="p-6 border-t border-gray-200 bg-white">
                <AIReplyBox
                  suggestedReply={selectedMessage.aiDraft}
                  onSend={(text) => console.log('Sending:', text)}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Select a message to view conversation
          </div>
        )}
      </div>
    </div>
  );
}
