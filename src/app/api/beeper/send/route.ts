/**
 * POST /api/beeper/send
 *
 * Server-side proxy that forwards a message to Beeper Desktop
 * (http://localhost:23373 on the user's machine).
 *
 * Why a proxy?  The browser can't call localhost:23373 directly because
 * Beeper Desktop doesn't set CORS headers for third-party origins.
 * Routing through Next.js server-side avoids the CORS restriction.
 *
 * Note: This only works when the Next.js server and Beeper Desktop run on
 * the same machine (local dev).  On Vercel/production the server can't
 * reach localhost:23373 and we return a clear 503 rather than hanging.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspace, AuthError } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const workspace = await requireWorkspace();

    const body = await request.json();
    const { chatId, text } = body as { chatId?: string; text?: string };

    if (!chatId || !text?.trim()) {
      return NextResponse.json({ error: 'chatId and text are required' }, { status: 400 });
    }

    // Look up active Beeper connection for this workspace
    const connection = await prisma.connection.findFirst({
      where: { workspaceId: workspace.id, platform: 'beeper', status: 'active' },
    });

    if (!connection?.accessToken || !connection?.apiUrl) {
      return NextResponse.json({ error: 'No active Beeper connection' }, { status: 503 });
    }

    const encodedChatId = encodeURIComponent(chatId);
    const url = `${connection.apiUrl}/v1/chats/${encodedChatId}/messages`;

    const beeperRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.trim() }),
      // 10-second timeout — Beeper Desktop should respond quickly
      signal: AbortSignal.timeout(10_000),
    });

    if (!beeperRes.ok) {
      const errText = await beeperRes.text().catch(() => '');
      console.error('[Beeper send proxy] Beeper returned', beeperRes.status, errText);
      return NextResponse.json(
        { error: `Beeper returned ${beeperRes.status}`, detail: errText },
        { status: beeperRes.status },
      );
    }

    const sentMsg = await beeperRes.json().catch(() => null);
    return NextResponse.json({ ok: true, message: sentMsg });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    // Network errors (ECONNREFUSED, timeout) mean Beeper Desktop isn't running
    const isNetworkErr =
      error?.cause?.code === 'ECONNREFUSED' ||
      error?.name === 'TimeoutError' ||
      error?.name === 'AbortError';
    if (isNetworkErr) {
      return NextResponse.json(
        { error: 'Beeper Desktop not reachable — make sure it is running on this machine' },
        { status: 503 },
      );
    }
    console.error('[Beeper send proxy] Unexpected error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
