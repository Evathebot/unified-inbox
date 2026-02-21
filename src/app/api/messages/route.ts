import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/messages
 * 
 * List messages with filtering and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const channel = searchParams.get('channel');
    const priorityStr = searchParams.get('priority');
    const readStr = searchParams.get('read');
    const contactId = searchParams.get('contactId');
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;
    
    const where: Record<string, unknown> = {};
    
    if (channel) where.channel = channel;
    if (priorityStr) where.priority = { gte: parseInt(priorityStr) };
    if (readStr !== null) where.read = readStr === 'true';
    if (contactId) where.contactId = contactId;
    
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          contact: {
            select: { id: true, name: true, email: true, avatar: true, relationshipScore: true },
          },
          aiMetadata: true,
        },
        orderBy: [{ priority: 'desc' }, { timestamp: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);
    
    return NextResponse.json({
      messages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
