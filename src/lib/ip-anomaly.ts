/**
 * Session IP anomaly detection (Edge-compatible).
 *
 * Storage is an in-memory Map: fine for single-node / long-lived process.
 * On multi-instance serverless, replace with Redis/KV for shared state.
 *
 * Modes (env IP_ANOMALY_MODE):
 *   observe — log + response header only (default)
 *   stepup  — block mutating methods (POST/PUT/PATCH/DELETE), allow GET
 *   block   — 401 all authenticated requests when hard anomaly
 */

import { sameIpv4Prefix } from '@/lib/client-ip';

export type IpAnomalyMode = 'observe' | 'stepup' | 'block';

export type IpAnomalyVerdict = {
  anomaly: boolean;
  hard: boolean;
  reason?: string;
  loginIp?: string;
  lastIp?: string;
  currentIp: string;
  changeCount24h: number;
};

type SessionIpRecord = {
  userId: string;
  loginIp: string;
  lastIp: string;
  /** distinct IPs seen in the rolling window */
  ips: string[];
  windowStartedAt: number;
  updatedAt: number;
};

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 20_000;

/** Global store — one per server isolate */
const store = new Map<string, SessionIpRecord>();

function pruneIfNeeded() {
  if (store.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of store) {
    if (now - v.updatedAt > WINDOW_MS) store.delete(k);
  }
  // still too big: drop oldest half
  if (store.size > MAX_ENTRIES) {
    const keys = [...store.entries()]
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt)
      .slice(0, Math.floor(store.size / 2))
      .map(([k]) => k);
    for (const k of keys) store.delete(k);
  }
}

export function getIpAnomalyMode(): IpAnomalyMode {
  const m = (process.env.IP_ANOMALY_MODE || 'observe').toLowerCase();
  if (m === 'block' || m === 'stepup' || m === 'observe') return m;
  return 'observe';
}

/** Comma-separated allowlist, e.g. school public IPs */
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

/**
 * Track IP for this session key and return anomaly verdict.
 * @param sessionKey stable id for this login (e.g. userId + token iat, or hash)
 */
export function trackSessionIp(
  sessionKey: string,
  userId: string,
  currentIp: string,
): IpAnomalyVerdict {
  const now = Date.now();
  const allow = getIpAllowlist();

  if (currentIp === 'unknown') {
    return {
      anomaly: false,
      hard: false,
      currentIp,
      changeCount24h: 0,
      reason: 'ip_unknown',
    };
  }

  if (allow.has(currentIp)) {
    // still update last seen
    const existing = store.get(sessionKey);
    if (existing) {
      existing.lastIp = currentIp;
      existing.updatedAt = now;
    }
    return {
      anomaly: false,
      hard: false,
      currentIp,
      loginIp: existing?.loginIp,
      lastIp: existing?.lastIp,
      changeCount24h: existing?.ips.length ?? 0,
      reason: 'allowlist',
    };
  }

  pruneIfNeeded();

  let rec = store.get(sessionKey);
  if (!rec) {
    rec = {
      userId,
      loginIp: currentIp,
      lastIp: currentIp,
      ips: [currentIp],
      windowStartedAt: now,
      updatedAt: now,
    };
    store.set(sessionKey, rec);
    return {
      anomaly: false,
      hard: false,
      currentIp,
      loginIp: currentIp,
      lastIp: currentIp,
      changeCount24h: 1,
    };
  }

  // reset window if expired
  if (now - rec.windowStartedAt > WINDOW_MS) {
    rec.windowStartedAt = now;
    rec.ips = [currentIp];
    rec.loginIp = currentIp;
  } else if (!rec.ips.includes(currentIp)) {
    rec.ips.push(currentIp);
  }

  const prevLast = rec.lastIp;
  rec.lastIp = currentIp;
  rec.updatedAt = now;
  store.set(sessionKey, rec);

  const changeCount24h = rec.ips.length;
  const maxChanges = maxIpChanges24h();

  // Soft: different IP but same /16 — treat as mild (mobile/NAT)
  const softNetwork = sameIpv4Prefix(rec.loginIp, currentIp, 2);

  if (currentIp === rec.loginIp || currentIp === prevLast) {
    return {
      anomaly: false,
      hard: false,
      currentIp,
      loginIp: rec.loginIp,
      lastIp: prevLast,
      changeCount24h,
    };
  }

  // Hard: many distinct IPs in 24h
  if (changeCount24h > maxChanges) {
    return {
      anomaly: true,
      hard: true,
      reason: 'ip_churn',
      currentIp,
      loginIp: rec.loginIp,
      lastIp: prevLast,
      changeCount24h,
    };
  }

  // Hard: login IP and current differ and not same /16
  if (!softNetwork && currentIp !== rec.loginIp) {
    return {
      anomaly: true,
      hard: true,
      reason: 'ip_jump',
      currentIp,
      loginIp: rec.loginIp,
      lastIp: prevLast,
      changeCount24h,
    };
  }

  // Mild anomaly (same /16 but not identical)
  if (currentIp !== rec.loginIp) {
    return {
      anomaly: true,
      hard: false,
      reason: 'ip_soft',
      currentIp,
      loginIp: rec.loginIp,
      lastIp: prevLast,
      changeCount24h,
    };
  }

  return {
    anomaly: false,
    hard: false,
    currentIp,
    loginIp: rec.loginIp,
    lastIp: prevLast,
    changeCount24h,
  };
}

/** Clear tracking (e.g. after logout) */
export function clearSessionIp(sessionKey: string) {
  store.delete(sessionKey);
}

export function shouldBlockRequest(
  verdict: IpAnomalyVerdict,
  method: string,
  mode: IpAnomalyMode = getIpAnomalyMode(),
): boolean {
  if (!verdict.hard) return false;
  if (mode === 'observe') return false;
  if (mode === 'block') return true;
  // stepup: only mutating methods
  if (mode === 'stepup') {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }
  return false;
}
