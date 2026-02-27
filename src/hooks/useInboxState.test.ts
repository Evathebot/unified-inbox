import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useInboxState } from './useInboxState';
import type { Message } from '@/lib/mockData';

// Mock next/navigation — expose useSearchParams as a vi.fn() so individual
// tests can override the return value to simulate URL params.
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({ get: () => null })),
}));

// Fire-and-forget API calls inside the hook should not throw in tests
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

// ─── test helpers ─────────────────────────────────────────────────────────────

let nextId = 0;

/** Create a minimal valid Message, overriding only what each test needs. */
function makeMsg(overrides: Partial<Message> = {}): Message {
  return {
    id: String(++nextId),
    channel: 'gmail',
    sender: { name: 'Alice', avatar: '👤', online: false },
    preview: 'Test preview',
    timestamp: new Date('2026-01-15T12:00:00'),
    priority: 50,
    unread: true,
    answered: false,
    account: 'work',
    hasAIDraft: false,
    ...overrides,
  };
}

// ─── conversation grouping ────────────────────────────────────────────────────

describe('conversation grouping', () => {
  beforeEach(() => {
    nextId = 0;
    localStorage.clear();
  });

  it('groups messages that share a conversationId', () => {
    const messages = [
      makeMsg({ conversationId: 'conv1' }),
      makeMsg({ conversationId: 'conv1', sender: { name: 'Bob', avatar: '👤', online: false } }),
    ];
    const { result } = renderHook(() => useInboxState(messages));
    expect(result.current.conversationGroups).toHaveLength(1);
  });

  it('groups messages from the same sender on the same channel', () => {
    const messages = [
      makeMsg({ sender: { name: 'Alice', avatar: '👤', online: false }, channel: 'gmail' }),
      makeMsg({ sender: { name: 'Alice', avatar: '👤', online: false }, channel: 'gmail' }),
    ];
    const { result } = renderHook(() => useInboxState(messages));
    expect(result.current.conversationGroups).toHaveLength(1);
  });

  it('creates separate groups for the same sender on different channels', () => {
    const messages = [
      makeMsg({ sender: { name: 'Alice', avatar: '👤', online: false }, channel: 'gmail' }),
      makeMsg({ sender: { name: 'Alice', avatar: '👤', online: false }, channel: 'slack' }),
    ];
    const { result } = renderHook(() => useInboxState(messages));
    expect(result.current.conversationGroups).toHaveLength(2);
  });

  it('creates separate groups for different senders on the same channel', () => {
    const messages = [
      makeMsg({ sender: { name: 'Alice', avatar: '👤', online: false }, channel: 'gmail' }),
      makeMsg({ sender: { name: 'Bob', avatar: '👤', online: false }, channel: 'gmail' }),
    ];
    const { result } = renderHook(() => useInboxState(messages));
    expect(result.current.conversationGroups).toHaveLength(2);
  });
});

// ─── unread count ─────────────────────────────────────────────────────────────

describe('unread count', () => {
  beforeEach(() => {
    nextId = 0;
    localStorage.clear();
  });

  it('counts all initially-unread messages', () => {
    const messages = [makeMsg({ unread: true }), makeMsg({ unread: true }), makeMsg({ unread: false })];
    const { result } = renderHook(() => useInboxState(messages));
    expect(result.current.unreadCount).toBe(2);
  });

  it('drops to 0 after selecting the group containing those messages', () => {
    const messages = [
      makeMsg({ unread: true, sender: { name: 'Alice', avatar: '👤', online: false } }),
      makeMsg({ unread: true, sender: { name: 'Alice', avatar: '👤', online: false } }),
    ];
    const { result } = renderHook(() => useInboxState(messages));
    expect(result.current.unreadCount).toBe(2);

    act(() => {
      result.current.handleSelectGroup(result.current.conversationGroups[0]);
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it('sets unreadCount to 0 after handleMarkAllRead', () => {
    const messages = [makeMsg({ unread: true }), makeMsg({ unread: true })];
    const { result } = renderHook(() => useInboxState(messages));
    expect(result.current.unreadCount).toBe(2);

    act(() => result.current.handleMarkAllRead());

    expect(result.current.unreadCount).toBe(0);
  });
});

// ─── filtering ────────────────────────────────────────────────────────────────

describe('filtering', () => {
  beforeEach(() => {
    nextId = 0;
    localStorage.clear();
  });

  it('filters by sender name when a search query is entered', () => {
    const messages = [
      makeMsg({ sender: { name: 'Alice Johnson', avatar: '👤', online: false } }),
      makeMsg({ sender: { name: 'Bob Smith', avatar: '👤', online: false } }),
    ];
    const { result } = renderHook(() => useInboxState(messages));

    act(() => result.current.setSearchQuery('alice'));

    expect(result.current.conversationGroups).toHaveLength(1);
    expect(result.current.conversationGroups[0].senderName).toBe('Alice Johnson');
  });

  it('filters by preview text when a search query is entered', () => {
    const messages = [
      makeMsg({ sender: { name: 'Alice', avatar: '👤', online: false }, preview: 'hello world' }),
      makeMsg({ sender: { name: 'Bob', avatar: '👤', online: false }, preview: 'goodbye world' }),
    ];
    const { result } = renderHook(() => useInboxState(messages));

    act(() => result.current.setSearchQuery('hello'));

    expect(result.current.conversationGroups).toHaveLength(1);
  });

  it('hides read messages when filterUnread is enabled', () => {
    const messages = [
      makeMsg({ sender: { name: 'Alice', avatar: '👤', online: false }, unread: true }),
      makeMsg({ sender: { name: 'Bob', avatar: '👤', online: false }, unread: false }),
    ];
    const { result } = renderHook(() => useInboxState(messages));

    act(() => result.current.setFilterUnread(true));

    expect(result.current.conversationGroups).toHaveLength(1);
    expect(result.current.conversationGroups[0].senderName).toBe('Alice');
  });

  it('hides answered messages when filterUnanswered is enabled', () => {
    const messages = [
      makeMsg({ sender: { name: 'Alice', avatar: '👤', online: false }, answered: false }),
      makeMsg({ sender: { name: 'Bob', avatar: '👤', online: false }, answered: true }),
    ];
    const { result } = renderHook(() => useInboxState(messages));

    act(() => result.current.setFilterUnanswered(true));

    expect(result.current.conversationGroups).toHaveLength(1);
    expect(result.current.conversationGroups[0].senderName).toBe('Alice');
  });

  it('filters by channel when useSearchParams returns a channel value', async () => {
    const { useSearchParams } = await import('next/navigation');
    vi.mocked(useSearchParams).mockReturnValue({ get: (k: string) => (k === 'channel' ? 'slack' : null) } as any);

    const messages = [
      makeMsg({ sender: { name: 'Alice', avatar: '👤', online: false }, channel: 'gmail' }),
      makeMsg({ sender: { name: 'Bob', avatar: '👤', online: false }, channel: 'slack' }),
    ];
    const { result } = renderHook(() => useInboxState(messages));

    expect(result.current.conversationGroups).toHaveLength(1);
    expect(result.current.conversationGroups[0].channel).toBe('slack');

    // Reset mock for subsequent tests
    vi.mocked(useSearchParams).mockReturnValue({ get: () => null } as any);
  });
});

// ─── sorting ──────────────────────────────────────────────────────────────────

describe('sorting', () => {
  beforeEach(() => {
    nextId = 0;
    localStorage.clear();
  });

  it('sorts by priority (highest first) by default', () => {
    const messages = [
      makeMsg({ priority: 30, sender: { name: 'LowPri', avatar: '👤', online: false } }),
      makeMsg({ priority: 90, sender: { name: 'HighPri', avatar: '👤', online: false } }),
      makeMsg({ priority: 60, sender: { name: 'MidPri', avatar: '👤', online: false } }),
    ];
    const { result } = renderHook(() => useInboxState(messages));

    const names = result.current.conversationGroups.map(g => g.senderName);
    expect(names).toEqual(['HighPri', 'MidPri', 'LowPri']);
  });

  it('sorts by most recent timestamp when sortBy is "recent"', () => {
    const messages = [
      makeMsg({ sender: { name: 'Old', avatar: '👤', online: false }, timestamp: new Date('2026-01-01') }),
      makeMsg({ sender: { name: 'New', avatar: '👤', online: false }, timestamp: new Date('2026-01-15') }),
    ];
    const { result } = renderHook(() => useInboxState(messages));

    act(() => result.current.setSortBy('recent'));

    expect(result.current.conversationGroups[0].senderName).toBe('New');
    expect(result.current.conversationGroups[1].senderName).toBe('Old');
  });
});

// ─── archive ──────────────────────────────────────────────────────────────────

describe('archive', () => {
  beforeEach(() => {
    nextId = 0;
    localStorage.clear();
  });

  it('removes the archived group from the conversation list', () => {
    const messages = [
      makeMsg({ sender: { name: 'Alice', avatar: '👤', online: false } }),
      makeMsg({ sender: { name: 'Bob', avatar: '👤', online: false } }),
    ];
    const { result } = renderHook(() => useInboxState(messages));
    expect(result.current.conversationGroups).toHaveLength(2);

    act(() => result.current.handleArchive(result.current.conversationGroups[0]));

    expect(result.current.conversationGroups).toHaveLength(1);
  });
});

// ─── activeFiltersCount ───────────────────────────────────────────────────────

describe('activeFiltersCount', () => {
  beforeEach(() => {
    nextId = 0;
    localStorage.clear();
  });

  it('is 0 when no filters are active', () => {
    const { result } = renderHook(() => useInboxState([]));
    expect(result.current.activeFiltersCount).toBe(0);
  });

  it('increments by 1 for each filter enabled', () => {
    const { result } = renderHook(() => useInboxState([]));

    act(() => result.current.setFilterUnread(true));
    expect(result.current.activeFiltersCount).toBe(1);

    act(() => result.current.setFilterUnanswered(true));
    expect(result.current.activeFiltersCount).toBe(2);

    act(() => result.current.setAccountFilter('work'));
    expect(result.current.activeFiltersCount).toBe(3);
  });
});
