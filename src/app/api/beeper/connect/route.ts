/**
 * Beeper Desktop OAuth helpers.
 *
 * The Beeper Desktop API lives at http://localhost:23373 on the user's Mac.
 * When the app is hosted on Vercel (or any cloud server), the server CANNOT
 * reach that address — only the user's browser can, since both Beeper and
 * the browser are on the same machine.
 *
 * Therefore:
 *   - GET  /api/beeper/connect  → generates PKCE state + code challenge,
 *                                 stores them server-side, and returns them
 *                                 to the browser. No localhost call here.
 *   - POST /api/beeper/connect  → saves the OAuth clientId after the browser
 *                                 has registered with Beeper Desktop.
 *
 * The browser (settings page) is responsible for:
 *   1. Calling POST http://localhost:23373/oauth/register  → gets client_id
 *   2. Redirecting to http://localhost:23373/oauth/authorize?...
 *   3. Landing on /beeper/callback (a client-side page) after Beeper approves
 *   4. Calling POST http://localhost:23373/oauth/token  from that page
 *   5. POSTing the resulting access_token to /api/beeper/configure
 */
import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { requireWorkspace, AuthError } from '@/lib/auth';

function generateCodeVerifier(): string {
  return randomBytes(48).toString('base64url');
}

function deriveCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/**
 * GET /api/beeper/connect
 *
 * Generates PKCE params and stores them in the workspace settings.
 * Returns state, codeVerifier (for the browser to cache), codeChallenge,
 * and the redirectUri the browser should send to Beeper's authorize endpoint.
 */
export async function GET() {
  try {
    const workspace = await requireWorkspace();

    let settings: Record<string, string> = {};
    try {
      settings = workspace.settings ? JSON.parse(workspace.settings) : {};
    } catch {}

    const randomState = randomBytes(16).toString('base64url');
    const state = `${randomState}.${workspace.id}`;
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = deriveCodeChallenge(codeVerifier);

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        settings: JSON.stringify({
          ...settings,
          beeperOAuthState: state,
          beeperCodeVerifier: codeVerifier,
        }),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.json({
      state,
      codeVerifier,   // browser stores this in sessionStorage for the callback page
      codeChallenge,
      redirectUri: `${appUrl}/beeper/callback`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to initialize OAuth flow' }, { status: 500 });
  }
}

/**
 * POST /api/beeper/connect
 *
 * Saves the OAuth clientId + apiUrl after the browser has registered
 * with Beeper Desktop's local HTTP server.
 * Body: { clientId: string; apiUrl: string }
 */
export async function POST(request: Request) {
  try {
    const workspace = await requireWorkspace();
    const { clientId, apiUrl } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    let settings: Record<string, string> = {};
    try {
      settings = workspace.settings ? JSON.parse(workspace.settings) : {};
    } catch {}

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        settings: JSON.stringify({
          ...settings,
          beeperClientId: clientId,
          beeperApiUrl: apiUrl || 'http://localhost:23373',
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to save client ID' }, { status: 500 });
  }
}
