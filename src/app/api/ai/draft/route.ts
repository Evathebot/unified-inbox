import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDraftReply, type DraftTone } from '@/lib/ai';

/**
 * POST /api/ai/draft
 *
 * Accept messageId + optional tone and return AI-drafted reply based on conversation context.
 * tone: 'friendly' | 'formal' | 'brief' | 'detailed' (default: 'friendly')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, tone = 'friendly' } = body;

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

    // Generate draft reply with optional tone
    const conversationMessages = message.conversation?.messages || [];
    const draftReply = await generateDraftReply(message, conversationMessages, tone as DraftTone);

    // Only persist real AI drafts — never store fallback/null
    if (draftReply) {
      await prisma.message.update({
        where: { id: messageId },
        data: { aiDraft: draftReply },
      });
    }

    return NextResponse.json({
      draft: draftReply,
      messageId,
      contactName: message.contact?.name || message.senderName,
    });
  } catch (error) {
    console.error('Error generating draft reply:', error);
    return NextResponse.json({ error: 'Failed to generate draft reply' }, { status: 500 });
  }
}
