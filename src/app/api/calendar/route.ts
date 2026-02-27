import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/calendar
 * 
 * List upcoming calendar events with associated contact info.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;
    
    const where: Record<string, unknown> = {};
    
    // Default to upcoming events
    const fromDate = fromStr ? new Date(fromStr) : new Date();
    
    where.startTime = { gte: fromDate };
    
    if (toStr) {
      where.startTime = {
        ...where.startTime as object,
        lte: new Date(toStr),
      };
    }
    
    const [events, total] = await Promise.all([
      prisma.calendarEvent.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
        skip,
        take: limit,
      }),
      prisma.calendarEvent.count({ where }),
    ]);
    
    return NextResponse.json({
      events,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}

/**
 * POST /api/calendar
 * 
 * Create a new calendar event.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, startTime, endTime, contactId, location, attendees } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: title, startTime, endTime' },
        { status: 400 }
      );
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        contactId: contactId || null,
        location: location || null,
        attendees: attendees ? JSON.stringify(attendees) : null,
      },
      include: {
        contact: true,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
}
