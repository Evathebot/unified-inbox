import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRelativeTime } from './mockData';

// Pin the current time so relative calculations are deterministic
const NOW = new Date('2026-01-15T12:00:00.000Z');

describe('getRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for a timestamp less than 1 minute ago', () => {
    const date = new Date(NOW.getTime() - 30 * 1000); // 30 seconds ago
    expect(getRelativeTime(date)).toBe('Just now');
  });

  it('returns "Xm ago" for timestamps between 1 and 59 minutes ago', () => {
    const date = new Date(NOW.getTime() - 30 * 60 * 1000); // 30 minutes ago
    expect(getRelativeTime(date)).toBe('30m ago');
  });

  it('returns "1m ago" for exactly 1 minute ago', () => {
    const date = new Date(NOW.getTime() - 60 * 1000);
    expect(getRelativeTime(date)).toBe('1m ago');
  });

  it('returns "Xh ago" for timestamps between 1 and 23 hours ago', () => {
    const date = new Date(NOW.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago
    expect(getRelativeTime(date)).toBe('4h ago');
  });

  it('returns "1h ago" for exactly 1 hour ago', () => {
    const date = new Date(NOW.getTime() - 60 * 60 * 1000);
    expect(getRelativeTime(date)).toBe('1h ago');
  });

  it('returns "Yesterday" for a timestamp exactly 24 hours ago', () => {
    const date = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
    expect(getRelativeTime(date)).toBe('Yesterday');
  });

  it('returns "Xd ago" for timestamps 2–6 days ago', () => {
    const date = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    expect(getRelativeTime(date)).toBe('3d ago');
  });

  it('returns a locale date string for timestamps 7+ days ago', () => {
    const date = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    expect(getRelativeTime(date)).toBe(date.toLocaleDateString());
  });
});
