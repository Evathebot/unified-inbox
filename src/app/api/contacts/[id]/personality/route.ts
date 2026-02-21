import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeContactPersonality } from '@/lib/ai';

/**
 * GET /api/contacts/:id/personality
 * 
 * Return AI personality profile for contact.
 * Generates if not exists using message history.
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
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // If personality profile already exists and was generated recently, return it
    if (contact.personalityProfile && contact.updatedAt) {
      const hoursSinceUpdate = (Date.now() - new Date(contact.updatedAt).getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        return NextResponse.json({
          profile: JSON.parse(contact.personalityProfile),
          cached: true,
        });
      }
    }

    // Generate new personality profile
    const analysis = analyzeContactPersonality(contact.messages);

    // Store the profile
    await prisma.contact.update({
      where: { id },
      data: {
        personalityProfile: JSON.stringify(analysis),
        relationshipScore: analysis.relationshipStrength,
      },
    });

    return NextResponse.json({
      profile: analysis,
      cached: false,
    });
  } catch (error) {
    console.error('Error generating personality profile:', error);
    return NextResponse.json({ error: 'Failed to generate personality profile' }, { status: 500 });
  }
}
