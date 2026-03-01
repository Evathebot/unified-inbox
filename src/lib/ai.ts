import { Message, Contact } from '@prisma/client';
import { generateJSON, generateCompletion } from './claude';

/**
 * Calculate priority score for a message (1-100) using LLM
 * Higher score = more urgent
 */
export async function calculatePriorityScore(message: Message & { contact?: Contact | null }): Promise<{
  score: number;
  reason: string;
}> {
  const prompt = `
    Analyze the following message and assign a priority score from 1 to 100.
    Consider:
    - Urgency of request
    - Importance of sender (${message.contact?.name || 'Unknown'}, Relationship Score: ${message.contact?.relationshipScore || 50})
    - Potential business impact
    - Time-sensitivity

    Message Channel: ${message.channel}
    Subject: ${message.subject || 'N/A'}
    Body: ${message.body}

    Respond with a JSON object: { "score": number, "reason": "concise explanation" }
  `;

  try {
    const result = await generateJSON<{ score: number; reason: string }>(prompt, {
      system: "You are an AI inbox assistant. Your goal is to prioritize messages for a busy professional."
    });

    // Validate and cap score
    const score = Math.min(100, Math.max(1, result.score || 50));
    return { score, reason: result.reason || 'AI analysis completed' };
  } catch (error) {
    console.error('LLM scoring failed, falling back to heuristic:', error);
    return calculatePriorityScoreHeuristic(message);
  }
}

/**
 * Heuristic fallback for priority scoring
 */
function calculatePriorityScoreHeuristic(message: Message & { contact?: Contact | null }): {
  score: number;
  reason: string;
} {
  let score = 50;
  const reasons: string[] = [];

  if (message.subject?.toLowerCase().includes('urgent')) {
    score += 30;
    reasons.push('urgent email subject');
  }

  const urgentKeywords = ['asap', 'urgent', 'important', 'deadline'];
  const combinedText = `${message.subject || ''} ${message.body}`.toLowerCase();

  if (urgentKeywords.some(kw => combinedText.includes(kw))) {
    score += 20;
    reasons.push('urgent keywords found');
  }

  if (message.contact && message.contact.relationshipScore > 70) {
    score += 15;
    reasons.push('high-value contact');
  }

  score = Math.min(100, Math.max(1, score));
  return {
    score,
    reason: reasons.length > 0 ? reasons.join('; ') : 'standard priority (heuristic)',
  };
}

export type DraftTone = 'friendly' | 'formal' | 'brief' | 'detailed';

const TONE_INSTRUCTIONS: Record<DraftTone, string> = {
  friendly: 'Use a warm, conversational tone — like a colleague. Keep it natural and personable.',
  formal: 'Use a professional, formal tone. No contractions, proper salutations, structured paragraphs.',
  brief: 'Be extremely concise — 1-3 sentences maximum. Get straight to the point.',
  detailed: 'Be thorough and comprehensive. Address all points raised, provide context and next steps.',
};

/**
 * Generate a personalized draft reply using LLM
 */
export async function generateDraftReply(
  message: Message & { contact?: Contact | null },
  conversationMessages: Message[] = [],
  tone: DraftTone = 'friendly'
): Promise<string | null> {
  const senderName = message.contact?.name || message.senderName || 'them';
  const channel = message.channel || 'message';

  // Sanitize raw Beeper bodies for the AI prompt:
  // 1. Decode JSON-wrapped format: {"text":"...","textEntities":[...]}
  //    (must happen BEFORE other checks — inner text may also be [text])
  // 2. Replace media-only placeholders: [text], [image], [voice], [video], [file]
  // 3. Replace raw media URLs stored as body (mxc://, /api/media/, localhost matrix)
  //    The sync engine stores attachmentUrl as the body when there is no text caption.
  const sanitizeBodyForAI = (body: string | null | undefined, msgType?: string | null): string => {
    if (!body) return '';
    let text = body.trim();
    // 1. Decode Beeper JSON-wrapped bodies first
    if (text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed?.text === 'string') text = parsed.text.trim();
      } catch { /* not valid JSON */ }
    }
    // 2. Replace media-only placeholders (raw or JSON-decoded)
    if (text === '[text]') {
      // Beeper's generic media placeholder — use msgType for a more specific label
      if (msgType === 'image') return '[📷 photo]';
      if (msgType === 'voice') return '[🎤 voice note]';
      if (msgType === 'video') return '[🎥 video]';
      if (msgType === 'file')  return '[📎 file]';
      return '[media attachment]';
    }
    if (text === '[image]') return '[📷 photo]';
    if (text === '[voice]') return '[🎤 voice note]';
    if (text === '[video]') return '[🎥 video]';
    if (text === '[file]')  return '[📎 file]';
    // 3. Replace raw media URLs stored as body when there is no text caption
    //    Covers: mxc://, localmxc:// (Beeper local), /api/media/, http://localhost:, file:///
    if (
      text.startsWith('mxc://') ||
      text.startsWith('localmxc://') ||
      text.startsWith('/api/media/') ||
      text.startsWith('http://localhost:') ||
      text.startsWith('file:///')
    ) {
      if (msgType === 'image') return '[📷 photo]';
      if (msgType === 'voice') return '[🎤 voice note]';
      if (msgType === 'video') return '[🎥 video]';
      if (msgType === 'file')  return '[📎 file]';
      return '[media attachment]';
    }
    return text;
  };

  // Build conversation context with real sender names
  const context = conversationMessages
    .slice(-10)
    .map(m => {
      const isMe = m.senderId !== message.senderId;
      return `${isMe ? 'Me' : senderName}: ${sanitizeBodyForAI(m.body, m.messageType).substring(0, 300)}`;
    })
    .filter(line => !line.endsWith(': ')) // skip blank entries
    .join('\n');

  const toneInstruction = TONE_INSTRUCTIONS[tone];

  // Platform-specific length and style guidance
  const platformInstruction: Record<string, string> = {
    whatsapp: 'WhatsApp message: be casual and brief (1-3 sentences max). Texting style. No em dashes.',
    telegram: 'Telegram: casual and direct. No em dashes.',
    slack: 'Slack: professional but conversational. You may use emoji. No em dashes.',
    gmail: 'Email: structured with clear paragraphs. No em dashes.',
  };
  const channelStyle = platformInstruction[channel] || `${channel} chat message (natural tone). No em dashes.`;

  const sanitizedMessageBody = sanitizeBodyForAI(message.body, message.messageType).substring(0, 500);

  // Detect when the entire message is a media attachment label (e.g. "[📷 photo]")
  // so we can instruct the AI to reply warmly rather than saying "message didn't come through".
  const isMediaOnly = /^\[.+\]$/.test(sanitizedMessageBody);

  const prompt = `
    Draft a reply to this ${channel} message from ${senderName}.

    ${context ? `Conversation history:\n${context}\n\n` : ''}Message to reply to (from ${senderName}):
    "${sanitizedMessageBody}"
    ${isMediaOnly ? `\n    Note: "${sanitizedMessageBody}" means ${senderName} shared a media file (photo, video, voice note, or attachment). Draft a warm, natural reply that acknowledges the shared media. Do NOT say you cannot see it, do NOT say "message didn't come through" — just reply as if you received it normally.` : ''}

    Tone instruction: ${toneInstruction}
    Channel style: ${channelStyle}

    Rules:
    - Respond ONLY with the reply text itself
    - Do NOT include subject lines, labels, or preamble like "Here is a draft"
    - Do NOT start with "Hi [name]," or any greeting unless the tone is formal
    - NEVER use em dashes (—). Use commas or periods instead.
  `;

  try {
    const draft = await generateCompletion(prompt, {
      system: `You are a helpful assistant drafting replies for a busy professional. ${toneInstruction} Never write preamble — output ONLY the reply text. NEVER use em dashes (—) — use commas or periods instead.`,
    });
    return draft.trim();
  } catch (error) {
    console.error('Claude draft generation failed:', error);
    return null;
  }
}

/**
 * Analyze contact's communication patterns using LLM
 */
export async function analyzeContactPersonality(
  messages: Message[]
): Promise<{
  communicationStyle: string;
  preferredLanguage: string;
  responsePatterns: string;
  keyTopics: string[];
  relationshipStrength: number;
}> {
  if (messages.length === 0) {
    return {
      communicationStyle: 'Unknown',
      preferredLanguage: 'Unknown',
      responsePatterns: 'No history',
      keyTopics: [],
      relationshipStrength: 50,
    };
  }

  const messageCloud = messages.map(m => m.body).join('\n---\n').substring(0, 2000);

  const prompt = `
    Analyze the communication style and personality of this contact based on their messages:
    
    Messages:
    ${messageCloud}

    Respond with a JSON object:
    {
      "communicationStyle": "string",
      "preferredLanguage": "string",
      "responsePatterns": "string",
      "keyTopics": ["string", "string"],
      "relationshipStrength": number (1-100)
    }
  `;

  try {
    return await generateJSON(prompt, {
      system: "You are a relationship manager AI. Analyze contacts to help the user understand how to best communicate with them."
    });
  } catch (error) {
    console.error('LLM personality analysis failed:', error);
    return {
      communicationStyle: 'Professional',
      preferredLanguage: 'English',
      responsePatterns: 'Consistent',
      keyTopics: [],
      relationshipStrength: 50,
    };
  }
}

/**
 * Generate 3 short smart reply options for a message
 */
export async function generateQuickReplies(
  message: Message & { contact?: Contact | null },
  channel: string
): Promise<string[]> {
  const senderName = message.contact?.name || message.senderName || 'them';
  const body = message.body?.substring(0, 600) || '';

  const prompt = `You are drafting 3 ultra-short smart replies for a busy professional.

Channel: ${channel}
From: ${senderName}
Message: "${body}"

Generate exactly 3 short reply options (each 2–8 words max). They should:
- Each address the message differently (e.g. agree, ask a question, defer)
- Sound natural for ${channel === 'slack' ? 'Slack' : channel === 'gmail' ? 'email' : 'chat'}
- Be ready to send as-is, no placeholders

Respond with JSON: {"replies": ["reply 1", "reply 2", "reply 3"]}`;

  try {
    const result = await generateJSON<{ replies: string[] }>(prompt, {
      system: 'You generate ultra-concise smart reply suggestions. Each reply must be complete and ready to send. Output ONLY valid JSON.',
    });
    return (result.replies || []).slice(0, 3).filter(Boolean);
  } catch (error) {
    console.error('Quick replies generation failed:', error);
    return [];
  }
}

/**
 * Extract sentiment from message using LLM
 */
export async function analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
  try {
    const result = await generateJSON<{ sentiment: 'positive' | 'negative' | 'neutral' }>(
      `Analyze the sentiment of this message: "${text}". Respond with JSON: {"sentiment": "positive"|"negative"|"neutral"}`
    );
    return result.sentiment;
  } catch {
    return 'neutral';
  }
}

/**
 * Extract action items from message using LLM
 */
export async function extractActionItems(text: string): Promise<string[]> {
  try {
    const result = await generateJSON<{ items: string[] }>(
      `Extract a list of specific action items or tasks from this message: "${text}". Respond with JSON: {"items": ["task 1", "task 2"]}`
    );
    return result.items || [];
  } catch {
    return [];
  }
}

/**
 * Summarize a conversation thread into 1-2 sentences
 */
export async function summarizeConversation(
  messages: Array<{ sender: string; body: string }>,
  contactName: string
): Promise<string> {
  if (messages.length === 0) return '';

  const messageText = messages
    .map(m => `${m.sender}: ${m.body}`)
    .join('\n')
    .substring(0, 3000);

  const prompt = `Summarize this conversation in 1-2 concise sentences. Focus on what ${contactName} wants or what was discussed. Be specific and direct.\n\nMessages:\n${messageText}\n\nWrite only the summary, no preamble.`;

  try {
    const summary = await generateCompletion(prompt, {
      system: 'You are an inbox assistant. Summarize conversations briefly and accurately in 1-2 sentences. Never start with "The conversation" or "This conversation".',
    });
    return summary.trim();
  } catch {
    const contactMsgs = messages.filter(m => m.sender !== 'Me').length;
    return `${contactName} sent ${contactMsgs} message${contactMsgs !== 1 ? 's' : ''} — tap to review.`;
  }
}

/**
 * Generate a short inbox-level summary for a list of unread conversations
 */
export async function generateInboxSummary(
  conversations: Array<{ contactName: string; channel: string; latestMessage: string; unreadCount: number }>
): Promise<string> {
  if (conversations.length === 0) return 'Your inbox is clear.';

  const lines = conversations
    .slice(0, 8)
    .map(c => `- ${c.contactName} (${c.channel}, ${c.unreadCount} unread): ${c.latestMessage}`)
    .join('\n');

  const prompt = `You manage a busy professional's inbox. Here are their most recent unread conversations:\n${lines}\n\nWrite a single, concise 2-3 sentence briefing summarising what needs attention today. Be direct and specific.`;

  try {
    return (await generateCompletion(prompt, {
      system: 'You are an executive assistant giving a morning briefing. Be direct, specific, and actionable.',
    })).trim();
  } catch {
    return `You have ${conversations.length} unread conversation${conversations.length !== 1 ? 's' : ''} waiting.`;
  }
}
