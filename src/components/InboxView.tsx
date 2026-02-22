'use client';

import { useInboxState } from '@/hooks/useInboxState';
import ConversationList from '@/components/inbox/ConversationList';
import ConversationDetail from '@/components/inbox/ConversationDetail';
import ComposePanel from '@/components/inbox/ComposePanel';
import { InboxViewProps } from '@/components/inbox/types';

export default function InboxView({ initialMessages }: InboxViewProps) {
  const state = useInboxState(initialMessages);

  return (
    <div className="h-screen flex">
      {/* Left panel */}
      <ConversationList
        groups={state.conversationGroups}
        selectedGroup={state.effectiveSelected}
        onSelect={state.handleSelectGroup}
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
        aiQuery={state.aiQuery}
        setAiQuery={state.setAiQuery}
        aiResponse={state.aiResponse}
        setAiResponse={state.setAiResponse}
        aiLoading={state.aiLoading}
        onAskAI={state.handleAskAI}
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
