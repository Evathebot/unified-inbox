import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/channels/status
 * Returns per-channel message counts and last-message timestamps based on what's
 * actually synced in the DB. Used by the Settings page to show accurate
 * connected / disconnected state for each Beeper-bridged channel.
 */
export async function GET() {
  try {
    const rows = await prisma.message.groupBy({
      by: ['channel'],
      _count: { id: true },
      _max: { timestamp: true },
    });

    // { channel -> { count, lastMessage } }
    const channelData: Record<string, { count: number; lastMessage: string | null }> = {};
    for (const row of rows) {
      channelData[row.channel] = {
        count: row._count.id,
        lastMessage: row._max.timestamp ? row._max.timestamp.toISOString() : null,
      };
    }

    return NextResponse.json({ channels: channelData });
  } catch (error) {
    console.error('[channels/status]', error);
    return NextResponse.json({ channels: {} });
  }
}
