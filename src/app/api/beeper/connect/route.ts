import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

const BEEPER_API_URL = 'http://localhost:23373';
const REDIRECT_URI = 'http://localhost:3000/api/beeper/callback';

/** Generate a PKCE code_verifier (cryptographically random, URL-safe, 64 chars) */
function generateCodeVerifier(): string {
  return randomBytes(48).toString('base64url');
}

/** Derive code_challenge = BASE64URL(SHA-256(verifier)) */
function deriveCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/**
 * GET /api/beeper/connect
 *
 * Initiates the Beeper Desktop OAuth flow with PKCE:
 *  1. Ensures a workspace exists (creates one if not)
 *  2. Gets or registers a Beeper OAuth client (stored in workspace.settings)
 *  3. Generates a CSRF state token + PKCE code_verifier / code_challenge
 *  4. Returns the Beeper OAuth authorization URL
 *
 * The frontend redirects the user to that URL. Beeper Desktop shows a consent
 * dialog; on approval it redirects to /api/beeper/callback with a `code`.
 */
export async function GET() {
  try {
    // Ensure a workspace exists (single-user local setup)
    let workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      const user = await prisma.user.upsert({
        where: { email: 'admin@local' },
        create: { email: 'admin@local', name: 'Admin' },
        update: {},
      });
      workspace = await prisma.workspace.create({
        data: { userId: user.id, name: 'My Workspace' },
      });
    }

    // Load workspace settings JSON
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

    // Generate CSRF state token + PKCE pair
    const state = randomBytes(16).toString('base64url');
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = deriveCodeChallenge(codeVerifier);

    // Persist client_id + state + code_verifier in workspace settings
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

    // Build the authorization URL (PKCE S256)
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
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Beeper connect] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
