import { NextRequest, NextResponse } from 'next/server';
import { summarizeConversation } from '@/lib/ai';

/**
 * POST /api/ai/summarize
 * Summarise a conversation thread into 1-2 sentences.
 * Body: { messages: {sender: string, body: string}[], contactName: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { messages, contactName } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ summary: '' });
    }

    const summary = await summarizeConversation(messages, contactName || 'Contact');
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('[ai/summarize]', error);
    return NextResponse.json({ error: 'Failed to summarize' }, { status: 500 });
  }
}
