'use client';

import { useState } from 'react';
import { Filter } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
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

  // Filter messages
  const filteredMessages = initialMessages.filter((message) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        message.sender.name.toLowerCase().includes(query) ||
        message.preview.toLowerCase().includes(query) ||
        (message.subject?.toLowerCase().includes(query) || false);
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filter === 'unread' && !message.unread) return false;
    if (filter === 'priority' && message.priority < 60) return false;

    return true;
  });

  return (
    <div className="h-screen flex">
      {/* Message List Column */}
      <div className="w-full md:w-96 lg:w-[420px] border-r border-white/[0.08] flex flex-col">
        {/* Header */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Inbox</h1>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center">
                <Filter size={18} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2">
            {(['all', 'unread', 'priority'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium capitalize
                  transition-all duration-200
                  ${
                    filter === f
                      ? 'bg-white/[0.12] text-white border border-white/[0.15]'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                  }
                `}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search messages..."
          />
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {filteredMessages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              isSelected={selectedMessage?.id === message.id}
              onClick={() => setSelectedMessage(message)}
            />
          ))}
          {filteredMessages.length === 0 && (
            <div className="text-center py-12 text-gray-500">No messages found</div>
          )}
        </div>
      </div>

      {/* Conversation Detail Column */}
      <div className="hidden lg:flex flex-1 flex-col">
        {selectedMessage ? (
          <>
            {/* Conversation Header */}
            <div className="p-6 border-b border-white/[0.08]">
              <GlassCard className="p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-3xl">
                      {selectedMessage.sender.avatar}
                    </div>
                    {selectedMessage.sender.online && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-white mb-1">
                          {selectedMessage.sender.name}
                        </h2>
                        <p className="text-sm text-gray-400 mb-3">
                          {getRelativeTime(selectedMessage.timestamp)}
                        </p>
                      </div>
                      <ChannelBadge channel={selectedMessage.channel} size="lg" />
                    </div>

                    {/* Mock relationship score */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 bg-white/[0.08] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-[85%] rounded-full" />
                        </div>
                        <span className="text-gray-400">85% relationship</span>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedMessage.subject && (
                <h3 className="text-xl font-semibold text-white mb-4">
                  {selectedMessage.subject}
                </h3>
              )}

              {selectedMessage.thread?.messages.map((msg, idx) => (
                <GlassCard key={idx} className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg">
                      {selectedMessage.sender.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{msg.from}</p>
                      <p className="text-xs text-gray-400">{getRelativeTime(msg.timestamp)}</p>
                    </div>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{msg.content}</p>
                </GlassCard>
              ))}
            </div>

            {/* AI Reply Box */}
            {selectedMessage.hasAIDraft && selectedMessage.aiDraft && (
              <div className="p-6 border-t border-white/[0.08]">
                <AIReplyBox
                  suggestedReply={selectedMessage.aiDraft}
                  onSend={(text) => console.log('Sending:', text)}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a message to view conversation
          </div>
        )}
      </div>
    </div>
  );
}
