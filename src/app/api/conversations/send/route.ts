import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/lib/auth';

/**
 * POST /api/conversations/send
 *
 * Two modes:
 *
 * MODE A — Browser-side send (preferred in production):
 *   The browser already sent the message directly to Beeper Desktop
 *   (localhost:23373) and just needs us to save it to the DB.
 *   Body: { conversationId, text, channel, externalMessageId? }
 *
 * MODE B — Legacy server-side save (fallback / non-Beeper channels):
 *   Body: { senderName, channel, text }
 *   Returns { success: true, demo: true } when no Beeper connection is found.
 *
 * Returns:
 *   { success: true, messageId }  — saved OK
 *   { success: true, demo: true } — no Beeper connection (mode B only)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const workspace = await requireWorkspace();

    // ── MODE A: Browser already sent; just persist to DB ──────────────────
    if (body.conversationId) {
      const { conversationId, text, channel, externalMessageId } = body as {
        conversationId: string;
        text: string;
        channel?: string;
        externalMessageId?: string;
      };

      if (!conversationId || !text?.trim()) {
        return NextResponse.json({ error: 'conversationId and text are required' }, { status: 400 });
      }

      // Verify the conversation belongs to this workspace
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId: workspace.id },
      });

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      const savedMessage = await prisma.message.create({
        data: {
          workspaceId: workspace.id,
          conversationId,
          externalId: externalMessageId ?? `local-${Date.now()}`,
          channel: channel || conversation.channel,
          senderName: 'Me',
          body: text.trim(),
          timestamp: new Date(),
          read: true,
          priority: 0,
        },
      });

      // Also bump the conversation's lastMessageAt
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }).catch(() => {}); // non-fatal

      return NextResponse.json({ success: true, messageId: savedMessage.id });
    }

    // ── MODE B: Legacy fallback — try server-side Beeper send ─────────────
    const { senderName, channel, text } = body as {
      senderName: string;
      channel: string;
      text: string;
    };

    if (!senderName || !channel || !text?.trim()) {
      return NextResponse.json(
        { error: 'senderName, channel, and text are required' },
        { status: 400 },
      );
    }

    // Check for an active Beeper connection
    const connection = await prisma.connection.findFirst({
      where: { workspaceId: workspace.id, platform: 'beeper', status: 'active' },
    });

    if (!connection?.accessToken || !connection?.apiUrl) {
      // No Beeper connection — graceful demo fallback
      return NextResponse.json({ success: true, demo: true, reason: 'no_beeper_connection' });
    }

    // Find the conversation to get its externalId
    const conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId: workspace.id,
        channel,
        contact: { name: { contains: senderName } },
      },
    });

    if (!conversation?.externalId) {
      return NextResponse.json({ success: true, demo: true, reason: 'conversation_not_synced' });
    }

    // The server cannot reach localhost:23373 in production — return demo so
    // the caller knows to retry with browser-side send.
    return NextResponse.json({
      success: true,
      demo: true,
      reason: 'use_browser_send',
      externalId: conversation.externalId,
      conversationId: conversation.id,
    });
  } catch (error: any) {
    console.error('[Send API] Error:', error);
    return NextResponse.json({ error: error.message || 'Send failed' }, { status: 500 });
  }
}
