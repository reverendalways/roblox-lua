import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/upload',
  '/admin',
  '/account-settings',
  '/creator',
  '/promote'
];

const AUTH_ROUTES = [
  '/login',
  '/signup'
];



export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  
  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    const hasTokenCookie = request.headers.get('cookie')?.includes('token=');
    
    if (hasTokenCookie) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
