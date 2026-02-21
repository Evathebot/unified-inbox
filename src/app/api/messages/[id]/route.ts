import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/messages/:id
 * 
 * Get a single message with AI metadata and contact info.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: params.id },
      include: {
        contact: true,
        aiMetadata: true,
        conversation: {
          select: {
            id: true,
            title: true,
            channel: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json({ error: 'Failed to fetch message' }, { status: 500 });
  }
}

/**
 * PATCH /api/messages/:id
 * 
 * Update message read status or priority.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { read, priority } = body;

    const updateData: Record<string, unknown> = {};
    
    if (typeof read === 'boolean') {
      updateData.read = read;
    }
    
    if (typeof priority === 'number' && priority >= 1 && priority <= 100) {
      updateData.priority = priority;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const message = await prisma.message.update({
      where: { id: params.id },
      data: updateData,
      include: {
        contact: true,
        aiMetadata: true,
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}
