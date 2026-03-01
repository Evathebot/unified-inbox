import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * PATCH /api/conversations/:id
 *
 * Handles two operations depending on the request body:
 *  - { title: string } → rename the conversation in the DB
 *  - (no body)         → mark all unread messages in this conversation as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try to parse a JSON body — presence of `title` triggers a rename.
    let title: string | undefined;
    try {
      const body = await request.json();
      if (typeof body?.title === 'string') title = body.title.trim();
    } catch { /* no body → fall through to mark-as-read */ }

    if (title !== undefined) {
      // Rename conversation
      await prisma.conversation.update({
        where: { id },
        data: { title },
      });
    } else {
      // Mark all messages in conversation as read
      await prisma.message.updateMany({
        where: { conversationId: id, read: false },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH conversation:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/**
 * GET /api/conversations/:id
 *
 * Get full conversation with all messages in thread, ordered chronologically.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: true,
        messages: {
          orderBy: { timestamp: 'asc' },
          include: {
            aiMetadata: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}
