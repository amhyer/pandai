/**
 * Simple in-memory rate limiter for Next.js middleware (Edge Runtime compatible).
 * Suitable for single-instance deployments (self-hosted).
 * Resets on server restart — adequate for pre-production.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, RateLimitEntry>();

// Lazy cleanup: remove stale entries when store grows beyond threshold
function maybeCleanup() {
  if (store.size < 200) return; // only cleanup when store is large
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

/**
 * Check if a request is within rate limits.
 * Returns { allowed, retryAfterMs? }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterMs?: number } {
  maybeCleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return { allowed: true };
  }

  return { allowed: false, retryAfterMs: entry.resetAt - now };
}

// ─── Preset configs ───

/** Login: 5 attempts per 60s per IP */
export const RATE_LOGIN = { max: 5, windowMs: 60_000 };

/** AI endpoints: 20 per 60s per userId */
export const RATE_AI = { max: 20, windowMs: 60_000 };

/** General POST: 30 per 60s per userId (or IP if unauthenticated) */
export const RATE_POST = { max: 30, windowMs: 60_000 };
