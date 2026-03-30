import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSessionCookieName, verifyAdminSessionToken } from '@/lib/auth/admin-session';

function isProtectedAdminPage(pathname: string) {
  return pathname.startsWith('/admin') && pathname !== '/admin/login';
}

function isProtectedAdminApi(pathname: string) {
  if (pathname === '/api/admin/session') return false;
  return pathname.startsWith('/api/admin') || pathname === '/api/logs' || pathname === '/api/diagnostico';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedAdminPage(pathname) && !isProtectedAdminApi(pathname)) {
    return NextResponse.next();
  }

  const adminCookie = request.cookies.get(getAdminSessionCookieName())?.value;
  const session = await verifyAdminSessionToken(adminCookie);

  if (session) {
    return NextResponse.next();
  }

  if (isProtectedAdminApi(pathname)) {
    return NextResponse.json({ error: 'Acesso administrativo não autorizado.' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/logs', '/api/diagnostico'],
};
