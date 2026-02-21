import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { extractActionItems } from '@/lib/ai';

/**
 * GET /api/briefing
 * 
 * Morning briefing with priority messages, overdue replies, calendar events,
 * action items, and stats.
 */
export async function GET(request: NextRequest) {
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

    // Find overdue replies (messages from contacts with no response >24h)
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
          },
        },
      },
    });

    // Today's calendar events with contact info
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
            phone: true,
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
    });

    const allActionItems: Array<{ text: string; messageId: string; from: string }> = [];
    
    recentMessages.forEach((msg: { id: string; body: string; from: string }) => {
      const items = await extractActionItems(msg.body);
      items.forEach((item: string) => {
        allActionItems.push({
          text: item,
          messageId: msg.id,
          from: msg.from,
        });
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

    const avgPriority = priorityMessages.length > 0
      ? priorityMessages.reduce((sum, m) => sum + m.priority, 0) / priorityMessages.length
      : 50;

    return NextResponse.json({
      briefing: {
        priorityMessages,
        overdueReplies: overdueMessages,
        todayEvents,
        actionItems: allActionItems.slice(0, 10),
        stats: {
          totalMessagesToday: totalToday,
          unreadCount,
          avgPriority: Math.round(avgPriority),
          overdueCount: overdueMessages.length,
        },
      },
    });
  } catch (error) {
    console.error('Error generating briefing:', error);
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
  }
}
