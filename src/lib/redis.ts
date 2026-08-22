/**
 * Shared Redis client for Edge + Node.
 * Uses Upstash REST (works in Next.js middleware / Edge Runtime).
 *
 * Env (either pair):
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * or legacy aliases:
 *   REDIS_URL + REDIS_TOKEN  (must be Upstash REST URL, not redis://)
 *
 * If unset → getRedis() returns null → callers use in-memory fallback.
 */

import { Redis } from '@upstash/redis';

let cached: Redis | null | undefined;

export function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
  return Boolean(url && token && url.startsWith('https://'));
}

/**
 * Singleton Upstash client, or null if not configured / invalid.
 */
export function getRedis(): Redis | null {
  if (cached !== undefined) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;

  if (!url || !token) {
    cached = null;
    return null;
  }

  // Upstash REST only — tcp redis:// is not Edge-compatible here
  if (!url.startsWith('https://')) {
    console.warn(
      '[redis] REDIS_URL must be an https Upstash REST URL for Edge middleware. Falling back to memory.',
    );
    cached = null;
    return null;
  }

  try {
    cached = new Redis({ url, token });
    return cached;
  } catch (e) {
    console.warn('[redis] failed to init client', e);
    cached = null;
    return null;
  }
}

export function redisKey(parts: string[]): string {
  const prefix = process.env.REDIS_KEY_PREFIX || 'pandai';
  return [prefix, ...parts].join(':');
}
