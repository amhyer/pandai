import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, RATE_LOGIN, RATE_AI, RATE_POST } from '@/lib/rate-limit';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── 1. Login brute-force protection (per IP) ───
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const result = checkRateLimit(`login:${ip}`, RATE_LOGIN.max, RATE_LOGIN.windowMs);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam beberapa detik.',
          retryAfterMs: result.retryAfterMs,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.retryAfterMs || 0) / 1000)),
          },
        }
      );
    }
  }

  // ─── 2. AI endpoints (per userId, fallback to IP) ───
  if (pathname.startsWith('/api/ai/')) {
    const userId = request.headers.get('x-user-id') || '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const key = userId ? `ai:${userId}` : `ai:anon:${ip}`;
    const result = checkRateLimit(key, RATE_AI.max, RATE_AI.windowMs);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: `Batas permintaan AI tercapai. Coba lagi dalam ${Math.ceil((result.retryAfterMs || 0) / 1000)} detik.`,
          retryAfterMs: result.retryAfterMs,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.retryAfterMs || 0) / 1000)),
          },
        }
      );
    }
  }

  // ─── 3. General POST/PUT/DELETE rate limit (per userId or IP) ───
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth/login') &&
    !pathname.startsWith('/api/ai/') &&
    (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE')
  ) {
    const userId = request.headers.get('x-user-id') || '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const key = userId ? `post:${userId}` : `post:anon:${ip}`;
    const result = checkRateLimit(key, RATE_POST.max, RATE_POST.windowMs);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
          retryAfterMs: result.retryAfterMs,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.retryAfterMs || 0) / 1000)),
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all API routes except static and internal Next.js routes
    '/api/auth/login',
    '/api/ai/:path*',
    '/api/:path((?!_next|static|favicon.ico).*)',
  ],
};
