/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's basic profile
 * (`{ id, name, email }`) or a 401 if the session cookie is absent/expired.
 * Used by the client to verify auth state on load.
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { user } = session;
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    workspaceId: user.workspace?.id,
  });
}
