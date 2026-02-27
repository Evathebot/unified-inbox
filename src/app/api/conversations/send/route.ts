import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/lib/auth';
import { BeeperService } from '@/lib/services/beeper';

/**
 * POST /api/conversations/send
 *
 * Send a reply to a conversation via Beeper.
 * Looks up the conversation by senderName + channel so the caller
 * doesn't need to know internal DB IDs.
 *
 * Body: { senderName: string, channel: string, text: string }
 *
 * Returns:
 *   { success: true, demo: true }  — no Beeper connection configured yet
 *   { success: true, messageId }   — sent via Beeper
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderName, channel, text } = body as {
      senderName: string;
      channel: string;
      text: string;
    };

    if (!senderName || !channel || !text?.trim()) {
      return NextResponse.json({ error: 'senderName, channel, and text are required' }, { status: 400 });
    }

    // --- Step 1: Find an active Beeper connection ---
    const workspace = await requireWorkspace();

    const connection = await prisma.connection.findFirst({
      where: { workspaceId: workspace.id, platform: 'beeper', status: 'active' },
    });

    if (!connection?.accessToken || !connection?.apiUrl) {
      // No Beeper configured — graceful demo response, not an error
      return NextResponse.json({ success: true, demo: true, reason: 'no_beeper_connection' });
    }

    // --- Step 2: Find the conversation in DB ---
    const conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId: workspace.id,
        channel,
        contact: { name: { contains: senderName } },
      },
      include: { contact: true },
    });

    if (!conversation?.externalId) {
      // Conversation not yet synced to DB — graceful demo response
      return NextResponse.json({ success: true, demo: true, reason: 'conversation_not_synced' });
    }

    // --- Step 3: Send via Beeper ---
    const beeper = new BeeperService({ apiUrl: connection.apiUrl, accessToken: connection.accessToken });
    const sent = await beeper.sendMessage(conversation.externalId, text.trim());

    // --- Step 4: Persist the sent message ---
    const savedMessage = await prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversation.id,
        externalId: sent?.id ?? `local-${Date.now()}`,
        channel,
        senderName: 'Me',
        body: text.trim(),
        timestamp: new Date(),
        read: true,
        priority: 0,
      },
    });

    return NextResponse.json({ success: true, messageId: savedMessage.id });
  } catch (error: any) {
    console.error('[Send API] Error:', error);
    return NextResponse.json({ error: error.message || 'Send failed' }, { status: 500 });
  }
}
