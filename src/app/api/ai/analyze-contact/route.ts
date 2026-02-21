import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeContactPersonality } from '@/lib/ai';

/**
 * POST /api/ai/analyze-contact
 * 
 * Accept contactId and analyze their messages to return personality profile.
 * Includes communication style, preferred language, response patterns,
 * key topics, and relationship strength.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId } = body;

    if (!contactId) {
      return NextResponse.json({ error: 'contactId required' }, { status: 400 });
    }

    // Fetch contact with message history
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 100, // Analyze up to 100 recent messages
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Analyze personality
    const analysis = analyzeContactPersonality(contact.messages);

    // Update contact with new analysis
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        personalityProfile: JSON.stringify(analysis),
        relationshipScore: analysis.relationshipStrength,
      },
    });

    return NextResponse.json({
      contactId,
      contactName: contact.name,
      analysis,
      messageCount: contact.messages.length,
    });
  } catch (error) {
    console.error('Error analyzing contact:', error);
    return NextResponse.json({ error: 'Failed to analyze contact' }, { status: 500 });
  }
}
