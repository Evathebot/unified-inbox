import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/claude';

interface TopMessage {
  sender: string;
  preview: string;
  channel: string;
}

/**
 * POST /api/ai/briefing-summary
 *
 * Generates a specific AI daily briefing using real message previews + inbox stats.
 * topMessages gives the AI actual content to reference so it can be specific.
 */
export async function POST(request: NextRequest) {
  try {
    const { priorityCount, overdueCount, calendarCount, topSenders, topMessages = [] } = await request.json();

    // Build context from actual message previews so the briefing is specific
    const messageLines = (topMessages as TopMessage[])
      .slice(0, 5)
      .map((m) => `- ${m.sender} (${m.channel}): "${m.preview}"`)
      .join('\n');

    const statsContext: string[] = [];
    if (priorityCount > 0) statsContext.push(`${priorityCount} priority message${priorityCount !== 1 ? 's' : ''}`);
    if (overdueCount > 0) statsContext.push(`${overdueCount} overdue ${overdueCount === 1 ? 'reply' : 'replies'}`);
    if (calendarCount > 0) statsContext.push(`${calendarCount} calendar event${calendarCount !== 1 ? 's' : ''} today`);
    if ((topSenders as string[])?.length > 0) statsContext.push(`key contacts: ${(topSenders as string[]).join(', ')}`);

    const statsLine = statsContext.length > 0 ? statsContext.join('; ') : 'inbox is clear';

    const prompt = messageLines
      ? `You are an executive assistant giving a concise morning briefing. Inbox stats: ${statsLine}.

Their most important messages right now:
${messageLines}

Write a 2-3 sentence briefing that:
- References specific senders and topics from the messages above (use real names!)
- Highlights what needs immediate attention and why
- Is direct, specific, and actionable
- Uses a professional but warm tone
- Does NOT use bullet points or headers
- Does NOT start with "Good morning" or greetings

Write only the briefing text.`
      : `You are an executive assistant giving a concise morning briefing. The user's inbox has: ${statsLine}.

Write a 2-3 sentence briefing that:
- Summarises what needs their attention today
- Is direct, specific, and actionable
- Uses a professional but warm tone
- Does NOT use bullet points or headers
- Does NOT start with "Good morning" or similar greetings

Write only the briefing text.`;

    const summary = await generateCompletion(prompt, {
      system: 'You are a highly efficient executive assistant. Be concise, specific, and direct. Reference real names and topics when given message data.',
    });

    return NextResponse.json({ summary: summary.trim() });
  } catch (error) {
    console.error('Error generating briefing summary:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
