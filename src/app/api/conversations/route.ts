import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/lib/auth';

/**
 * GET /api/conversations
 * 
 * List conversations with last message and contact info.
 * Filterable by channel.
 */
export async function GET(request: NextRequest) {
  try {
    const workspace = await requireWorkspace();
    const searchParams = request.nextUrl.searchParams;

    const channel = searchParams.get('channel');
    const contactId = searchParams.get('contactId');

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { workspaceId: workspace.id };

    if (channel) where.channel = channel;
    if (contactId) where.contactId = contactId;
    
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              avatar: true,
              relationshipScore: true,
            },
          },
          messages: {
            orderBy: { timestamp: 'desc' },
            take: 1,
            include: {
              aiMetadata: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);
    
    const conversationsWithLastMessage = conversations.map(conv => ({
      ...conv,
      lastMessage: conv.messages[0] || null,
      messages: undefined,
    }));
    
    return NextResponse.json({
      conversations: conversationsWithLastMessage,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}
