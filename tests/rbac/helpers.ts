/**
 * RBAC test helpers: session tokens + HTTP client
 */
import { createSession } from '@/lib/auth';
import { ACCOUNTS, FIX, type AccountKey } from './fixtures';

const JWT_COOKIE = 'pandai_session';

const ROLE_BY_ACCOUNT: Record<AccountKey, string> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_A: 'ADMIN_SCHOOL',
  ADMIN_B: 'ADMIN_SCHOOL',
  GURU_A: 'GURU',
  GURU_B: 'GURU',
  KEPSEK_A: 'KEPALA_SEKOLAH',
  SISWA_A1: 'SISWA',
  SISWA_A2: 'SISWA',
  SISWA_B1: 'SISWA',
  ORTU_A: 'ORANG_TUA',
  ORTU_B: 'ORANG_TUA',
};

const SCHOOL_BY_ACCOUNT: Record<AccountKey, string | null> = {
  SUPER_ADMIN: null,
  ADMIN_A: FIX.schoolA,
  ADMIN_B: FIX.schoolB,
  GURU_A: FIX.schoolA,
  GURU_B: FIX.schoolB,
  KEPSEK_A: FIX.schoolA,
  SISWA_A1: FIX.schoolA,
  SISWA_A2: FIX.schoolA,
  SISWA_B1: FIX.schoolB,
  ORTU_A: FIX.schoolA,
  ORTU_B: FIX.schoolB,
};

/** Create JWT without going through HTTP login (fast unit/integration). */
export async function sessionAs(account: AccountKey): Promise<string> {
  return createSession({
    id: ACCOUNTS[account],
    role: ROLE_BY_ACCOUNT[account],
    schoolId: SCHOOL_BY_ACCOUNT[account],
  });
}

export function cookieHeader(token: string): Record<string, string> {
  return { Cookie: `${JWT_COOKIE}=${token}` };
}

export function baseUrl(): string {
  return process.env.BASE_URL || 'http://127.0.0.1:3000';
}

export type ApiResult = {
  status: number;
  json: unknown;
  headers: Headers;
};

export async function api(
  method: string,
  path: string,
  opts?: {
    account?: AccountKey;
    token?: string;
    body?: unknown;
    headers?: Record<string, string>;
  },
): Promise<ApiResult> {
  const headers: Record<string, string> = {
    ...(opts?.headers || {}),
  };

  if (opts?.account) {
    const token = await sessionAs(opts.account);
    Object.assign(headers, cookieHeader(token));
  } else if (opts?.token) {
    Object.assign(headers, cookieHeader(opts.token));
  }

  if (opts?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let json: unknown = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  return { status: res.status, json, headers: res.headers };
}

export function expectForbidden(status: number) {
  if (![401, 403].includes(status)) {
    throw new Error(`Expected 401/403, got ${status}`);
  }
}

export function expectOk(status: number) {
  if (status < 200 || status >= 300) {
    throw new Error(`Expected 2xx, got ${status}`);
  }
}
