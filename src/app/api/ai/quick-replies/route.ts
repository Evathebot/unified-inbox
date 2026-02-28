import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateQuickReplies } from '@/lib/ai';

/**
 * POST /api/ai/quick-replies
 *
 * Generate 3 short smart reply suggestions for the latest message in a conversation.
 * Returns: { replies: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'messageId required' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { contact: true },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const replies = await generateQuickReplies(message, message.channel);

    return NextResponse.json({ replies });
  } catch (error) {
    console.error('Error generating quick replies:', error);
    return NextResponse.json({ error: 'Failed to generate quick replies' }, { status: 500 });
  }
}
