/**
 * Data fetching layer for server components
 * Fetches from Prisma with fallback to mock data
 */

import { prisma } from './db';
import { requireWorkspace } from './auth';
import {
  mockContacts,
  type Message,
  type Contact,
  type CalendarEvent,
  type BriefingData,
} from './mockData';
import { extractActionItems } from './ai';

/**
 * Parse Beeper's JSON-wrapped message format.
 *
 * Beeper stores all rich text as JSON: {"text":"content","textEntities":[...]}
 * System events (tapbacks, renames) use a {{sender}} template:
 *   {"text":"{{sender}} loved \"some message\"","textEntities":[...]}
 *
 * We extract the plain `text` field and substitute {{sender}} so the body
 * stored / shown to the user is always a clean readable string.
 *
 * Returns { text, isSystemEvent } — isSystemEvent is true when the original
 * JSON used a {{sender}} template (tapback, rename, group-photo change, etc.)
 */
export function parseBeeperText(body: string, senderName: string = 'Someone'): string {
  if (!body || !body.trim().startsWith('{')) return body;
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed?.text === 'string') {
      return parsed.text.replace(/\{\{sender\}\}/g, senderName);
    }
  } catch { /* not valid JSON — return as-is */ }
  return body;
}

/**
 * Detect Beeper system event messages (tapbacks, renames, group changes).
 *
 * Two sources:
 *  1. Raw DB body still contains {{sender}} template (not yet decoded).
 *  2. Already-decoded bodies that match known system-event verb patterns.
 */
const SYSTEM_EVENT_RE =
  /^.{0,60}?\s+(loved|liked|emphasized|reacted to|laughed at|questioned|disliked|named the conversation|changed the group|left the room|joined the room)\b/i;

export function isBeeperSystemEvent(rawBody: string, decodedBody: string): boolean {
  if (rawBody?.includes('{{sender}}')) return true;
  return SYSTEM_EVENT_RE.test(decodedBody);
}

/**
 * Transform database message to frontend Message type
 */
// Infer topic from subject/body keywords
export function inferTopic(subject: string, body: string): string | undefined {
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

export function getTopicColor(topic: string): string {
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
export function formatContactName(name: string): string {
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

function transformMessage(dbMessage: any, conv?: { id: string; title: string; type: string; externalId?: string | null; contactName?: string; contactAvatar?: string }): Message {
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

  const rawSenderName = formatContactName(
    dbMessage.contact?.displayName || dbMessage.contact?.name || dbMessage.senderName
  );
  // Decode Beeper JSON-wrapped bodies ({"text":"...","textEntities":[...]})
  const cleanBody = parseBeeperText(dbMessage.body, rawSenderName);
  const isSystemEvent = isBeeperSystemEvent(dbMessage.body ?? '', cleanBody);

  return {
    id: dbMessage.id,
    channel: dbMessage.channel as any,
    channelContext,
    sender: {
      name: rawSenderName,
      avatar: dbMessage.contact?.avatar || '👤',
      online: false,
    },
    subject: dbMessage.subject || undefined,
    // preview: ≤150 chars for list rows; body: full text for detail view
    preview: cleanBody.length > 150 ? cleanBody.substring(0, 150) + '…' : cleanBody,
    body: cleanBody,
    externalId: conv?.externalId ?? undefined,
    timestamp: new Date(dbMessage.timestamp),
    priority: dbMessage.priority,
    unread: !dbMessage.read,
    answered: false, // tracked per-conversation, not per-message
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
    conversationId: conv?.id ?? dbMessage.conversationId,
    // Use conv.title first, then fall back to the contact's name on the conversation.
    // This ensures DMs without a group title still display the contact's real name
    // instead of "Me" when the most-recently-fetched message was sent by the user.
    conversationTitle: conv?.title || conv?.contactName || undefined,
    isGroupConversation: (conv?.type ?? dbMessage.conversation?.type) === 'group',
    isSystemEvent,
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
    avatarUrl: (dbContact.avatar?.startsWith('http') || dbContact.avatar?.startsWith('mxc://')) ? dbContact.avatar : undefined,
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
    // Always scope to the authenticated workspace — prevents cross-user data leaks.
    const workspace = await requireWorkspace();

    const convoWhere: any = { workspaceId: workspace.id };
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
        // Include the conversation's own contact so we always have a display name
        // even for DMs where all fetched messages were sent by the current user.
        contact: { select: { id: true, name: true, displayName: true, avatar: true } },
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

    // Flatten: each conversation's messages → Message[], most-recent-first across all convos
    const allMessages = conversations.flatMap(conv => {
      const contactName = conv.contact?.displayName || conv.contact?.name || undefined;
      const contactAvatar = conv.contact?.avatar || undefined;
      return conv.messages.map(msg => transformMessage(msg, {
        id: conv.id,
        title: conv.title,
        type: conv.type,
        externalId: conv.externalId,
        contactName,
        contactAvatar,
      }));
    });

    return allMessages;
  } catch (error) {
    console.error('Error fetching messages from database:', error);
    return [];
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
    return [];
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

    return messages.map((m) => transformMessage(m));
  } catch (error) {
    console.error('Error fetching conversation from database:', error);
    return [];
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
      priorityMessages: priorityMessages.map((m) => transformMessage(m)),
      overdueReplies: overdueMessages.map((m) => transformMessage(m)),
      calendarEvents: todayEvents.map(transformCalendarEvent),
      actionItems: allActionItems.slice(0, 10),
      stats: {
        messagesToday: totalToday,
        unreadCount,
        overdueCount: overdueMessages.length,
      },
    };
  } catch (error) {
    console.error('Error fetching briefing from database:', error);
    const now = new Date();
    return {
      greeting: now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening',
      date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      priorityMessages: [],
      overdueReplies: [],
      calendarEvents: [],
      actionItems: [],
      stats: { messagesToday: 0, unreadCount: 0, overdueCount: 0 },
    };
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
    return [];
  }
}
