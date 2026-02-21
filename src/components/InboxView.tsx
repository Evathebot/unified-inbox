'use client';

import { useState } from 'react';
import { Sparkles, ArrowUp } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import MessageCard from '@/components/MessageCard';
import AIReplyBox from '@/components/AIReplyBox';
import ChannelBadge from '@/components/ChannelBadge';
import { Message, getRelativeTime } from '@/lib/mockData';

type FilterType = 'all' | 'unread' | 'priority';

interface InboxViewProps {
  initialMessages: Message[];
}

export default function InboxView({ initialMessages }: InboxViewProps) {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(
    initialMessages[0] || null
  );
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');

  const unreadCount = initialMessages.filter((m) => m.unread).length;
  const activeCount = initialMessages.length;

  const filteredMessages = initialMessages.filter((message) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        message.sender.name.toLowerCase().includes(query) ||
        message.preview.toLowerCase().includes(query) ||
        (message.subject?.toLowerCase().includes(query) || false);
      if (!matchesSearch) return false;
    }
    if (filter === 'unread' && !message.unread) return false;
    if (filter === 'priority' && message.priority < 60) return false;
    return true;
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="h-screen flex">
      {/* Message List Column */}
      <div className="w-full md:w-96 lg:w-[400px] border-r border-gray-200 flex flex-col bg-white relative">
        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Start typing to ask or search..."
          />
        </div>

        {/* Inbox header + filters */}
        <div className="px-4 pt-3 pb-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Inbox</h2>
          <div className="flex gap-1">
            {(['all', 'unread', 'priority'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all
                  ${filter === f
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                  }
                `}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

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

        {/* AI Assistant Card - bottom overlay */}
        <div className="p-3 border-t border-gray-100">
          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-800 font-medium">
              {getGreeting()}, Alex.
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              You&apos;ve got {unreadCount} new and {activeCount} active conversations
            </p>
            <div className="mt-3 relative">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask AI..."
                className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <ArrowUp size={14} />
              </button>
            </div>
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
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedMessage.sender.name}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {getRelativeTime(selectedMessage.timestamp)}
                      </p>
                    </div>
                    <ChannelBadge channel={selectedMessage.channel} size="lg" />
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
