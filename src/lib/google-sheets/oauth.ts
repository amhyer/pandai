/**
 * Google OAuth 2.0 helper untuk Sheets (Authorization Code + Refresh).
 *
 * Alur:
 *  1. `buildAuthUrl` -> arahkan browser admin ke Google (state disimpan di cookie).
 *  2. Google redirect ke `GOOGLE_SHEETS_REDIRECT_URI` membawa `?code&state`.
 *  3. `exchangeCodeForTokens` menukar code dengan access+refresh token.
 *  4. Refresh token disimpan terenkripsi; `refreshAccessToken` dipakai saat
 *     access token kedaluwarsa (lihat client.ts).
 *
 * Lihat docs/GOOGLE_SHEETS_SYNC_SETUP.md untuk setup Google Cloud project.
 */

import { SHEETS_SCOPES } from './types';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Env ${name} belum dikonfigurasi (lihat docs/GOOGLE_SHEETS_SYNC_SETUP.md)`);
  return v;
}

export function getClientId(): string {
  return requiredEnv('GOOGLE_SHEETS_CLIENT_ID');
}
export function getClientSecret(): string {
  return requiredEnv('GOOGLE_SHEETS_CLIENT_SECRET');
}
export function getRedirectUri(): string {
  return (
    process.env.GOOGLE_SHEETS_REDIRECT_URI ||
    `${process.env.APP_URL || 'http://localhost:3000'}/api/sheets/oauth/callback`
  );
}

/** Bangun URL authorization Google (prompt=consent agar refresh token keluar). */
export function buildAuthUrl(state: string): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', getClientId());
  url.searchParams.set('redirect_uri', getRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SHEETS_SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  return url.toString();
}

export interface SheetsTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // detik
  scope?: string;
  token_type?: string;
}

async function postToken(params: Record<string, string>): Promise<SheetsTokens> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    ...params,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json()) as SheetsTokens & { error?: string; error_description?: string };
  if (!res.ok || data.error) {
    throw new Error(`Google token error: ${data.error}${data.error_description ? ` — ${data.error_description}` : ''}`);
  }
  return data as SheetsTokens;
}

/** Tukar authorization code dengan token (sekali pakai). */
export async function exchangeCodeForTokens(code: string): Promise<SheetsTokens> {
  return postToken({
    code,
    grant_type: 'authorization_code',
    redirect_uri: getRedirectUri(),
  });
}

/** Segarkan access token memakai refresh token. */
export async function refreshAccessToken(refreshToken: string): Promise<SheetsTokens> {
  return postToken({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
}
