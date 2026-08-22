import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { checkRateLimit, RATE_LOGIN, RATE_AI, RATE_POST } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';
import {
  trackSessionIp,
  shouldBlockRequest,
  getIpAnomalyMode,
  type IpAnomalyVerdict,
} from '@/lib/ip-anomaly';

// Security headers applied to all API responses
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none';",
};

const JWT_COOKIE_NAME = 'pandai_session';

function getHstsHeader(): Record<string, string> {
  if (process.env.NODE_ENV === 'production') {
    return { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload' };
  }
  return {};
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'CHANGE_ME_IN_PRODUCTION') {
    return new TextEncoder().encode('dev_jwt_secret_do_not_use_in_prod');
  }
  return new TextEncoder().encode(secret);
}

async function readSession(
  request: NextRequest,
): Promise<{ userId: string; role: string; iat?: number } | null> {
  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const userId = payload.userId as string | undefined;
    const role = payload.role as string | undefined;
    if (!userId || !role) return null;
    return { userId, role, iat: typeof payload.iat === 'number' ? payload.iat : undefined };
  } catch {
    return null;
  }
}

function applySecurityHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  const hsts = getHstsHeader();
  for (const [key, value] of Object.entries(hsts)) {
    response.headers.set(key, value);
  }
  return response;
}

function anomalyHeaders(verdict: IpAnomalyVerdict): Record<string, string> {
  if (!verdict.anomaly) return {};
  return {
    'X-IP-Anomaly': verdict.hard ? 'hard' : 'soft',
    'X-IP-Anomaly-Reason': verdict.reason || 'unknown',
  };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // ─── 1. Login brute-force protection (per IP) ───
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const result = checkRateLimit(`login:${ip}`, RATE_LOGIN.max, RATE_LOGIN.windowMs);
    if (!result.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam beberapa detik.',
            retryAfterMs: result.retryAfterMs,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((result.retryAfterMs || 0) / 1000)),
            },
          },
        ),
      );
    }
  }

  // ─── 2. AI endpoints (per IP only — never trust x-user-id) ───
  if (pathname.startsWith('/api/ai/')) {
    const result = checkRateLimit(`ai:${ip}`, RATE_AI.max, RATE_AI.windowMs);
    if (!result.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: `Batas permintaan AI tercapai. Coba lagi dalam ${Math.ceil((result.retryAfterMs || 0) / 1000)} detik.`,
            retryAfterMs: result.retryAfterMs,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((result.retryAfterMs || 0) / 1000)),
            },
          },
        ),
      );
    }
  }

  // ─── 3. General POST/PUT/DELETE rate limit (per IP only) ───
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth/login') &&
    !pathname.startsWith('/api/ai/') &&
    (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE')
  ) {
    const result = checkRateLimit(`post:${ip}`, RATE_POST.max, RATE_POST.windowMs);
    if (!result.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
            retryAfterMs: result.retryAfterMs,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((result.retryAfterMs || 0) / 1000)),
            },
          },
        ),
      );
    }
  }

  // ─── 4. IP anomaly detection (authenticated API only) ───
  let verdict: IpAnomalyVerdict | null = null;
  const isApi = pathname.startsWith('/api/');
  const skipAnomaly =
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/api/health');

  if (isApi && !skipAnomaly) {
    const session = await readSession(request);
    if (session) {
      // Bind tracker to this login instance (userId + iat)
      const sessionKey = `${session.userId}:${session.iat ?? '0'}`;
      verdict = trackSessionIp(sessionKey, session.userId, ip);

      if (verdict.anomaly) {
        // Structured log for observe / SIEM shipper
        console.warn(
          JSON.stringify({
            type: 'IP_ANOMALY',
            hard: verdict.hard,
            reason: verdict.reason,
            userId: session.userId,
            role: session.role,
            path: pathname,
            method: request.method,
            currentIp: verdict.currentIp,
            loginIp: verdict.loginIp,
            lastIp: verdict.lastIp,
            changeCount24h: verdict.changeCount24h,
            mode: getIpAnomalyMode(),
          }),
        );
      }

      if (shouldBlockRequest(verdict, request.method)) {
        return applySecurityHeaders(
          NextResponse.json(
            {
              error: 'Sesi mencurigakan (perubahan jaringan). Silakan masuk kembali.',
              code: 'SESSION_IP_ANOMALY',
              reason: verdict.reason,
            },
            {
              status: 401,
              headers: anomalyHeaders(verdict),
            },
          ),
        );
      }
    }
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  if (verdict?.anomaly) {
    for (const [k, v] of Object.entries(anomalyHeaders(verdict))) {
      response.headers.set(k, v);
    }
  }
  return response;
}

export const config = {
  matcher: [
    '/api/auth/login',
    '/api/ai/:path*',
    '/api/:path((?!_next|static|favicon.ico).*)',
  ],
};
