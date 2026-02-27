'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useInboxState } from '@/hooks/useInboxState';
import ConversationList from '@/components/inbox/ConversationList';
import ConversationDetail from '@/components/inbox/ConversationDetail';
import ComposePanel from '@/components/inbox/ComposePanel';
import { InboxViewProps } from '@/components/inbox/types';

export default function InboxView({ initialMessages }: InboxViewProps) {
  const router = useRouter();
  const state = useInboxState(initialMessages);

  // Keep a ref to always have the latest state in the keyboard handler
  const stateRef = useRef(state);
  stateRef.current = state;

  // Poll for new messages every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't hijack when typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;

      const {
        conversationGroups,
        effectiveSelected,
        handleSelectGroup,
        handleArchive,
      } = stateRef.current;

      const currentIdx = conversationGroups.findIndex(
        g =>
          g.senderName === effectiveSelected?.senderName &&
          g.channel === effectiveSelected?.channel
      );

      if (e.key === 'j') {
        // Next conversation
        const next = conversationGroups[currentIdx + 1];
        if (next) handleSelectGroup(next);
      } else if (e.key === 'k') {
        // Previous conversation
        const prev = conversationGroups[currentIdx - 1];
        if (prev) handleSelectGroup(prev);
      } else if (e.key === 'e') {
        // Archive current conversation
        if (effectiveSelected) handleArchive(effectiveSelected);
      } else if (e.key === 'r') {
        // Focus reply textarea
        (document.querySelector('[data-reply-textarea]') as HTMLTextAreaElement)?.focus();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-screen flex">
      {/* Left panel */}
      <ConversationList
        groups={state.conversationGroups}
        selectedGroup={state.effectiveSelected}
        onSelect={state.handleSelectGroup}
        onArchive={state.handleArchive}
        searchQuery={state.searchQuery}
        setSearchQuery={state.setSearchQuery}
        showFilterPanel={state.showFilterPanel}
        setShowFilterPanel={state.setShowFilterPanel}
        activeFiltersCount={state.activeFiltersCount}
        filterUnread={state.filterUnread}
        setFilterUnread={state.setFilterUnread}
        filterUnanswered={state.filterUnanswered}
        setFilterUnanswered={state.setFilterUnanswered}
        sortBy={state.sortBy}
        setSortBy={state.setSortBy}
        accountFilter={state.accountFilter}
        setAccountFilter={state.setAccountFilter}
        unreadCount={state.unreadCount}
        activeCount={state.activeCount}
        greeting={state.getGreeting()}
        onCompose={state.handleOpenCompose}
      />

      {/* Right panel */}
      <div className="hidden lg:flex flex-1 flex-col bg-gray-50">
        {state.showCompose ? (
          <ComposePanel
            composeTo={state.composeTo}
            setComposeTo={state.setComposeTo}
            composeChannel={state.composeChannel}
            setComposeChannel={state.setComposeChannel}
            composeSubject={state.composeSubject}
            setComposeSubject={state.setComposeSubject}
            composeBody={state.composeBody}
            setComposeBody={state.setComposeBody}
            onDiscard={state.handleDiscardCompose}
            onSend={state.handleSendCompose}
          />
        ) : state.effectiveSelected ? (
          <ConversationDetail group={state.effectiveSelected} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}
