import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const BEEPER_API_URL = 'http://localhost:23373';
const REDIRECT_URI = 'http://localhost:3000/api/beeper/callback';

/**
 * GET /api/beeper/callback
 *
 * Handles the OAuth redirect from Beeper Desktop:
 *  1. Exchanges the authorization code for an access token
 *  2. Saves the token to the Connection record
 *  3. Redirects to /settings?connected=true
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const settingsUrl = new URL('/settings', request.url);

  // User denied authorization in Beeper
  if (errorParam) {
    settingsUrl.searchParams.set('beeper_error', 'authorization_denied');
    return NextResponse.redirect(settingsUrl);
  }

  if (!code) {
    settingsUrl.searchParams.set('beeper_error', 'no_code');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      settingsUrl.searchParams.set('beeper_error', 'no_workspace');
      return NextResponse.redirect(settingsUrl);
    }

    // Load workspace settings
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
    if (state && settings.beeperOAuthState && state !== settings.beeperOAuthState) {
      console.warn('[Beeper callback] State mismatch — possible CSRF');
      settingsUrl.searchParams.set('beeper_error', 'invalid_state');
      return NextResponse.redirect(settingsUrl);
    }

    // PKCE: include code_verifier stored during /connect
    const codeVerifier = settings.beeperCodeVerifier;
    if (!codeVerifier) {
      console.warn('[Beeper callback] No code_verifier found — was /connect called first?');
      settingsUrl.searchParams.set('beeper_error', 'no_code_verifier');
      return NextResponse.redirect(settingsUrl);
    }

    // Exchange authorization code for access token
    const tokenParams: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: codeVerifier,
    };
    const tokenRes = await fetch(`${BEEPER_API_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
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

    // Save / update the Beeper Connection record
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

    // Clear the one-time OAuth state + PKCE verifier from workspace settings
    const { beeperOAuthState: _drop, beeperCodeVerifier: _drop2, ...remainingSettings } = settings;
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { settings: JSON.stringify(remainingSettings) },
    });

    // Redirect back to settings with success flag
    settingsUrl.searchParams.set('connected', 'true');
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    console.error('[Beeper callback] Error:', error);
    settingsUrl.searchParams.set('beeper_error', 'server_error');
    return NextResponse.redirect(settingsUrl);
  }
}
