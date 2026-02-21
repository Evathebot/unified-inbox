import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculatePriorityScore } from '@/lib/ai';

/**
 * POST /api/ai/score
 * 
 * Accept a message object and return priority score (1-100) with reason.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, message } = body;

    let targetMessage;

    if (messageId) {
      // Fetch existing message
      targetMessage = await prisma.message.findUnique({
        where: { id: messageId },
        include: { contact: true },
      });

      if (!targetMessage) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
    } else if (message) {
      // Use provided message object
      targetMessage = message;
    } else {
      return NextResponse.json(
        { error: 'Either messageId or message object required' },
        { status: 400 }
      );
    }

    const { score, reason } = await calculatePriorityScore(targetMessage);

    return NextResponse.json({
      score,
      reason,
      messageId: targetMessage.id || null,
    });
  } catch (error) {
    console.error('Error calculating priority score:', error);
    return NextResponse.json({ error: 'Failed to calculate priority score' }, { status: 500 });
  }
}
