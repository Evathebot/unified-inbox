import { Message, Contact } from '@prisma/client';
import { generateJSON, generateCompletion } from './ollama';

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

/**
 * Generate a personalized draft reply using LLM
 */
export async function generateDraftReply(
  message: Message,
  conversationMessages: Message[] = []
): Promise<string> {
  const context = conversationMessages
    .map(m => `${m.from === message.from ? 'Them' : 'Me'}: ${m.body}`)
    .join('\n');

  const prompt = `
    Generate a professional yet friendly draft reply to the following message.
    
    Conversation Context:
    ${context}

    Current Message to Reply to:
    ${message.body}

    Respond ONLY with the text of the reply. No greetings like "Certainly" or "Here is the draft".
  `;

  try {
    const draft = await generateCompletion(prompt, {
      system: "You are a helpful assistant drafting replies for a busy professional. Match their tone (usually professional but approachable)."
    });
    return draft.trim();
  } catch (error) {
    console.error('LLM draft generation failed, falling back to template:', error);
    return `Thank you for your message. I've received it and will get back to you soon.`;
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
