/**
 * Next.js Middleware — runs on every request before the page/route handler.
 *
 * We only check that the session cookie _exists_ here (Edge runtime can't
 * call Prisma). The actual DB validation happens inside API routes via
 * requireWorkspace() / getSession().
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Paths that don't need a session
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/beeper/callback', // OAuth redirect — no user session available
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = request.cookies.get('session');

  if (!session) {
    // API requests get a 401 instead of a redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
