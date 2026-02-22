'use client';

import { ArrowUp, SlidersHorizontal, ChevronRight, Plus, Sparkles, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import ChannelBadge from '@/components/ChannelBadge';
import ChannelContextBadge from '@/components/ChannelContextBadge';
import { getRelativeTime } from '@/lib/mockData';
import { ConversationGroup, SortType, AccountFilter } from './types';
import FilterPanel from './FilterPanel';

interface ConversationListProps {
  groups: ConversationGroup[];
  selectedGroup: ConversationGroup | null;
  onSelect: (group: ConversationGroup) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  showFilterPanel: boolean;
  setShowFilterPanel: (v: boolean) => void;
  activeFiltersCount: number;
  filterUnread: boolean;
  setFilterUnread: (v: boolean) => void;
  filterUnanswered: boolean;
  setFilterUnanswered: (v: boolean) => void;
  sortBy: SortType;
  setSortBy: (v: SortType) => void;
  accountFilter: AccountFilter;
  setAccountFilter: (v: AccountFilter) => void;
  unreadCount: number;
  activeCount: number;
  greeting: string;
  onCompose: () => void;
  // AI
  aiQuery: string;
  setAiQuery: (v: string) => void;
  aiResponse: string;
  setAiResponse: (v: string) => void;
  aiLoading: boolean;
  onAskAI: () => void;
}

export default function ConversationList({
  groups, selectedGroup, onSelect,
  searchQuery, setSearchQuery,
  showFilterPanel, setShowFilterPanel, activeFiltersCount,
  filterUnread, setFilterUnread, filterUnanswered, setFilterUnanswered,
  sortBy, setSortBy, accountFilter, setAccountFilter,
  unreadCount, activeCount, greeting, onCompose,
  aiQuery, setAiQuery, aiResponse, setAiResponse, aiLoading, onAskAI,
}: ConversationListProps) {
  return (
    <div className="w-full md:w-96 lg:w-[400px] border-r border-gray-200 flex flex-col bg-white relative">
      {/* Greeting header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{greeting}, Alex.</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              You&apos;ve got {unreadCount} new and {activeCount} active conversations.
            </p>
          </div>
          <button onClick={onCompose} className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 transition-colors" title="New message">
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
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Start typing to ask or search..." />
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

      {showFilterPanel && (
        <FilterPanel
          filterUnread={filterUnread} setFilterUnread={setFilterUnread}
          filterUnanswered={filterUnanswered} setFilterUnanswered={setFilterUnanswered}
          sortBy={sortBy} setSortBy={setSortBy}
          accountFilter={accountFilter} setAccountFilter={setAccountFilter}
          onClose={() => setShowFilterPanel(false)}
        />
      )}

      {/* Conversation items */}
      <div className="flex-1 overflow-y-auto">
        {groups.map((group) => {
          const latest = group.messages[group.messages.length - 1];
          const isSelected = selectedGroup?.senderName === group.senderName && selectedGroup?.channel === group.channel;
          return (
            <div
              key={`${group.senderName}::${group.channel}`}
              onClick={() => onSelect(group)}
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
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{group.messages.length}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {group.unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                      <span className="text-xs text-gray-400 shrink-0">{getRelativeTime(group.latestTimestamp)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {group.topicLabel && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 ${group.topicColor || 'bg-gray-100 text-gray-600'}`}>
                        {group.topicLabel}
                      </span>
                    )}
                    <p className="text-sm text-gray-500 line-clamp-1">{latest.subject || latest.preview}</p>
                  </div>
                  {group.channelContext && !group.channelContext.isDM && (
                    <div className="mt-1">
                      <ChannelContextBadge channel={group.channel} context={group.channelContext} compact />
                    </div>
                  )}
                  {group.hasAIDraft && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="ai-badge text-[10px] font-semibold text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles size={9} /> AI draft ready
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {groups.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No messages found</div>
        )}
      </div>

      {/* AI Ask input */}
      <div className="p-3 border-t border-gray-100">
        {aiResponse && (
          <div className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="ai-orb !w-3.5 !h-3.5" style={{ width: 14, height: 14 }}></div>
              <span className="text-[11px] font-medium text-gray-500">AI</span>
              <button onClick={() => setAiResponse('')} className="ml-auto text-gray-400 hover:text-gray-600"><X size={12} /></button>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{aiResponse}</p>
          </div>
        )}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <div className="ai-orb" style={{ width: 20, height: 20 }}>
              <div className="ai-orb-glow"></div>
            </div>
          </div>
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAskAI()}
            placeholder="Start typing to ask or search AI..."
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
          <button onClick={onAskAI} disabled={aiLoading}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${aiLoading ? 'text-orange-400 animate-spin' : 'text-gray-400 hover:text-gray-600'}`}>
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
