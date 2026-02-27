/**
 * Data fetching layer for server components
 * Fetches from Prisma with fallback to mock data
 */

import { prisma } from './db';
import {
  mockMessages,
  mockContacts,
  mockBriefing,
  mockCalendarEvents,
  type Message,
  type Contact,
  type CalendarEvent,
  type BriefingData,
} from './mockData';
import { extractActionItems } from './ai';

/**
 * Transform database message to frontend Message type
 */
// Infer topic from subject/body keywords
function inferTopic(subject: string, body: string): string | undefined {
  const text = `${subject} ${body}`.toLowerCase();
  const rules: [string[], string][] = [
    [['budget', 'invoice', 'payment', 'facture', 'financial', 'paiement'], 'Finance'],
    [['campaign', 'marketing', 'launch', 'brand'], 'Marketing'],
    [['design', 'mockup', 'figma', 'ui', 'color', 'font'], 'Design'],
    [['api', 'deploy', 'code', 'bug', 'integration', 'testing'], 'Engineering'],
    [['contract', 'legal', 'compliance', 'terms'], 'Legal'],
    [['investor', 'funding', 'pitch', 'deck'], 'Investor Relations'],
    [['meeting', 'call', 'schedule', 'calendar'], 'Meeting'],
    [['hiring', 'candidate', 'interview', 'onboard'], 'Hiring'],
    [['urgent', 'asap', 'deadline', 'reminder'], 'Urgent'],
    [['networking', 'event', 'conference'], 'Networking'],
    [['supplies', 'order', 'office'], 'Operations'],
    [['website', 'copy', 'content', 'draft'], 'Content'],
    [['renovation', 'travaux', 'plomberie'], 'Personal'],
    [['gym', 'lunch', 'dinner', 'workout'], 'Social'],
    [['linkedin', 'connection', 'notification'], 'Social'],
  ];
  for (const [keywords, label] of rules) {
    if (keywords.some(kw => text.includes(kw))) return label;
  }
  return undefined;
}

// Topic color palette
const topicColors: Record<string, string> = {
  default: 'bg-gray-100 text-gray-600',
  finance: 'bg-red-100 text-red-700',
  engineering: 'bg-blue-100 text-blue-700',
  design: 'bg-purple-100 text-purple-700',
  marketing: 'bg-pink-100 text-pink-700',
  legal: 'bg-amber-100 text-amber-700',
  sales: 'bg-green-100 text-green-700',
  hr: 'bg-teal-100 text-teal-700',
  social: 'bg-emerald-100 text-emerald-700',
  urgent: 'bg-orange-100 text-orange-700',
  investor: 'bg-indigo-100 text-indigo-700',
};

function getTopicColor(topic: string): string {
  const lower = topic.toLowerCase();
  for (const [key, color] of Object.entries(topicColors)) {
    if (lower.includes(key)) return color;
  }
  return topicColors.default;
}

/**
 * Clean up raw sender names from Beeper sync.
 * - Phone numbers like "14508214175" → "+1 (450) 821-4175"
 * - Beeper matrix IDs like "@slackgo_xxx:beeper.local" → stripped readable form
 */
function formatContactName(name: string): string {
  if (!name) return 'Unknown';

  // Beeper Matrix IDs: @xxx:beeper.local
  if (name.includes(':beeper.local') || name.includes(':beeper.im')) {
    const local = name.split(':')[0].replace(/^@/, '');
    // Strip known Beeper bridge prefixes
    const cleaned = local
      .replace(/^slackgo_/, '')
      .replace(/^telegramgo_/, '')
      .replace(/^whatsappgo_/, '')
      .replace(/^signalgo_/, '');
    // If it still looks like a hex/random ID, show generic label
    if (/^[a-f0-9\-]{20,}$/i.test(cleaned)) return 'Unknown Contact';
    return cleaned;
  }

  // Pure phone number (digits, optional leading +)
  const digitsOnly = name.replace(/^\+/, '').replace(/\D/g, '');
  if (digitsOnly.length >= 10 && digitsOnly === name.replace(/^\+/, '').replace(/\D/g, '') && /^[\d\+]+$/.test(name)) {
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      const n = digitsOnly.slice(1);
      return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
    }
    if (digitsOnly.length === 10) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    }
    // International number — just add + prefix
    return `+${digitsOnly}`;
  }

  return name;
}

function transformMessage(dbMessage: any): Message {
  // Extract topic from AIMetadata
  let topicLabel: string | undefined;
  let topicColor: string | undefined;
  if (dbMessage.aiMetadata?.topics) {
    try {
      const topics = JSON.parse(dbMessage.aiMetadata.topics);
      if (Array.isArray(topics) && topics.length > 0) {
        topicLabel = topics[0];
        topicColor = getTopicColor(topics[0]);
      }
    } catch { /* ignore */ }
  }

  // Infer topic from subject/content if no AI topics
  if (!topicLabel && dbMessage.subject) {
    topicLabel = inferTopic(dbMessage.subject, dbMessage.body);
    if (topicLabel) topicColor = getTopicColor(topicLabel);
  }

  // Extract channel context from metadata
  let channelContext: any = undefined;
  if (dbMessage.metadata) {
    try {
      const meta = JSON.parse(dbMessage.metadata);
      if (meta.workspace || meta.channelName || meta.groupName) {
        channelContext = {
          workspace: meta.workspace,
          channelName: meta.channelName,
          isDM: meta.isDM ?? true,
          groupName: meta.groupName,
        };
      }
    } catch { /* ignore */ }
  }

  // Infer channel context for slack/whatsapp if not in metadata
  if (!channelContext) {
    if (dbMessage.channel === 'slack') {
      channelContext = { workspace: 'DarkHorse Inc.', channelName: '#general', isDM: false };
    } else if (dbMessage.channel === 'whatsapp') {
      channelContext = { isDM: true };
    } else if (dbMessage.channel === 'telegram') {
      channelContext = { isDM: true };
    }
  }

  return {
    id: dbMessage.id,
    channel: dbMessage.channel as any,
    channelContext,
    sender: {
      name: formatContactName(dbMessage.contact?.displayName || dbMessage.contact?.name || dbMessage.senderName),
      avatar: dbMessage.contact?.avatar || '👤',
      online: false,
    },
    subject: dbMessage.subject || undefined,
    preview: dbMessage.body.substring(0, 100) + (dbMessage.body.length > 100 ? '...' : ''),
    timestamp: new Date(dbMessage.timestamp),
    priority: dbMessage.priority,
    unread: !dbMessage.read,
    answered: dbMessage.read,
    account: 'work' as const,
    topicLabel,
    topicColor,
    hasAIDraft: !!dbMessage.aiDraft || !!dbMessage.aiMetadata?.draftReply,
    thread: dbMessage.thread
      ? {
        messages: dbMessage.thread.map((m: any) => ({
          from: m.senderName,
          content: m.body,
          timestamp: new Date(m.timestamp),
        })),
      }
      : {
        messages: [
          {
            from: dbMessage.senderName,
            content: dbMessage.body,
            timestamp: new Date(dbMessage.timestamp),
          },
        ],
      },
    aiDraft: dbMessage.aiDraft || dbMessage.aiMetadata?.draftReply || undefined,
  };
}

/**
 * Transform database contact to frontend Contact type
 */
function transformContact(dbContact: any): Contact {
  const channels: any[] = [];
  // Infer channels from identities if available, otherwise from metadata
  const identities: any[] = dbContact.identities || [];
  const platforms = new Set(identities.map((i: any) => i.platform));
  if (platforms.has('gmail')) channels.push('gmail');
  if (platforms.has('whatsapp')) channels.push('whatsapp');
  if (platforms.has('telegram')) channels.push('telegram');
  if (platforms.has('slack')) channels.push('slack');

  // Parse personality profile if it's JSON
  let personality;
  try {
    personality = dbContact.personalityProfile
      ? JSON.parse(dbContact.personalityProfile)
      : {
        communicationStyle: 'Professional and concise',
        decisionMaking: 'Collaborative',
        preferredLanguage: 'English',
        interests: [],
        bestTimeToReach: 'Business hours',
      };
  } catch {
    personality = {
      communicationStyle: dbContact.personalityProfile || 'Professional and concise',
      decisionMaking: 'Collaborative',
      preferredLanguage: 'English',
      interests: [],
      bestTimeToReach: 'Business hours',
    };
  }

  // Extract role/location from metadata or notes if available
  let meta: any = {};
  try {
    if (dbContact.metadata) meta = JSON.parse(dbContact.metadata);
  } catch { /* ignore */ }

  return {
    id: dbContact.id,
    name: dbContact.name,
    company: dbContact.company || 'N/A',
    role: meta.role || meta.title || 'Contact',
    location: meta.location || '',
    avatar: dbContact.avatar || '👤',
    avatarUrl: dbContact.avatar?.startsWith('http') ? dbContact.avatar : undefined,
    channels,
    allPlatforms: channels,
    relationshipScore: dbContact.relationshipScore,
    lastInteraction: dbContact.lastContactDate
      ? new Date(dbContact.lastContactDate)
      : new Date(),
    bio: meta.bio || '',
    personality,
  };
}

/**
 * Transform database calendar event to frontend CalendarEvent type
 */
function transformCalendarEvent(dbEvent: any): CalendarEvent {
  const attendees = dbEvent.attendees
    ? typeof dbEvent.attendees === 'string'
      ? JSON.parse(dbEvent.attendees)
      : dbEvent.attendees
    : [];

  return {
    id: dbEvent.id,
    title: dbEvent.title,
    startTime: new Date(dbEvent.startTime),
    endTime: new Date(dbEvent.endTime),
    attendees,
    brief: dbEvent.briefing || 'No briefing available.',
  };
}

/**
 * Get messages for the inbox.
 *
 * Queries via Conversation to guarantee every conversation appears
 * (avoids the old per-message limit cutting off whole threads).
 * Returns up to `conversationLimit` conversations × last 50 messages each.
 */
export async function getMessages(filters?: {
  channel?: string;
  priority?: number;
  read?: boolean;
  contactId?: string;
  limit?: number;            // conversation limit (default 100)
  messagesPerConvo?: number; // messages per conversation (default 50)
}): Promise<Message[]> {
  try {
    const convoWhere: any = {};
    const msgWhere: any = {};

    if (filters?.channel) {
      convoWhere.channel = filters.channel;
      msgWhere.channel = filters.channel;
    }
    if (filters?.priority) msgWhere.priority = { gte: filters.priority };
    if (filters?.read !== undefined) msgWhere.read = filters.read;
    if (filters?.contactId) msgWhere.senderContactId = filters.contactId;

    const conversations = await prisma.conversation.findMany({
      where: convoWhere,
      orderBy: { lastMessageAt: 'desc' },
      take: filters?.limit || 100,
      include: {
        messages: {
          where: Object.keys(msgWhere).length > 0 ? msgWhere : undefined,
          orderBy: { timestamp: 'desc' },
          take: filters?.messagesPerConvo || 50,
          include: {
            contact: { select: { id: true, name: true, displayName: true, avatar: true } },
            aiMetadata: true,
          },
        },
      },
    });

    if (conversations.length === 0) throw new Error('no conversations in db');

    // Flatten: each conversation's messages → Message[], most-recent-first across all convos
    const allMessages = conversations.flatMap(conv => conv.messages.map(transformMessage));

    return allMessages;
  } catch (error) {
    console.error('Error fetching messages from database, falling back to mock data:', error);
    return mockMessages;
  }
}

/**
 * Get unread message counts grouped by channel.
 * Used to populate sidebar badge counts.
 */
export async function getUnreadCountsByChannel(): Promise<Record<string, number>> {
  try {
    const rows = await prisma.message.groupBy({
      by: ['channel'],
      where: { read: false },
      _count: { id: true },
    });
    return Object.fromEntries(rows.map(r => [r.channel, r._count.id]));
  } catch {
    return {};
  }
}

/**
 * Get contacts with optional search
 */
export async function getContacts(search?: string): Promise<Contact[]> {
  try {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { company: { contains: search } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { lastContactDate: 'desc' },
      take: 100,
    });

    return contacts.map(transformContact);
  } catch (error) {
    console.error('Error fetching contacts from database:', error);
    return mockContacts;
  }
}

/**
 * Get single contact with full details
 */
export async function getContactWithPersonality(id: string): Promise<Contact | null> {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
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
      const mockContact = mockContacts.find((c) => c.id === id);
      return mockContact || null;
    }

    return transformContact(contact);
  } catch (error) {
    console.error('Error fetching contact from database:', error);
    const mockContact = mockContacts.find((c) => c.id === id);
    return mockContact || null;
  }
}

/**
 * Get messages for a specific conversation/contact
 */
export async function getConversation(contactId: string): Promise<Message[]> {
  try {
    const messages = await prisma.message.findMany({
      where: { senderContactId: contactId },
      include: {
        contact: {
          select: { id: true, name: true, avatar: true },
        },
        aiMetadata: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    return messages.map(transformMessage);
  } catch (error) {
    console.error('Error fetching conversation from database:', error);
    return mockMessages.filter((m) => m.sender.name === contactId);
  }
}

/**
 * Get briefing data
 */
export async function getBriefing(): Promise<BriefingData> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const priorityMessages = await prisma.message.findMany({
      where: { read: false },
      orderBy: { priority: 'desc' },
      take: 5,
      include: {
        contact: {
          select: { id: true, name: true, avatar: true },
        },
        aiMetadata: true,
      },
    });

    const overdueMessages = await prisma.message.findMany({
      where: {
        timestamp: { lt: oneDayAgo },
        read: false,
      },
      orderBy: { timestamp: 'asc' },
      take: 10,
      include: {
        contact: {
          select: { id: true, name: true, avatar: true },
        },
        aiMetadata: true,
      },
    });

    const todayEvents = await prisma.calendarEvent.findMany({
      where: {
        startTime: {
          gte: todayStart,
          lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { startTime: 'asc' },
      include: {
        contact: {
          select: { id: true, name: true },
        },
      },
    });

    const recentMessages = await prisma.message.findMany({
      where: {
        timestamp: { gte: oneDayAgo },
        priority: { gte: 70 },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
      include: {
        contact: true,
      },
    });

    // Handle async action item extraction
    const allActionItems: string[] = [];
    const extractionPromises = recentMessages.map(async (msg) => {
      const items = await extractActionItems(msg.body);
      return items.map((item) => {
        const contactName = msg.contact?.name || msg.senderName;
        return `${item} (${contactName})`;
      });
    });

    const extractedResults = await Promise.all(extractionPromises);
    extractedResults.forEach((results) => allActionItems.push(...results));

    const [totalToday, unreadCount] = await Promise.all([
      prisma.message.count({
        where: {
          timestamp: { gte: todayStart },
        },
      }),
      prisma.message.count({
        where: { read: false },
      }),
    ]);

    return {
      greeting: now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening',
      date: now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      priorityMessages: priorityMessages.map(transformMessage),
      overdueReplies: overdueMessages.map(transformMessage),
      calendarEvents: todayEvents.map(transformCalendarEvent),
      actionItems: allActionItems.slice(0, 10),
      stats: {
        messagesYesterday: totalToday,
        responseRate: 87,
        avgResponseTime: '2.3 hours',
      },
    };
  } catch (error) {
    console.error('Error fetching briefing from database:', error);
    return mockBriefing;
  }
}

/**
 * Get calendar events
 */
export async function getCalendarEvents(options?: {
  from?: Date;
  to?: Date;
  limit?: number;
}): Promise<CalendarEvent[]> {
  try {
    const where: any = {};
    const fromDate = options?.from || new Date();
    where.startTime = { gte: fromDate };

    if (options?.to) {
      where.startTime = {
        ...where.startTime,
        lte: options.to,
      };
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        contact: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startTime: 'asc' },
      take: options?.limit || 50,
    });

    return events.map(transformCalendarEvent);
  } catch (error) {
    console.error('Error fetching calendar events from database:', error);
    return mockCalendarEvents;
  }
}
