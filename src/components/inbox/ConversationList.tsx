'use client';

import { SlidersHorizontal, Plus, Sparkles, Archive, CheckCheck, MessageSquare } from 'lucide-react';
import Avatar from '@/components/Avatar';
import GroupAvatar from '@/components/GroupAvatar';
import SearchBar from '@/components/SearchBar';
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
  onMarkAllRead: () => void;
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
  userName: string;
  onCompose: () => void;
}

/**
 * Scrollable list of conversation groups displayed in the left panel.
 *
 * Each row shows:
 * - GroupAvatar (2×2 collage) or Avatar with a channel-platform badge
 * - Sender name, numeric unread badge, and relative timestamp
 * - Latest message preview with an optional topic-label chip
 * - Channel context badge (workspace › channel) for Slack group convos
 * - "AI draft ready" chip when an AI reply has been pre-generated
 * - Archive button revealed on row hover
 *
 * Read rows are rendered at reduced opacity to create clear visual contrast
 * with unread rows. Priority conversations get a coloured left-border accent.
 *
 * All state and handlers are owned by `useInboxState` and passed as props —
 * this component is purely presentational.
 */
export default function ConversationList({
  groups, selectedGroup, onSelect, onArchive, onMarkAllRead,
  searchQuery, setSearchQuery,
  showFilterPanel, setShowFilterPanel, activeFiltersCount,
  filterUnread, setFilterUnread, filterUnanswered, setFilterUnanswered,
  sortBy, setSortBy, accountFilter, setAccountFilter,
  unreadCount, activeCount, greeting, userName, onCompose,
}: ConversationListProps) {
  return (
    <div className="w-full md:w-96 lg:w-[380px] border-r border-gray-200 flex flex-col bg-white relative">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">{greeting}, {userName.split(' ')[0]}.</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {unreadCount > 0 ? (
                <button
                  onClick={onMarkAllRead}
                  className="hover:text-gray-600 transition-colors underline underline-offset-2"
                  title="Mark all as read"
                >
                  {unreadCount} unread
                </button>
              ) : (
                <span>{unreadCount} unread</span>
              )}
              {' · '}{activeCount} total
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck size={15} />
              </button>
            )}
            <button
              onClick={onCompose}
              className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
              title="New message (c)"
            >
              <Plus size={16} />
            </button>
          </div>
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
          const isUnread = group.unreadCount > 0;
          const isSelected =
            selectedGroup?.senderName === group.senderName &&
            selectedGroup?.channel === group.channel;

          const isPriority = group.highestPriority >= 70;
          const priorityBorderColor = group.highestPriority >= 80 ? 'border-l-red-500' : 'border-l-orange-400';

          return (
            <div
              key={group._groupKey}
              onClick={() => onSelect(group)}
              className={`group relative px-4 py-2.5 cursor-pointer border-b border-gray-100 transition-all duration-100 ${
                isSelected
                  ? 'bg-blue-50'
                  : isPriority
                  ? 'bg-orange-50/30 hover:bg-orange-50/60'
                  : isUnread
                  ? 'hover:bg-gray-50'
                  : 'hover:bg-gray-50 opacity-75'
              } ${isPriority ? `border-l-2 ${priorityBorderColor}` : ''}`}
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
                {/* Avatar with channel icon overlay */}
                <div className="relative shrink-0 mt-0.5">
                  {group.isGroupConversation && group.memberAvatars && group.memberAvatars.length > 0 ? (
                    <GroupAvatar
                      memberAvatars={group.memberAvatars}
                      memberNames={group.memberNames ?? [group.senderName]}
                      size="md"
                      channel={group.channel}
                    />
                  ) : (
                    <Avatar
                      src={group.senderAvatar}
                      name={group.senderName}
                      size="md"
                      online={group.senderOnline}
                      channel={group.channel}
                    />
                  )}
                  {/* Priority dot — bottom-left of avatar */}
                  {isPriority && (
                    <div className="absolute -bottom-0.5 -left-0.5">
                      <PriorityDot priority={group.highestPriority} size="sm" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className={`text-sm truncate ${
                        isUnread ? 'font-semibold text-gray-900' : 'font-normal text-gray-500'
                      }`}>
                        {group.senderName}
                      </h3>
                      {isPriority && (
                        <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${group.highestPriority >= 80 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                          Priority
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Numeric unread badge */}
                      {isUnread && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {group.unreadCount > 99 ? '99+' : group.unreadCount}
                        </span>
                      )}
                      <span className={`text-[11px] ${isUnread ? 'text-gray-500 font-medium' : 'text-gray-400'}`}>
                        {getRelativeTime(group.latestTimestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Preview row */}
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {group.topicLabel && (
                      <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${group.topicColor || 'bg-gray-100 text-gray-600'}`}>
                        {group.topicLabel}
                      </span>
                    )}
                    <p className={`text-xs line-clamp-1 ${isUnread ? 'text-gray-600' : 'text-gray-400'}`}>
                      {group.isGroupConversation
                        ? <><span className={`font-medium ${isUnread ? 'text-gray-700' : 'text-gray-500'}`}>{latest.sender.name}:</span>{' '}{latest.subject || latest.preview}</>
                        : (latest.subject || latest.preview)
                      }
                    </p>
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
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            {searchQuery || activeFiltersCount > 0 ? (
              <>
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <SlidersHorizontal size={20} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">No conversations match</p>
                <p className="text-xs text-gray-400 mb-4">Try adjusting your search or filters</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <MessageSquare size={20} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Your inbox is empty</p>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  Connect your accounts and sync messages<br />to get started.
                </p>
                <a
                  href="/settings"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Go to Settings → Sync Now
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
