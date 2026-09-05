/**
 * Rate limiter for PANDAI.
 *
 * Two backends are supported:
 * 1. In-memory Map (default, single-instance / local dev).
 * 2. Upstash Redis REST (multi-instance production). Enable by setting:
 *      UPSTASH_REDIS_REST_URL=https://...upstash.io
 *      UPSTASH_REDIS_REST_TOKEN=...
 *
 * The in-memory path remains synchronous so it can be used in lightweight
 * checks; the Redis path is asynchronous and is the preferred backend when
 * more than one server instance is running.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const USE_REDIS = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

function maybeCleanup() {
  if (store.size < 200) return;
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

/** Synchronous in-memory rate limit. */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
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

/** Redis-backed rate limit. Falls back to memory on Redis errors. */
export async function checkRateLimitAsync(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!USE_REDIS) {
    return checkRateLimit(key, maxRequests, windowMs);
  }

  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    // Use a pipeline: INCR then attach expiry only if no expiry exists (NX).
    // Upstash REST expects pipelines on the /pipeline endpoint, not the base URL.
    const response = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(ttlSeconds), 'NX'],
      ]),
    });

    if (!response.ok) {
      console.warn(`[rate-limit] Upstash response ${response.status}; falling back to memory`);
      return checkRateLimit(key, maxRequests, windowMs);
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') {
      return checkRateLimit(key, maxRequests, windowMs);
    }

    // Whole-pipeline error, e.g. {"error":"..."}.
    if ('error' in data && typeof data.error === 'string') {
      console.warn(`[rate-limit] Upstash error; falling back to memory: ${data.error}`);
      return checkRateLimit(key, maxRequests, windowMs);
    }

    // Pipeline responses are arrays of { result } objects; take the INCR result (first).
    const first: unknown = Array.isArray(data) ? data[0] : data;
    const rawResult =
      first && typeof first === 'object' && 'result' in first
        ? (first as { result: unknown }).result
        : first;
    const count = Number(rawResult);
    if (Number.isNaN(count)) {
      return checkRateLimit(key, maxRequests, windowMs);
    }
    if (count <= maxRequests) {
      return { allowed: true };
    }
    // Retry-after approximation: we don't know the exact TTL from the response.
    return { allowed: false, retryAfterMs: windowMs };
  } catch (error) {
    console.warn('[rate-limit] Upstash error; falling back to memory:', error);
    return checkRateLimit(key, maxRequests, windowMs);
  }
}

// ─── Preset configs ───

export const RATE_LOGIN = { max: 5, windowMs: 60_000 };
export const RATE_AI = { max: 20, windowMs: 60_000 };
export const RATE_POST = { max: 30, windowMs: 60_000 };
