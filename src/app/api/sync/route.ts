/**
 * POST /api/sync
 *
 * Triggers a full Beeper → database sync for the authenticated workspace.
 *
 * Two modes:
 *  A) Browser-push mode: The request body contains `{ accounts, chats, messagesMap }`
 *     pre-fetched by the browser from localhost:23373. Used in production (Vercel)
 *     where the server cannot reach the user's local Beeper Desktop.
 *  B) Server-fetch mode: No body. The server fetches directly from Beeper Desktop.
 *     Only works in local development where localhost:23373 is accessible.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/lib/auth';
import { BeeperService } from '@/lib/services/beeper';
import { SyncEngine } from '@/lib/services/sync-engine';

/**
 * A drop-in BeeperService replacement that serves pre-fetched data from
 * the browser instead of making HTTP calls. Used in production where the
 * server can't reach localhost:23373.
 */
class BrowserPushedBeeperService {
  constructor(
    private accounts: any[],
    private chats: any[],
    private messagesMap: Record<string, any[]>,
  ) {}

  async getAccounts() { return this.accounts; }

  async getChats() {
    return { items: this.chats, hasMore: false, nextCursor: undefined };
  }

  async getMessages(chatId: string) {
    return { items: this.messagesMap[chatId] ?? [], hasMore: false };
  }
}

/**
 * Format a raw Beeper contact name into something human-readable.
 * Mirrors the display-layer logic in data.ts so DB names stay clean too.
 */
function cleanContactName(name: string): string | null {
  if (!name) return null;

  // Already looks like a real name (has a letter and a space, not an ID)
  if (/[a-z]/i.test(name) && name.includes(' ') && !name.includes(':beeper')) return null;

  // Beeper Matrix IDs: @xxx:beeper.local
  if (name.includes(':beeper.local') || name.includes(':beeper.im')) {
    const local = name.split(':')[0].replace(/^@/, '');
    const cleaned = local
      .replace(/^slackgo_/, '')
      .replace(/^telegramgo_/, '')
      .replace(/^whatsappgo_/, '')
      .replace(/^signalgo_/, '');
    if (/^[a-f0-9\-]{20,}$/i.test(cleaned)) return null; // can't do better, leave for manual edit
    return cleaned;
  }

  // Pure phone number
  const digitsOnly = name.replace(/^\+/, '').replace(/\D/g, '');
  if (digitsOnly.length >= 10 && /^[\d\+]+$/.test(name)) {
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      const n = digitsOnly.slice(1);
      return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
    }
    if (digitsOnly.length === 10) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    }
    return `+${digitsOnly}`;
  }

  return null; // no improvement possible
}

async function cleanupContactNames(workspaceId: string): Promise<number> {
  const contacts = await prisma.contact.findMany({ where: { workspaceId } });
  let updated = 0;
  for (const contact of contacts) {
    const cleaned = cleanContactName(contact.name);
    if (cleaned && cleaned !== contact.name) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { name: cleaned },
      });
      updated++;
    }
  }
  return updated;
}

/**
 * POST /api/sync — Trigger a full sync from Beeper
 */
export async function POST(request: Request) {
  try {
    const workspace = await requireWorkspace();

    // Find the Beeper connection for this workspace
    const connection = await prisma.connection.findFirst({
      where: {
        workspaceId: workspace.id,
        platform: 'beeper',
        status: 'active',
      },
    });

    if (!connection || !connection.accessToken || !connection.apiUrl) {
      return NextResponse.json(
        { error: 'No active Beeper connection found. Configure Beeper in Settings first.' },
        { status: 404 }
      );
    }

    // Check if the browser pushed pre-fetched Beeper data (production mode)
    let beeper: BeeperService | BrowserPushedBeeperService;
    let body: any = {};
    try { body = await request.json(); } catch { /* no body — server-fetch mode */ }

    if (body?.accounts && body?.chats) {
      // Mode A: browser pre-fetched the data
      console.log(`[Sync] Browser-push mode — ${body.chats.length} chats received`);
      beeper = new BrowserPushedBeeperService(
        body.accounts,
        body.chats,
        body.messagesMap ?? {},
      );
    } else {
      // Mode B: server-fetch mode (local dev only)
      console.log('[Sync] Server-fetch mode — calling Beeper Desktop directly');
      beeper = new BeeperService({
        apiUrl: connection.apiUrl,
        accessToken: connection.accessToken,
      });
    }

    const syncEngine = new SyncEngine(prisma, beeper as BeeperService, workspace.id, connection.id);

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

    // Detect auth failures — Beeper returns 401 when the token is expired
    const isAuthError = result.errors.some(e =>
      e.includes('401') || e.toLowerCase().includes('unauthorized') || e.toLowerCase().includes('invalid token')
    );
    if (isAuthError) {
      return NextResponse.json(
        { error: 'Beeper token expired — please Reconnect in Settings to get a fresh token.' },
        { status: 401 }
      );
    }

    // Clean up phone-number and beeper-ID contact names in the DB
    const namesFixed = await cleanupContactNames(workspace.id);
    console.log(`[Sync] Cleaned up ${namesFixed} contact names`);

    return NextResponse.json({ success: true, result, namesFixed });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Sync failed';
    console.error('[Sync API] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/sync — Get sync status
 */
export async function GET() {
  try {
    const workspace = await requireWorkspace();

    const connection = await prisma.connection.findFirst({
      where: { workspaceId: workspace.id, platform: 'beeper' },
    });

    const stats = {
      conversations: await prisma.conversation.count({ where: { workspaceId: workspace.id } }),
      messages: await prisma.message.count({ where: { workspaceId: workspace.id } }),
      contacts: await prisma.contact.count({ where: { workspaceId: workspace.id } }),
    };

    return NextResponse.json({
      connected: connection?.status === 'active',
      lastSync: connection?.lastSyncAt || null,
      stats,
    });
  } catch {
    return NextResponse.json({ connected: false, stats: {} });
  }
}
