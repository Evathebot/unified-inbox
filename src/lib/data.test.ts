import { describe, it, expect, vi } from 'vitest';
import { formatContactName, inferTopic, getTopicColor } from './data';

// data.ts imports prisma and an AI helper — mock them so tests stay pure
vi.mock('./db', () => ({ prisma: {} }));
vi.mock('./ai', () => ({ extractActionItems: vi.fn().mockResolvedValue([]) }));

// ─── formatContactName ────────────────────────────────────────────────────────

describe('formatContactName', () => {
  it('passes through a normal display name unchanged', () => {
    expect(formatContactName('Sarah Chen')).toBe('Sarah Chen');
  });

  it('returns "Unknown" for an empty string', () => {
    expect(formatContactName('')).toBe('Unknown');
  });

  it('strips @slackgo_ prefix and :beeper.local domain', () => {
    expect(formatContactName('@slackgo_johndoe:beeper.local')).toBe('johndoe');
  });

  it('strips @telegramgo_ prefix and :beeper.local domain', () => {
    expect(formatContactName('@telegramgo_alice:beeper.local')).toBe('alice');
  });

  it('strips @whatsappgo_ prefix and :beeper.im domain', () => {
    expect(formatContactName('@whatsappgo_carol:beeper.im')).toBe('carol');
  });

  it('strips @signalgo_ prefix', () => {
    expect(formatContactName('@signalgo_dave:beeper.local')).toBe('dave');
  });

  it('returns "Unknown Contact" for a hex/random ID in a Beeper domain', () => {
    expect(formatContactName('@abcdef1234567890abcdef1234:beeper.local')).toBe('Unknown Contact');
  });

  it('formats an 11-digit US number (with country code) as +1 (NXX) NXX-XXXX', () => {
    expect(formatContactName('14508214175')).toBe('+1 (450) 821-4175');
  });

  it('formats a 10-digit US number as (NXX) NXX-XXXX', () => {
    expect(formatContactName('4508214175')).toBe('(450) 821-4175');
  });

  it('adds a + prefix to other international numbers', () => {
    expect(formatContactName('+447911123456')).toBe('+447911123456');
  });
});

// ─── inferTopic ───────────────────────────────────────────────────────────────

describe('inferTopic', () => {
  it('returns "Finance" when subject contains "budget"', () => {
    expect(inferTopic('Q1 Budget Review', '')).toBe('Finance');
  });

  it('returns "Finance" when body contains "invoice"', () => {
    expect(inferTopic('', 'please send the invoice')).toBe('Finance');
  });

  it('returns "Marketing" for campaign-related content', () => {
    expect(inferTopic('Campaign Launch', 'new marketing plan')).toBe('Marketing');
  });

  it('returns "Design" when body contains "figma"', () => {
    expect(inferTopic('', 'see the figma link')).toBe('Design');
  });

  it('returns "Engineering" for api/code/bug content', () => {
    expect(inferTopic('Bug fix', 'fixed the api bug')).toBe('Engineering');
  });

  it('returns "Meeting" for scheduling content', () => {
    expect(inferTopic('Schedule a call', '')).toBe('Meeting');
  });

  it('returns "Hiring" for hiring-related content', () => {
    expect(inferTopic('', 'candidate interview onboard')).toBe('Hiring');
  });

  it('returns "Urgent" for urgent/deadline content', () => {
    expect(inferTopic('ASAP response needed', '')).toBe('Urgent');
  });

  it('returns undefined for unrecognised content', () => {
    expect(inferTopic('Hello', 'How are you?')).toBeUndefined();
  });

  it('is case-insensitive', () => {
    expect(inferTopic('BUDGET REVIEW', 'FINANCIAL PLANNING')).toBe('Finance');
  });
});

// ─── getTopicColor ────────────────────────────────────────────────────────────

describe('getTopicColor', () => {
  it('returns red classes for Finance', () => {
    expect(getTopicColor('Finance')).toBe('bg-red-100 text-red-700');
  });

  it('returns blue classes for Engineering', () => {
    expect(getTopicColor('Engineering')).toBe('bg-blue-100 text-blue-700');
  });

  it('returns purple classes for Design', () => {
    expect(getTopicColor('Design')).toBe('bg-purple-100 text-purple-700');
  });

  it('returns orange classes for Urgent', () => {
    expect(getTopicColor('Urgent')).toBe('bg-orange-100 text-orange-700');
  });

  it('returns the default gray classes for an unrecognised topic', () => {
    expect(getTopicColor('SomethingRandom')).toBe('bg-gray-100 text-gray-600');
  });

  it('matches case-insensitively', () => {
    expect(getTopicColor('FINANCE')).toBe('bg-red-100 text-red-700');
    expect(getTopicColor('engineering')).toBe('bg-blue-100 text-blue-700');
  });
});
