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
function transformMessage(dbMessage: any): Message {
  return {
    id: dbMessage.id,
    channel: dbMessage.channel as any,
    sender: {
      name: dbMessage.contact?.name || dbMessage.from,
      avatar: dbMessage.contact?.avatar || '👤',
      online: false, // We don't track online status yet
    },
    subject: dbMessage.subject || undefined,
    preview: dbMessage.body.substring(0, 100) + (dbMessage.body.length > 100 ? '...' : ''),
    timestamp: new Date(dbMessage.timestamp),
    priority: dbMessage.priority,
    unread: !dbMessage.read,
    hasAIDraft: !!dbMessage.aiDraft || !!dbMessage.aiMetadata?.draftReply,
    thread: dbMessage.thread
      ? {
          messages: dbMessage.thread.map((m: any) => ({
            from: m.from,
            content: m.body,
            timestamp: new Date(m.timestamp),
          })),
        }
      : {
          messages: [
            {
              from: dbMessage.from,
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
  if (dbContact.email) channels.push('gmail');
  if (dbContact.whatsappId) channels.push('whatsapp');
  if (dbContact.telegramId) channels.push('telegram');
  if (dbContact.slackId) channels.push('slack');

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

  return {
    id: dbContact.id,
    name: dbContact.name,
    company: dbContact.businessEntity || 'N/A',
    role: 'Contact', // Not in schema yet
    avatar: dbContact.avatar || '👤',
    channels,
    relationshipScore: dbContact.relationshipScore,
    lastInteraction: dbContact.lastContactDate
      ? new Date(dbContact.lastContactDate)
      : new Date(),
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
 * Get messages with filtering
 */
export async function getMessages(filters?: {
  channel?: string;
  priority?: number;
  read?: boolean;
  contactId?: string;
  limit?: number;
}): Promise<Message[]> {
  try {
    const where: any = {};

    if (filters?.channel) where.channel = filters.channel;
    if (filters?.priority) where.priority = { gte: filters.priority };
    if (filters?.read !== undefined) where.read = filters.read;
    if (filters?.contactId) where.contactId = filters.contactId;

    const messages = await prisma.message.findMany({
      where,
      include: {
        contact: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        aiMetadata: true,
      },
      orderBy: [{ priority: 'desc' }, { timestamp: 'desc' }],
      take: filters?.limit || 50,
    });

    return messages.map(transformMessage);
  } catch (error) {
    console.error('Error fetching messages from database:', error);
    // Fallback to mock data
    return mockMessages;
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
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { businessEntity: { contains: search, mode: 'insensitive' } },
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
    // Fallback to mock data
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
      // Try mock data fallback
      const mockContact = mockContacts.find((c) => c.id === id);
      return mockContact || null;
    }

    return transformContact(contact);
  } catch (error) {
    console.error('Error fetching contact from database:', error);
    // Fallback to mock data
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
      where: { contactId },
      include: {
        contact: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        aiMetadata: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    return messages.map(transformMessage);
  } catch (error) {
    console.error('Error fetching conversation from database:', error);
    // Fallback to mock data
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

    // Get top 5 priority messages
    const priorityMessages = await prisma.message.findMany({
      where: { read: false },
      orderBy: { priority: 'desc' },
      take: 5,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        aiMetadata: true,
      },
    });

    // Find overdue replies
    const overdueMessages = await prisma.message.findMany({
      where: {
        timestamp: { lt: oneDayAgo },
        read: false,
      },
      orderBy: { timestamp: 'asc' },
      take: 10,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        aiMetadata: true,
      },
    });

    // Today's calendar events
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
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Extract action items from recent high-priority messages
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

    const allActionItems: string[] = [];

    recentMessages.forEach((msg) => {
      const items = extractActionItems(msg.body);
      items.forEach((item) => {
        const contactName = msg.contact?.name || msg.from;
        allActionItems.push(`${item} (${contactName})`);
      });
    });

    // Stats
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
      greeting: `Good morning`,
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
        responseRate: 87, // Placeholder - needs calculation
        avgResponseTime: '2.3 hours', // Placeholder - needs calculation
      },
    };
  } catch (error) {
    console.error('Error fetching briefing from database:', error);
    // Fallback to mock data
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

    // Default to upcoming events
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
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: options?.limit || 50,
    });

    return events.map(transformCalendarEvent);
  } catch (error) {
    console.error('Error fetching calendar events from database:', error);
    // Fallback to mock data
    return mockCalendarEvents;
  }
}
