import { NextRequest, NextResponse } from 'next/server';
import { decrypt, updateSession } from './lib/jwt';

// Ensure paths that shouldn't be protected are excluded
const publicRoutes = ['/', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude static assets and api routes (except auth)
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.includes(pathname);
  const session = request.cookies.get('session')?.value;

  // A session is only valid when it points at a user account (older cookies had no user id).
  let parsedSession = null;
  if (session) {
    const payload = await decrypt(session);
    if (payload?.uid) parsedSession = payload;
  }

  // 1. Redirect unauthenticated users trying to access protected routes
  if (!parsedSession && !isPublicRoute) {
    const res = NextResponse.redirect(new URL('/', request.url));
    if (session) res.cookies.delete('session');
    return res;
  }

  // 2. Redirect authenticated users trying to access login page
  if (parsedSession && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Update session if it exists
  return (parsedSession && (await updateSession(request))) || NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
