/**
 * GET /api/media/proxy?url=<encoded-matrix-url>
 *
 * Server-side proxy for Matrix/Beeper media files (avatars, images, etc.).
 *
 * Matrix media endpoints require an Authorization header with the Beeper access
 * token.  Browser <img> tags can't attach auth headers, so we proxy the request
 * through this route which retrieves the stored token from the DB and forwards it.
 *
 * Security: only proxies URLs that start with https://matrix.beeper.com/ to prevent
 * SSRF abuse.
 */
import { prisma } from '@/lib/db';
import { requireWorkspace, AuthError } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const encodedUrl = searchParams.get('url');

  if (!encodedUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  const url = decodeURIComponent(encodedUrl);

  // SSRF guard — only proxy Beeper Matrix media
  if (!url.startsWith('https://matrix.beeper.com/')) {
    return new Response('Forbidden: only Beeper Matrix URLs are proxied', { status: 403 });
  }

  try {
    const workspace = await requireWorkspace();

    const connection = await prisma.connection.findFirst({
      where: {
        workspaceId: workspace.id,
        platform: 'beeper',
        status: 'active',
      },
    });

    if (!connection?.accessToken) {
      // No token — return 404 so the <img> onError fires and Avatar shows initials.
      // (Returning a transparent GIF would be a 200, which onError never catches.)
      return new Response('No Beeper token', { status: 404 });
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${connection.accessToken}` },
      // 8-second timeout so a slow Matrix server doesn't block the UI
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // Propagate upstream errors so <img> onError fires and Avatar shows initials
      return new Response('Media fetch failed', { status: response.status === 401 ? 401 : 502 });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache aggressively — Matrix media IDs are content-addressed and never change
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return new Response('Not authenticated', { status: 401 });
    }
    // Return 502 on any unexpected error so <img> onError fires → Avatar shows initials
    return new Response('Proxy error', { status: 502 });
  }
}
