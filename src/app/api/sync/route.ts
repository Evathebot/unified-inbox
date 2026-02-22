import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { BeeperService } from '@/lib/services/beeper';
import { SyncEngine } from '@/lib/services/sync-engine';

/**
 * POST /api/sync — Trigger a full sync from Beeper
 * 
 * Body: { workspaceId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    // Find the Beeper connection for this workspace
    const connection = await prisma.connection.findFirst({
      where: {
        workspaceId,
        platform: 'beeper',
        status: 'active',
      },
    });

    if (!connection || !connection.accessToken || !connection.apiUrl) {
      return NextResponse.json(
        { error: 'No active Beeper connection found. Set up Beeper first.' },
        { status: 404 }
      );
    }

    // Create Beeper service and sync engine
    const beeper = new BeeperService({
      apiUrl: connection.apiUrl,
      accessToken: connection.accessToken,
    });

    const syncEngine = new SyncEngine(prisma, beeper, workspaceId, connection.id);

    // Run full sync
    const result = await syncEngine.fullSync({
      chatLimit: 50,
      messagesPerChat: 20,
    });

    // Update connection last sync time
    await prisma.connection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('[Sync API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync — Get sync status
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }

  const connection = await prisma.connection.findFirst({
    where: { workspaceId, platform: 'beeper' },
  });

  const syncStates = connection
    ? await prisma.syncState.findMany({
        where: { connectionId: connection.id },
      })
    : [];

  const stats = {
    conversations: await prisma.conversation.count({ where: { workspaceId } }),
    messages: await prisma.message.count({ where: { workspaceId } }),
    contacts: await prisma.contact.count({ where: { workspaceId } }),
  };

  return NextResponse.json({
    connected: !!connection,
    lastSync: connection?.lastSyncAt,
    syncStates,
    stats,
  });
}
