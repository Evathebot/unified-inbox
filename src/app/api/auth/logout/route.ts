/**
 * POST /api/auth/logout
 *
 * Deletes the current session from the database and clears the `session`
 * cookie. Safe to call even when the user is already logged out.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession } from '@/lib/auth';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('session', '', { maxAge: 0, path: '/' });
  return response;
}
