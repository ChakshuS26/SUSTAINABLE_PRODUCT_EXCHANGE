import { NextResponse } from 'next/server';
import { COOKIE, verifyToken } from './lib/jwt';

// Front-end route protection. (API routes re-check the session as well.)
export async function middleware(req) {
  const token = req.cookies.get(COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');

  if (!session) {
    if (isApi) return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const adminOnly = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (adminOnly && session.role !== 'admin') {
    if (isApi) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/my/:path*', '/products/new', '/admin/:path*', '/api/requests/:path*', '/api/reviews/:path*', '/api/admin/:path*'],
};
