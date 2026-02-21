import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/contacts
 * 
 * List contacts with optional search query.
 * Includes message count and last message date.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;
    
    const where: Record<string, unknown> = {};
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
      ];
    }
    
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          _count: {
            select: { messages: true },
          },
          messages: {
            select: { timestamp: true },
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastContactDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);
    
    const contactsWithStats = contacts.map(contact => ({
      ...contact,
      messageCount: contact._count.messages,
      lastMessageDate: contact.messages[0]?.timestamp || null,
      messages: undefined,
      _count: undefined,
    }));
    
    return NextResponse.json({
      contacts: contactsWithStats,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}
