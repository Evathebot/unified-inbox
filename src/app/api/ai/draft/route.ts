import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDraftReply } from '@/lib/ai';

/**
 * POST /api/ai/draft
 * 
 * Accept messageId and return AI-drafted reply based on conversation context.
 * For MVP, uses template-based logic (not actual Claude API).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'messageId required' }, { status: 400 });
    }

    // Fetch the message with its conversation
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        contact: true,
        conversation: {
          include: {
            messages: {
              orderBy: { timestamp: 'asc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Generate draft reply
    const conversationMessages = message.conversation?.messages || [];
    const draftReply = generateDraftReply(message, conversationMessages);

    // Optionally store the draft
    await prisma.message.update({
      where: { id: messageId },
      data: { aiDraft: draftReply },
    });

    return NextResponse.json({
      draft: draftReply,
      messageId,
      contactName: message.contact?.name || message.from,
    });
  } catch (error) {
    console.error('Error generating draft reply:', error);
    return NextResponse.json({ error: 'Failed to generate draft reply' }, { status: 500 });
  }
}
