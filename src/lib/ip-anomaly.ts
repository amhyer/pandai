/**
 * Session IP anomaly detection.
 *
 * Storage:
 *   1. Redis (Upstash) when configured — shared across instances / Edge
 *   2. In-memory Map fallback — single node / local dev
 *
 * Modes (env IP_ANOMALY_MODE):
 *   observe — log + response header only (default)
 *   stepup  — block mutating methods (POST/PUT/PATCH/DELETE), allow GET
 *   block   — 401 all authenticated requests when hard anomaly
 */

import { sameIpv4Prefix } from '@/lib/client-ip';
import { getRedis, redisKey } from '@/lib/redis';

export type IpAnomalyMode = 'observe' | 'stepup' | 'block';

export type IpAnomalyVerdict = {
  anomaly: boolean;
  hard: boolean;
  reason?: string;
  loginIp?: string;
  lastIp?: string;
  currentIp: string;
  changeCount24h: number;
  /** where state was read/written */
  backend?: 'redis' | 'memory';
};

type SessionIpRecord = {
  userId: string;
  loginIp: string;
  lastIp: string;
  ips: string[];
  windowStartedAt: number;
  updatedAt: number;
};

const WINDOW_MS = 24 * 60 * 60 * 1000;
const WINDOW_SEC = 24 * 60 * 60;
const MAX_ENTRIES = 20_000;

/** In-memory fallback — one per server isolate */
const memoryStore = new Map<string, SessionIpRecord>();

function pruneMemory() {
  if (memoryStore.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of memoryStore) {
    if (now - v.updatedAt > WINDOW_MS) memoryStore.delete(k);
  }
  if (memoryStore.size > MAX_ENTRIES) {
    const keys = [...memoryStore.entries()]
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt)
      .slice(0, Math.floor(memoryStore.size / 2))
      .map(([k]) => k);
    for (const k of keys) memoryStore.delete(k);
  }
}

function sessionRedisKey(sessionKey: string): string {
  return redisKey(['ip-sess', sessionKey]);
}

export function getIpAnomalyMode(): IpAnomalyMode {
  const m = (process.env.IP_ANOMALY_MODE || 'observe').toLowerCase();
  if (m === 'block' || m === 'stepup' || m === 'observe') return m;
  return 'observe';
}

export function getIpAllowlist(): Set<string> {
  const raw = process.env.IP_ANOMALY_ALLOWLIST || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function maxIpChanges24h(): number {
  const n = Number(process.env.IP_ANOMALY_MAX_CHANGES || '8');
  return Number.isFinite(n) && n > 0 ? n : 8;
}

function verdictFromRecord(
  rec: SessionIpRecord,
  currentIp: string,
  prevLast: string,
  backend: 'redis' | 'memory',
): IpAnomalyVerdict {
  const changeCount24h = rec.ips.length;
  const maxChanges = maxIpChanges24h();
  const softNetwork = sameIpv4Prefix(rec.loginIp, currentIp, 2);

  if (currentIp === rec.loginIp || currentIp === prevLast) {
    return {
      anomaly: false,
      hard: false,
      currentIp,
      loginIp: rec.loginIp,
      lastIp: prevLast,
      changeCount24h,
      backend,
    };
  }

  if (changeCount24h > maxChanges) {
    return {
      anomaly: true,
      hard: true,
      reason: 'ip_churn',
      currentIp,
      loginIp: rec.loginIp,
      lastIp: prevLast,
      changeCount24h,
      backend,
    };
  }

  if (!softNetwork && currentIp !== rec.loginIp) {
    return {
      anomaly: true,
      hard: true,
      reason: 'ip_jump',
      currentIp,
      loginIp: rec.loginIp,
      lastIp: prevLast,
      changeCount24h,
      backend,
    };
  }

  if (currentIp !== rec.loginIp) {
    return {
      anomaly: true,
      hard: false,
      reason: 'ip_soft',
      currentIp,
      loginIp: rec.loginIp,
      lastIp: prevLast,
      changeCount24h,
      backend,
    };
  }

  return {
    anomaly: false,
    hard: false,
    currentIp,
    loginIp: rec.loginIp,
    lastIp: prevLast,
    changeCount24h,
    backend,
  };
}

function applyIpToRecord(
  rec: SessionIpRecord,
  userId: string,
  currentIp: string,
  now: number,
): { rec: SessionIpRecord; prevLast: string } {
  const prevLast = rec.lastIp;

  if (now - rec.windowStartedAt > WINDOW_MS) {
    rec = {
      userId,
      loginIp: currentIp,
      lastIp: currentIp,
      ips: [currentIp],
      windowStartedAt: now,
      updatedAt: now,
    };
    return { rec, prevLast: currentIp };
  }

  if (!rec.ips.includes(currentIp)) {
    rec.ips = [...rec.ips, currentIp];
  }
  rec.lastIp = currentIp;
  rec.updatedAt = now;
  return { rec, prevLast };
}

async function loadRecord(sessionKey: string): Promise<{
  rec: SessionIpRecord | null;
  backend: 'redis' | 'memory';
}> {
  const redis = getRedis();
  if (redis) {
    try {
      const data = await redis.get<SessionIpRecord>(sessionRedisKey(sessionKey));
      if (data && typeof data === 'object' && data.loginIp) {
        return { rec: data, backend: 'redis' };
      }
      return { rec: null, backend: 'redis' };
    } catch (e) {
      console.warn('[ip-anomaly] redis get failed, using memory', e);
    }
  }
  return { rec: memoryStore.get(sessionKey) ?? null, backend: 'memory' };
}

async function saveRecord(
  sessionKey: string,
  rec: SessionIpRecord,
  prefer: 'redis' | 'memory',
): Promise<'redis' | 'memory'> {
  if (prefer === 'redis' || getRedis()) {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.set(sessionRedisKey(sessionKey), rec, { ex: WINDOW_SEC });
        return 'redis';
      } catch (e) {
        console.warn('[ip-anomaly] redis set failed, using memory', e);
      }
    }
  }
  pruneMemory();
  memoryStore.set(sessionKey, rec);
  return 'memory';
}

/**
 * Track IP for this session key and return anomaly verdict.
 * Prefer await this in middleware (Redis path is async).
 */
export async function trackSessionIp(
  sessionKey: string,
  userId: string,
  currentIp: string,
): Promise<IpAnomalyVerdict> {
  const now = Date.now();
  const allow = getIpAllowlist();

  if (currentIp === 'unknown') {
    return {
      anomaly: false,
      hard: false,
      currentIp,
      changeCount24h: 0,
      reason: 'ip_unknown',
      backend: getRedis() ? 'redis' : 'memory',
    };
  }

  if (allow.has(currentIp)) {
    const { rec, backend } = await loadRecord(sessionKey);
    if (rec) {
      rec.lastIp = currentIp;
      rec.updatedAt = now;
      await saveRecord(sessionKey, rec, backend);
    }
    return {
      anomaly: false,
      hard: false,
      currentIp,
      loginIp: rec?.loginIp,
      lastIp: rec?.lastIp,
      changeCount24h: rec?.ips.length ?? 0,
      reason: 'allowlist',
      backend,
    };
  }

  const loaded = await loadRecord(sessionKey);
  let rec = loaded.rec;
  let backend = loaded.backend;

  if (!rec) {
    rec = {
      userId,
      loginIp: currentIp,
      lastIp: currentIp,
      ips: [currentIp],
      windowStartedAt: now,
      updatedAt: now,
    };
    backend = await saveRecord(sessionKey, rec, backend);
    return {
      anomaly: false,
      hard: false,
      currentIp,
      loginIp: currentIp,
      lastIp: currentIp,
      changeCount24h: 1,
      backend,
    };
  }

  const applied = applyIpToRecord(rec, userId, currentIp, now);
  backend = await saveRecord(sessionKey, applied.rec, backend);
  return verdictFromRecord(applied.rec, currentIp, applied.prevLast, backend);
}

/** Clear tracking (call on logout if sessionKey known) */
export async function clearSessionIp(sessionKey: string): Promise<void> {
  memoryStore.delete(sessionKey);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(sessionRedisKey(sessionKey));
    } catch (e) {
      console.warn('[ip-anomaly] redis del failed', e);
    }
  }
}

export function shouldBlockRequest(
  verdict: IpAnomalyVerdict,
  method: string,
  mode: IpAnomalyMode = getIpAnomalyMode(),
): boolean {
  if (!verdict.hard) return false;
  if (mode === 'observe') return false;
  if (mode === 'block') return true;
  if (mode === 'stepup') {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }
  return false;
}
