'use client';

import { SlidersHorizontal, Plus, Sparkles, Archive } from 'lucide-react';
import Avatar from '@/components/Avatar';
import SearchBar from '@/components/SearchBar';
import ChannelBadge from '@/components/ChannelBadge';
import ChannelContextBadge from '@/components/ChannelContextBadge';
import PriorityDot from '@/components/PriorityDot';
import { getRelativeTime } from '@/lib/mockData';
import { ConversationGroup, SortType, AccountFilter } from './types';
import FilterPanel from './FilterPanel';

interface ConversationListProps {
  groups: ConversationGroup[];
  selectedGroup: ConversationGroup | null;
  onSelect: (group: ConversationGroup) => void;
  onArchive: (group: ConversationGroup) => void;
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
}

export default function ConversationList({
  groups, selectedGroup, onSelect, onArchive,
  searchQuery, setSearchQuery,
  showFilterPanel, setShowFilterPanel, activeFiltersCount,
  filterUnread, setFilterUnread, filterUnanswered, setFilterUnanswered,
  sortBy, setSortBy, accountFilter, setAccountFilter,
  unreadCount, activeCount, greeting, onCompose,
}: ConversationListProps) {
  return (
    <div className="w-full md:w-96 lg:w-[380px] border-r border-gray-200 flex flex-col bg-white relative">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">{greeting}, Alex.</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {unreadCount} unread · {activeCount} total
            </p>
          </div>
          <button
            onClick={onCompose}
            className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
            title="New message (c)"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="px-3 py-2 flex gap-2">
        <div className="flex-1">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search conversations..." />
        </div>
        <button
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className={`relative w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
            showFilterPanel || activeFiltersCount > 0
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal size={15} />
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
          const isSelected =
            selectedGroup?.senderName === group.senderName &&
            selectedGroup?.channel === group.channel;

          return (
            <div
              key={`${group.senderName}::${group.channel}`}
              onClick={() => onSelect(group)}
              className={`group relative px-4 py-2.5 cursor-pointer border-b border-gray-100 transition-all duration-100 ${
                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              {/* Selected left accent */}
              {isSelected && (
                <span className="absolute inset-y-0 left-0 w-0.5 bg-blue-500 rounded-r" />
              )}

              {/* Archive button — appears on row hover */}
              <button
                onClick={(e) => { e.stopPropagation(); onArchive(group); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all z-10"
                title="Archive (e)"
              >
                <Archive size={13} className="text-gray-500" />
              </button>

              <div className="flex items-start gap-2.5 pr-6">
                {/* Avatar with priority dot overlay */}
                <div className="relative shrink-0 mt-0.5">
                  <Avatar src={group.senderAvatar} name={group.senderName} size="md" online={group.senderOnline} />
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <PriorityDot priority={group.highestPriority} size="sm" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className={`text-sm truncate ${group.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {group.senderName}
                      </h3>
                      <ChannelBadge channel={group.channel} size="sm" />
                      {group.messages.length > 1 && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                          {group.messages.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {group.unreadCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                      <span className="text-[11px] text-gray-400">{getRelativeTime(group.latestTimestamp)}</span>
                    </div>
                  </div>

                  {/* Preview row */}
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {group.topicLabel && (
                      <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${group.topicColor || 'bg-gray-100 text-gray-600'}`}>
                        {group.topicLabel}
                      </span>
                    )}
                    <p className="text-xs text-gray-500 line-clamp-1">{latest.subject || latest.preview}</p>
                  </div>

                  {/* Channel context */}
                  {group.channelContext && !group.channelContext.isDM && (
                    <div className="mt-0.5">
                      <ChannelContextBadge channel={group.channel} context={group.channelContext} compact />
                    </div>
                  )}

                  {/* AI draft badge */}
                  {group.hasAIDraft && (
                    <div className="mt-1">
                      <span className="ai-badge text-[10px] font-semibold text-white px-2 py-0.5 rounded-full inline-flex items-center gap-1">
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
    </div>
  );
}
