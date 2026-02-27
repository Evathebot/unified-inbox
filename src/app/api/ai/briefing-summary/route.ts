import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/claude';

/**
 * POST /api/ai/briefing-summary
 *
 * Generates a concise AI daily briefing based on inbox stats.
 */
export async function POST(request: NextRequest) {
  try {
    const { priorityCount, overdueCount, calendarCount, topSenders } = await request.json();

    const parts: string[] = [];
    if (priorityCount > 0) parts.push(`${priorityCount} priority message${priorityCount !== 1 ? 's' : ''}`);
    if (overdueCount > 0) parts.push(`${overdueCount} overdue ${overdueCount === 1 ? 'reply' : 'replies'}`);
    if (calendarCount > 0) parts.push(`${calendarCount} calendar event${calendarCount !== 1 ? 's' : ''} today`);
    if (topSenders?.length > 0) parts.push(`key contacts: ${(topSenders as string[]).join(', ')}`);

    const context = parts.length > 0 ? parts.join('; ') : 'inbox is clear';

    const prompt = `You are an executive assistant giving a concise morning briefing. The user's inbox has: ${context}.

Write a 2-3 sentence briefing that:
- Summarises what needs their attention today
- Is direct, specific, and actionable
- Uses a professional but warm tone
- Does NOT use bullet points or headers
- Does NOT start with "Good morning" or similar greetings

Write only the briefing text.`;

    const summary = await generateCompletion(prompt, {
      system: 'You are a highly efficient executive assistant. Be concise and direct.',
    });

    return NextResponse.json({ summary: summary.trim() });
  } catch (error) {
    console.error('Error generating briefing summary:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
