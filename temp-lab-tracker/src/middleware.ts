import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath = path === '/login' || path === '/signup';

  // Extract session/token from cookies if you use cookie-based auth
  // Since we are using Firebase Client-side SDK in this specific setup, 
  // we'll handle redirects in a client-side layout for now to avoid complexity 
  // with Firebase Admin token verification in middleware.

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/send',
    '/receive',
    '/records',
  ],
};
