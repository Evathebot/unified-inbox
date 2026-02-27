import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/contacts/:id
 * 
 * Get full contact with all conversations and recent messages across all channels.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        conversations: {
          include: {
            messages: {
              orderBy: { timestamp: 'desc' },
              take: 5,
            },
          },
          orderBy: { lastMessageAt: 'desc' },
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 20,
          include: {
            aiMetadata: true,
          },
        },
        calendarEvents: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
          orderBy: { startTime: 'asc' },
          take: 5,
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}

/**
 * PATCH /api/contacts/:id
 * 
 * Update contact notes, business entity, or other metadata.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes, company, metadata, personalityProfile } = body;

    const updateData: Record<string, unknown> = {};

    if (notes !== undefined) updateData.notes = notes;
    if (company !== undefined) updateData.company = company;
    if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata);
    if (personalityProfile !== undefined) updateData.personalityProfile = personalityProfile;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}
