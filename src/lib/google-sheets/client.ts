/**
 * Client ringan Google Sheets v4 (REST) berbasis fetch — tanpa dependency.
 *
 * Menangani:
 *  - Bearer access token
 *  - Auto refresh saat 401 / invalid_grant lalu retry sekali
 *  - Persist token baru via callback `onTokenRefreshed`
 */

import { refreshAccessToken, type SheetsTokens } from './oauth';
import type { SheetsSheetMeta } from './types';

const BASE = 'https://sheets.googleapis.com/v4';

export interface SheetsClientOptions {
  accessToken: string;
  refreshToken: string | null;
  /** Dipanggil saat refresh sukses — persist token (terenkripsi) ke DB. */
  onTokenRefreshed?: (tokens: SheetsTokens) => void | Promise<void>;
}

export class SheetsApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public apiError?: unknown
  ) {
    super(message);
    this.name = 'SheetsApiError';
  }
}

export function createSheetsClient(opts: SheetsClientOptions) {
  let accessToken = opts.accessToken;
  let refreshToken = opts.refreshToken;
  let refreshing: Promise<void> | null = null;

  async function refresh(): Promise<void> {
    if (!refreshToken) return;
    if (!refreshing) {
      refreshing = (async () => {
        try {
          const tokens = await refreshAccessToken(refreshToken);
          accessToken = tokens.access_token;
          if (tokens.refresh_token) refreshToken = tokens.refresh_token;
          await opts.onTokenRefreshed?.(tokens);
        } finally {
          refreshing = null;
        }
      })();
    }
    await refreshing;
  }

  async function request<T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown): Promise<T> {
    const doFetch = () =>
      fetch(`${BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

    let res = await doFetch();

    // Access token kedaluwarsa -> refresh sekali lalu retry
    if (res.status === 401 && refreshToken) {
      await refresh();
      res = await doFetch();
    }

    if (!res.ok) {
      let detail: unknown;
      try {
        detail = await res.json();
      } catch {
        detail = await res.text().catch(() => '');
      }
      const msg =
        (detail as { error?: { message?: string } })?.error?.message ||
        `Sheets API ${res.status}`;
      throw new SheetsApiError(msg, res.status, detail);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    /** Metadata spreadsheet + daftar sheet. */
    getSpreadsheet: (id: string): Promise<SheetsSheetMeta> =>
      request('GET', `/spreadsheets/${encodeURIComponent(id)}?fields=spreadsheetId,title,sheets(properties(title,index))`),

    /** Ambil nilai range (A1 notation). */
    getValues: (id: string, range: string): Promise<string[][]> =>
      request('GET', `/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`),

    /** Tambah baris di bawah data yang ada. */
    appendValues: (id: string, range: string, values: (string | number)[][]): Promise<{ updates: { updatedRange: string } }> =>
      request('POST', `/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { values }),

    /** Tulis (replace) range. */
    updateValues: (id: string, range: string, values: (string | number)[][]): Promise<{ updates: { updatedRange: string } }> =>
      request('PUT', `/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, { values }),

    /** Kosongkan sebuah range. */
    clearRange: (id: string, range: string): Promise<unknown> =>
      request('POST', `/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}:clear`, {}),
  };
}

export type SheetsClient = ReturnType<typeof createSheetsClient>;
