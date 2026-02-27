import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/lib/auth';

/**
 * POST /api/conversations/read-all
 * Mark all messages in the workspace as read.
 */
export async function POST() {
  try {
    const workspace = await requireWorkspace();

    await prisma.message.updateMany({
      where: { workspaceId: workspace.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch {
    // Even if DB fails, the client-side state is already updated
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
