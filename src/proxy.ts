import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimitAsync, RATE_AI, RATE_POST } from '@/lib/rate-limit';
import { getSessionTokenFromRequest, verifyProxySession } from '@/lib/proxy-auth';

// Security headers applied to all API responses
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0', // Deprecated; CSP handles this
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';",
};

// HSTS header only in production
function getHstsHeader(): Record<string, string> {
  if (process.env.NODE_ENV === 'production') {
    return { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload' };
  }
  return {};
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract IP (never trust client headers beyond the first hop)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // ─── 0. Segment auth guard for role/dashboard page routes ───
  // These routes are the SPA's deep-link targets. Without an edge guard an
  // unauthenticated visitor receives the page HTML instead of being sent back
  // to the login screen at "/".
  const protectedPagePrefixes = [
    '/admin-school',
    '/guru',
    '/kepala-sekolah',
    '/siswa',
    '/ortu',
    '/accounts',
  ];
  const isProtectedPage = protectedPagePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isProtectedPage) {
    const token = getSessionTokenFromRequest(request);
    const session = token ? await verifyProxySession(token) : null;
    if (!session) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Login brute-force protection lives in the login API route so the same
  // Redis-backed key is not consumed twice (proxy + route).

  // ─── 1. AI endpoints (per IP only — never trust x-user-id) ───
  if (pathname.startsWith('/api/ai/')) {
    const result = await checkRateLimitAsync(`ai:${ip}`, RATE_AI.max, RATE_AI.windowMs);

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
            ...SECURITY_HEADERS,
          },
        }
      );
    }
  }

  // ─── 2. General POST/PUT/DELETE rate limit (per IP only) ───
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth/login') &&
    !pathname.startsWith('/api/ai/') &&
    (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE')
  ) {
    const result = await checkRateLimitAsync(`post:${ip}`, RATE_POST.max, RATE_POST.windowMs);

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
            ...SECURITY_HEADERS,
          },
        }
      );
    }
  }

  // Add security headers to all API responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  const hsts = getHstsHeader();
  for (const [key, value] of Object.entries(hsts)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: [
    // Match all API routes except static and internal Next.js routes
    '/api/auth/login',
    '/api/ai/:path*',
    '/api/:path((?!_next|static|favicon.ico).*)',
    // Protect role/dashboard deep-link page routes at the edge
    '/admin-school/:path*',
    '/guru/:path*',
    '/kepala-sekolah/:path*',
    '/siswa/:path*',
    '/ortu/:path*',
    '/accounts/:path*',
  ],
};
