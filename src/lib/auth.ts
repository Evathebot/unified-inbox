/**
 * Auth utilities — session management, password hashing
 *
 * Sessions are stored in the DB. The session token is kept in an httpOnly
 * cookie. Middleware checks the cookie exists; API routes call requireWorkspace()
 * to validate the session and get the caller's workspace.
 */

import { cookies } from 'next/headers';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { prisma } from './db';

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = 'session';
const SESSION_TTL_DAYS = 30;

// ─── Password hashing ────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, 'hex');
  const supplied = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(hashBuf, supplied);
}

// ─── Session management ───────────────────────────────────────────────────────

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, token, expiresAt } });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

/** Returns the session (with user + workspace) or null if missing/expired. */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: { workspace: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

/** Returns the current user's workspace, or null if not authenticated. */
export async function getWorkspace() {
  const session = await getSession();
  return session?.user?.workspace ?? null;
}

/**
 * Returns the workspace or throws a 401-ready error object.
 * Use in API routes: `const workspace = await requireWorkspace();`
 */
export async function requireWorkspace() {
  const workspace = await getWorkspace();
  if (!workspace) throw new AuthError('Not authenticated');
  return workspace;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
