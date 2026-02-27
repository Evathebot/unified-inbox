import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const BEEPER_API_URL = 'http://localhost:23373';
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/beeper/callback`;

/**
 * GET /api/beeper/callback
 *
 * Handles the OAuth redirect from Beeper Desktop.
 * The workspaceId is extracted from the state parameter (set by /connect),
 * so we can find the right user's workspace without a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const settingsUrl = new URL('/settings', request.url);

  if (errorParam) {
    settingsUrl.searchParams.set('beeper_error', 'authorization_denied');
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !state) {
    settingsUrl.searchParams.set('beeper_error', 'no_code');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    // Extract workspaceId from state: format is "<randomToken>.<workspaceId>"
    const dotIndex = state.lastIndexOf('.');
    if (dotIndex === -1) {
      settingsUrl.searchParams.set('beeper_error', 'invalid_state');
      return NextResponse.redirect(settingsUrl);
    }
    const workspaceId = state.slice(dotIndex + 1);

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      settingsUrl.searchParams.set('beeper_error', 'no_workspace');
      return NextResponse.redirect(settingsUrl);
    }

    let settings: Record<string, string> = {};
    try {
      settings = workspace.settings ? JSON.parse(workspace.settings) : {};
    } catch {}

    const clientId = settings.beeperClientId;
    if (!clientId) {
      settingsUrl.searchParams.set('beeper_error', 'no_client_id');
      return NextResponse.redirect(settingsUrl);
    }

    // CSRF: verify state matches what we stored
    if (settings.beeperOAuthState && state !== settings.beeperOAuthState) {
      console.warn('[Beeper callback] State mismatch — possible CSRF');
      settingsUrl.searchParams.set('beeper_error', 'invalid_state');
      return NextResponse.redirect(settingsUrl);
    }

    const codeVerifier = settings.beeperCodeVerifier;
    if (!codeVerifier) {
      settingsUrl.searchParams.set('beeper_error', 'no_code_verifier');
      return NextResponse.redirect(settingsUrl);
    }

    // Exchange authorization code for access token
    const tokenRes = await fetch(`${BEEPER_API_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: clientId,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[Beeper callback] Token exchange failed:', err);
      settingsUrl.searchParams.set('beeper_error', 'token_exchange_failed');
      return NextResponse.redirect(settingsUrl);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string | undefined;

    if (!accessToken) {
      settingsUrl.searchParams.set('beeper_error', 'no_token');
      return NextResponse.redirect(settingsUrl);
    }

    // Save / update this workspace's Beeper Connection
    const existing = await prisma.connection.findFirst({
      where: { workspaceId: workspace.id, platform: 'beeper' },
    });

    if (existing) {
      await prisma.connection.update({
        where: { id: existing.id },
        data: { apiUrl: BEEPER_API_URL, accessToken, status: 'active', updatedAt: new Date() },
      });
    } else {
      await prisma.connection.create({
        data: {
          workspaceId: workspace.id,
          platform: 'beeper',
          apiUrl: BEEPER_API_URL,
          accessToken,
          status: 'active',
        },
      });
    }

    // Clean up one-time OAuth state + PKCE verifier
    const { beeperOAuthState: _s, beeperCodeVerifier: _v, ...remaining } = settings;
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { settings: JSON.stringify(remaining) },
    });

    settingsUrl.searchParams.set('connected', 'true');
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    console.error('[Beeper callback] Error:', error);
    settingsUrl.searchParams.set('beeper_error', 'server_error');
    return NextResponse.redirect(settingsUrl);
  }
}
