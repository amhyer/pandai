import type { NextRequest } from 'next/server';

/**
 * Resolve client IP behind reverse proxy (Caddy / Nginx / Cloudflare).
 * Only trust forwarded headers when the app is actually behind a proxy
 * that overwrites them (do not trust raw client-supplied hops blindly).
 */
export function getClientIpFromHeaders(headers: Headers): string {
  // Cloudflare
  const cf = headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;

  // Standard proxy chain — first hop is the original client when proxy appends
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }

  const real = headers.get('x-real-ip')?.trim();
  if (real) return real;

  return 'unknown';
}

export function getClientIp(request: NextRequest | Request): string {
  return getClientIpFromHeaders(request.headers);
}

/** Rough same-network check: first two IPv4 octets (e.g. school NAT churn). */
export function sameIpv4Prefix(a: string, b: string, octets = 2): boolean {
  if (a === b) return true;
  if (a === 'unknown' || b === 'unknown') return false;
  const pa = a.split('.');
  const pb = b.split('.');
  if (pa.length !== 4 || pb.length !== 4) return false;
  for (let i = 0; i < octets; i++) {
    if (pa[i] !== pb[i]) return false;
  }
  return true;
}
