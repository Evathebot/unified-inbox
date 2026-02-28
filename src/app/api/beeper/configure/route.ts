import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/lib/auth';
import { BeeperService } from '@/lib/services/beeper';

/**
 * GET /api/beeper/configure — Return current connection status
 */
export async function GET() {
  try {
    const workspace = await requireWorkspace();

    const connection = await prisma.connection.findFirst({
      where: { workspaceId: workspace.id, platform: 'beeper' },
    });

    return NextResponse.json({
      connected: connection?.status === 'active',
      apiUrl: connection?.apiUrl || '',
      lastSyncAt: connection?.lastSyncAt || null,
    });
  } catch {
    return NextResponse.json({ connected: false, apiUrl: '' });
  }
}

/**
 * POST /api/beeper/configure — Save Beeper credentials and test connection
 * Body: { apiUrl: string; accessToken: string }
 */
export async function POST(request: Request) {
  try {
    // skipTest: true is passed by /beeper/callback when completing the OAuth flow
    // from the browser — the server can't reach localhost:23373 on Vercel, so we
    // trust the token that came from the OAuth flow directly.
    const { apiUrl, accessToken, skipTest = false } = await request.json();

    if (!apiUrl || !accessToken) {
      return NextResponse.json(
        { error: 'apiUrl and accessToken are required' },
        { status: 400 }
      );
    }

    // Test the connection before saving (only when not coming from the OAuth callback)
    if (!skipTest) {
      try {
        const beeper = new BeeperService({ apiUrl, accessToken });
        await beeper.getAccounts();
      } catch {
        return NextResponse.json(
          { error: 'Could not connect to Beeper. Check that Beeper Desktop is running and the credentials are correct.' },
          { status: 400 }
        );
      }
    }

    const workspace = await requireWorkspace();

    // Upsert the Beeper connection (find-first pattern to avoid unique constraint on null accountId)
    const existing = await prisma.connection.findFirst({
      where: { workspaceId: workspace.id, platform: 'beeper' },
    });

    const connection = existing
      ? await prisma.connection.update({
          where: { id: existing.id },
          data: { apiUrl, accessToken, status: 'active', updatedAt: new Date() },
        })
      : await prisma.connection.create({
          data: {
            workspaceId: workspace.id,
            platform: 'beeper',
            status: 'active',
            apiUrl,
            accessToken,
          },
        });

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      workspaceId: workspace.id,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
