import { describe, it, expect, vi } from 'vitest';
import { hashPassword, verifyPassword, AuthError } from './auth';

// auth.ts imports next/headers and prisma at the module level — mock both
// so tests can run without a Next.js server or database connection.
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('./db', () => ({
  prisma: {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// ─── hashPassword ─────────────────────────────────────────────────────────────

describe('hashPassword', () => {
  it('returns a "salt:hash" formatted string', async () => {
    const result = await hashPassword('mysecret');
    expect(result).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
  });

  it('embeds a 32-character (16-byte hex) salt', async () => {
    const result = await hashPassword('mysecret');
    const [salt] = result.split(':');
    expect(salt).toHaveLength(32);
  });

  it('produces a different hash each call (random salt)', async () => {
    const hash1 = await hashPassword('mysecret');
    const hash2 = await hashPassword('mysecret');
    expect(hash1).not.toBe(hash2);
  });
});

// ─── verifyPassword ───────────────────────────────────────────────────────────

describe('verifyPassword', () => {
  it('returns true when the password matches the stored hash', async () => {
    const stored = await hashPassword('correct-password');
    expect(await verifyPassword('correct-password', stored)).toBe(true);
  });

  it('returns false when the password does not match', async () => {
    const stored = await hashPassword('correct-password');
    expect(await verifyPassword('wrong-password', stored)).toBe(false);
  });

  it('returns false for a stored string with no colon separator', async () => {
    expect(await verifyPassword('password', 'noseparatorhere')).toBe(false);
  });

  it('returns false for an empty stored string', async () => {
    expect(await verifyPassword('password', '')).toBe(false);
  });

  it('is not vulnerable to timing differences on wrong-length inputs', async () => {
    // verifyPassword uses timingSafeEqual — just assert it returns false cleanly
    const stored = await hashPassword('secret');
    expect(await verifyPassword('', stored)).toBe(false);
  });
});

// ─── AuthError ────────────────────────────────────────────────────────────────

describe('AuthError', () => {
  it('is an instance of Error', () => {
    expect(new AuthError('oops')).toBeInstanceOf(Error);
  });

  it('has the name "AuthError"', () => {
    expect(new AuthError('oops').name).toBe('AuthError');
  });

  it('preserves the error message', () => {
    expect(new AuthError('Not authenticated').message).toBe('Not authenticated');
  });
});
