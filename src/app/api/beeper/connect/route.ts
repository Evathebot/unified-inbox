import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { requireWorkspace, AuthError } from '@/lib/auth';

const BEEPER_API_URL = 'http://localhost:23373';
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/beeper/callback`;

function generateCodeVerifier(): string {
  return randomBytes(48).toString('base64url');
}

function deriveCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/**
 * GET /api/beeper/connect
 *
 * Initiates the Beeper Desktop OAuth flow with PKCE for the logged-in user.
 * The workspaceId is embedded in the state token so /api/beeper/callback can
 * find the right workspace without a session cookie (the redirect comes from
 * Beeper, not the user's browser session).
 */
export async function GET() {
  try {
    const workspace = await requireWorkspace();

    let settings: Record<string, string> = {};
    try {
      settings = workspace.settings ? JSON.parse(workspace.settings) : {};
    } catch {}

    // Get or register an OAuth client
    let clientId = settings.beeperClientId;
    if (!clientId) {
      const regRes = await fetch(`${BEEPER_API_URL}/oauth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'Unified Inbox',
          redirect_uris: [REDIRECT_URI],
          grant_types: ['authorization_code'],
          response_types: ['code'],
          scope: 'read write',
        }),
      });

      if (!regRes.ok) {
        return NextResponse.json(
          { error: 'Could not register with Beeper. Is Beeper Desktop running?' },
          { status: 502 }
        );
      }

      const reg = await regRes.json();
      clientId = reg.client_id as string;
    }

    // State = <randomToken>.<workspaceId> so callback can look up the right workspace
    const randomState = randomBytes(16).toString('base64url');
    const state = `${randomState}.${workspace.id}`;
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = deriveCodeChallenge(codeVerifier);

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        settings: JSON.stringify({
          ...settings,
          beeperClientId: clientId,
          beeperOAuthState: state,
          beeperCodeVerifier: codeVerifier,
        }),
      },
    });

    const authUrl = new URL(`${BEEPER_API_URL}/oauth/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'read write');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return NextResponse.json({ authUrl: authUrl.toString(), clientId });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Beeper connect] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
