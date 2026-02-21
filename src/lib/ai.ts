import { Message, Contact } from '@prisma/client';

/**
 * Calculate priority score for a message (1-100)
 * Higher score = more urgent
 */
export function calculatePriorityScore(message: Message & { contact?: Contact | null }): {
  score: number;
  reason: string;
} {
  let score = 50; // baseline
  const reasons: string[] = [];

  // High priority channels
  if (message.channel === 'gmail' && message.subject?.toLowerCase().includes('urgent')) {
    score += 30;
    reasons.push('urgent email subject');
  }

  // Keywords in subject or body
  const urgentKeywords = ['asap', 'urgent', 'important', 'deadline', 'emergency', 'critical'];
  const combinedText = `${message.subject || ''} ${message.body}`.toLowerCase();
  
  const foundKeywords = urgentKeywords.filter(kw => combinedText.includes(kw));
  if (foundKeywords.length > 0) {
    score += foundKeywords.length * 10;
    reasons.push(`urgent keywords: ${foundKeywords.join(', ')}`);
  }

  // Question marks suggest action needed
  if (message.body.includes('?')) {
    score += 10;
    reasons.push('contains questions');
  }

  // Relationship score boost
  if (message.contact && message.contact.relationshipScore > 70) {
    score += 15;
    reasons.push('high-value contact');
  }

  // Recent message = potentially time-sensitive
  const hoursSinceMessage = (Date.now() - new Date(message.timestamp).getTime()) / (1000 * 60 * 60);
  if (hoursSinceMessage < 2) {
    score += 10;
    reasons.push('very recent message');
  }

  // Cap at 100
  score = Math.min(100, Math.max(1, score));

  return {
    score,
    reason: reasons.length > 0 ? reasons.join('; ') : 'standard priority',
  };
}

/**
 * Generate a simple draft reply based on message context
 */
export function generateDraftReply(
  message: Message,
  conversationMessages: Message[] = []
): string {
  const hasQuestion = message.body.includes('?');
  const isFollowUp = conversationMessages.length > 1;

  if (hasQuestion) {
    return `Thank you for your message. I'll look into this and get back to you shortly.`;
  }

  if (isFollowUp) {
    return `Thanks for the follow-up. I appreciate your patience.`;
  }

  return `Thank you for reaching out. I'll review this and respond soon.`;
}

/**
 * Analyze contact's communication patterns based on message history
 */
export function analyzeContactPersonality(
  messages: Message[]
): {
  communicationStyle: string;
  preferredLanguage: string;
  responsePatterns: string;
  keyTopics: string[];
  relationshipStrength: number;
} {
  if (messages.length === 0) {
    return {
      communicationStyle: 'Unknown',
      preferredLanguage: 'Unknown',
      responsePatterns: 'No history',
      keyTopics: [],
      relationshipStrength: 50,
    };
  }

  // Analyze communication style
  const avgMessageLength = messages.reduce((sum, m) => sum + m.body.length, 0) / messages.length;
  const communicationStyle =
    avgMessageLength > 500
      ? 'Detailed and thorough'
      : avgMessageLength > 200
      ? 'Balanced and clear'
      : 'Concise and direct';

  // Detect formality
  const formalWords = ['regards', 'sincerely', 'dear', 'please', 'thank you'];
  const casualWords = ['hey', 'thanks', 'cool', 'awesome', 'lol'];
  
  const formalCount = messages.reduce(
    (count, m) => count + formalWords.filter(w => m.body.toLowerCase().includes(w)).length,
    0
  );
  const casualCount = messages.reduce(
    (count, m) => count + casualWords.filter(w => m.body.toLowerCase().includes(w)).length,
    0
  );

  const preferredLanguage =
    formalCount > casualCount ? 'Formal and professional' : 'Casual and friendly';

  // Response patterns
  const hasQuestions = messages.some(m => m.body.includes('?'));
  const responsePatterns = hasQuestions
    ? 'Asks questions and seeks clarification'
    : 'Provides direct statements';

  // Extract key topics (simple keyword extraction)
  const allWords = messages
    .map(m => m.body.toLowerCase())
    .join(' ')
    .split(/\s+/)
    .filter(w => w.length > 5);
  
  const wordFreq: Record<string, number> = {};
  allWords.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  const keyTopics = Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);

  // Relationship strength based on message frequency and recency
  const relationshipStrength = Math.min(100, 50 + messages.length * 2);

  return {
    communicationStyle,
    preferredLanguage,
    responsePatterns,
    keyTopics,
    relationshipStrength,
  };
}

/**
 * Extract sentiment from message
 */
export function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['thank', 'great', 'excellent', 'appreciate', 'love', 'perfect', 'amazing'];
  const negativeWords = ['problem', 'issue', 'concern', 'disappointed', 'frustrated', 'angry', 'urgent'];

  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * Extract action items from message
 */
export function extractActionItems(text: string): string[] {
  const actionVerbs = ['please', 'can you', 'could you', 'need to', 'have to', 'must', 'should'];
  const sentences = text.split(/[.!?]+/);
  
  const actionItems: string[] = [];
  
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    if (actionVerbs.some(verb => lowerSentence.includes(verb))) {
      actionItems.push(sentence.trim());
    }
  });

  return actionItems.slice(0, 5); // max 5 action items
}
