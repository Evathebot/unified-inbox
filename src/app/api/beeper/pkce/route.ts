import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/beeper/pkce?state=<state>
 *
 * Fallback endpoint for the /beeper/callback client page when
 * localStorage is unavailable (e.g. Beeper Desktop opened the redirect
 * URL in a different browser than the one that initiated the OAuth flow).
 *
 * Security: the `state` param is validated against the stored OAuth state
 * for the workspace it claims to belong to — so only the holder of the
 * original PKCE state can retrieve the code verifier.
 *
 * Returns: { codeVerifier, clientId, apiUrl }
 */
export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state');
  if (!state) {
    return NextResponse.json({ error: 'state required' }, { status: 400 });
  }

  // Extract workspaceId from state: format is "<randomToken>.<workspaceId>"
  const dotIndex = state.lastIndexOf('.');
  if (dotIndex === -1) {
    return NextResponse.json({ error: 'invalid state format' }, { status: 400 });
  }
  const workspaceId = state.slice(dotIndex + 1);

  try {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return NextResponse.json({ error: 'workspace not found' }, { status: 404 });
    }

    let settings: Record<string, string> = {};
    try {
      settings = workspace.settings ? JSON.parse(workspace.settings) : {};
    } catch { /* ignore */ }

    // CSRF check: state must match what was stored during /api/beeper/connect
    if (!settings.beeperOAuthState || settings.beeperOAuthState !== state) {
      return NextResponse.json({ error: 'state mismatch' }, { status: 403 });
    }

    const codeVerifier = settings.beeperCodeVerifier;
    const clientId = settings.beeperClientId;

    if (!codeVerifier || !clientId) {
      return NextResponse.json({ error: 'pkce params not found' }, { status: 404 });
    }

    return NextResponse.json({
      codeVerifier,
      clientId,
      apiUrl: settings.beeperApiUrl || 'http://localhost:23373',
    });
  } catch (error) {
    console.error('[BeeperPKCE] Error:', error);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
