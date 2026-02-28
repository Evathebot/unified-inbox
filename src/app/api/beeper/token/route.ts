/**
 * GET /api/beeper/token
 *
 * Returns the stored Beeper Desktop access token + apiUrl for the
 * authenticated user. Used by the browser to perform client-side syncs
 * (since the Vercel server can't reach http://localhost:23373 on the user's Mac,
 * but the browser can).
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspace, AuthError } from '@/lib/auth';

export async function GET() {
  try {
    const workspace = await requireWorkspace();

    const connection = await prisma.connection.findFirst({
      where: { workspaceId: workspace.id, platform: 'beeper', status: 'active' },
    });

    if (!connection || !connection.accessToken || !connection.apiUrl) {
      return NextResponse.json({ error: 'No active Beeper connection' }, { status: 404 });
    }

    return NextResponse.json({
      apiUrl: connection.apiUrl,
      accessToken: connection.accessToken,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
