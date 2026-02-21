import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/conversations/:id/linked
 * 
 * Find conversations linked to this one (same contact, similar topics).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: {
        contactId: true,
        channel: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Find other conversations with same contact
    const linkedConversations = await prisma.conversation.findMany({
      where: {
        id: { not: id },
        contactId: conversation.contactId,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 10,
    });

    const conversationsWithLastMessage = linkedConversations.map(conv => ({
      ...conv,
      lastMessage: conv.messages[0] || null,
      messages: undefined,
    }));

    return NextResponse.json({
      linked: conversationsWithLastMessage,
      count: conversationsWithLastMessage.length,
    });
  } catch (error) {
    console.error('Error fetching linked conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch linked conversations' }, { status: 500 });
  }
}
