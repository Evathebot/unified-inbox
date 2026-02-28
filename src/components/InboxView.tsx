'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ConversationGroup } from '@/components/inbox/types';
import { useInboxState } from '@/hooks/useInboxState';
import ConversationList from '@/components/inbox/ConversationList';
import ConversationDetail from '@/components/inbox/ConversationDetail';
import ComposePanel from '@/components/inbox/ComposePanel';
import { InboxViewProps } from '@/components/inbox/types';

export default function InboxView({ initialMessages }: InboxViewProps) {
  const router = useRouter();
  const state = useInboxState(initialMessages);
  const [userName, setUserName] = useState('');
  const [archivedToast, setArchivedToast] = useState<ConversationGroup | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.name) setUserName(d.name); })
      .catch(() => {});
  }, []);

  // Keep a ref to always have the latest state in the keyboard handler
  const stateRef = useRef(state);
  stateRef.current = state;

  // Poll the DB every 10 seconds and re-render with fresh data
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(interval);
  }, [router]);

  // Pull new messages from Beeper Desktop → DB every 30 seconds.
  //
  // Strategy (two modes, auto-detected):
  //
  //  A) Browser-push (Vercel / production): The server cannot reach
  //     localhost:23373 on the user's machine, but the browser can.
  //     We fetch the stored Beeper token from our API, use it to call
  //     Beeper Desktop directly from the browser, then POST the collected
  //     data to /api/sync so the server can persist it.
  //
  //  B) Server-fetch (local dev): POST with no body → server calls
  //     localhost:23373 directly. Used as the fallback when browser-push
  //     fails or when the token endpoint is unavailable.
  //
  // After each sync the next router.refresh() above picks up the new rows.
  useEffect(() => {
    const browserPushSync = async () => {
      try {
        // Step 1: Retrieve the stored Beeper credentials from our DB.
        const tokenRes = await fetch('/api/beeper/token');
        if (!tokenRes.ok) {
          // No active Beeper connection — fall back to server-fetch mode.
          fetch('/api/sync', { method: 'POST' }).catch(() => {});
          return;
        }
        const { apiUrl, accessToken } = await tokenRes.json();
        if (!apiUrl || !accessToken) {
          fetch('/api/sync', { method: 'POST' }).catch(() => {});
          return;
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        };

        // Step 2: Fetch accounts + chats in parallel from Beeper Desktop.
        const [accountsRes, chatsRes] = await Promise.all([
          fetch(`${apiUrl}/v1/accounts`, { headers, signal: AbortSignal.timeout(8000) }),
          fetch(`${apiUrl}/v1/chats?limit=50&includeMuted=true`, { headers, signal: AbortSignal.timeout(8000) }),
        ]);

        if (!accountsRes.ok || !chatsRes.ok) {
          // Beeper Desktop unreachable or returned an error; try server-fetch.
          fetch('/api/sync', { method: 'POST' }).catch(() => {});
          return;
        }

        const accountsData = await accountsRes.json();
        const chatsData = await chatsRes.json();

        // Normalise: Beeper can return the list as .value, .items, or a raw array.
        const accounts: unknown[] = accountsData?.value ?? accountsData?.items ?? accountsData ?? [];
        const chats: unknown[] = chatsData?.items ?? chatsData?.value ?? chatsData ?? [];

        // Step 3: Fetch recent messages for each chat (parallel, best-effort).
        const messagesMap: Record<string, unknown[]> = {};
        await Promise.all(
          (chats as Array<{ id: string }>).map(async (chat) => {
            try {
              const msgRes = await fetch(
                `${apiUrl}/v1/chats/${encodeURIComponent(chat.id)}/messages?limit=20`,
                { headers, signal: AbortSignal.timeout(8000) },
              );
              if (msgRes.ok) {
                const msgData = await msgRes.json();
                messagesMap[chat.id] = msgData?.items ?? msgData?.value ?? msgData ?? [];
              }
            } catch {
              // Skip this chat — don't let one failure block the rest.
            }
          }),
        );

        // Step 4: Push everything to the server for DB persistence.
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accounts, chats, messagesMap }),
        });
      } catch {
        // Network error (Beeper Desktop not running, CORS issue, etc.)
        // Fall back to server-fetch so local dev still works.
        fetch('/api/sync', { method: 'POST' }).catch(() => {});
      }
    };

    // Run once immediately so messages are fresh on first load, then repeat.
    browserPushSync();
    const interval = setInterval(browserPushSync, 30_000);
    return () => clearInterval(interval);
  }, []);

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
        g => g._groupKey === effectiveSelected?._groupKey,
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
        // Focus reply textarea — prevent the 'r' character from being typed into it
        const el = document.querySelector('[data-reply-textarea]') as HTMLTextAreaElement;
        if (el) { e.preventDefault(); el.focus(); }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Archive with toast + undo
  const handleArchiveWithToast = useCallback((group: ConversationGroup) => {
    state.handleArchive(group);
    setArchivedToast(group);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setArchivedToast(null), 4000);
  }, [state]);

  const handleUndoArchive = useCallback(() => {
    if (archivedToast) {
      state.handleUnarchive(archivedToast);
      setArchivedToast(null);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    }
  }, [archivedToast, state]);

  // On mobile, show detail view when a conversation is explicitly selected or composing.
  // Use hasSelectedGroup (not effectiveSelected) so that after Back is tapped and
  // selectedGroup is set to null, the panel actually hides even though effectiveSelected
  // still resolves to groups[0] as a fallback.
  const showMobileDetail = state.hasSelectedGroup || state.showCompose;

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* Left panel — hidden on mobile when detail is open */}
      <div className={`${showMobileDetail ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-auto overflow-hidden`}>
        <ConversationList
          groups={state.conversationGroups}
          selectedGroup={state.effectiveSelected}
          onSelect={state.handleSelectGroup}
          onArchive={handleArchiveWithToast}
          onMarkAllRead={state.handleMarkAllRead}
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
          userName={userName}
          onCompose={state.handleOpenCompose}
        />
      </div>

      {/* Right panel — full screen on mobile when open, hidden when no selection on desktop */}
      <div className={`${showMobileDetail ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-gray-50 overflow-hidden`}>
        {/* Mobile back button */}
        <div className="lg:hidden flex items-center px-4 py-3 border-b border-gray-200 bg-white">
          <button
            onClick={() => {
              state.handleDeselect();
              if (state.showCompose) state.handleDiscardCompose();
            }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

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
      {/* Archive undo toast */}
      {archivedToast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
          <span>Conversation archived</span>
          <button
            onClick={handleUndoArchive}
            className="font-semibold text-blue-300 hover:text-blue-200 transition-colors"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
