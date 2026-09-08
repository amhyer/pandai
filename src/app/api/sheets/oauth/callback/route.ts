import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, AuthError } from '@/lib/auth';
import { encryptText } from '@/lib/encryption';
import { exchangeCodeForTokens } from '@/lib/google-sheets/oauth';
import { STATE_COOKIE } from '../route';

const BACK_URL = '/admin-school/settings?section=sheets';

function fail(message: string, code: number) {
  return NextResponse.redirect(`${BACK_URL}&error=${encodeURIComponent(message)}&code=${code}`, { status: 302 });
}

// ===== GET /api/sheets/oauth/callback =====
// Google redirect balik membawa ?code&state. Tukar code -> token, simpan
// terenkripsi, tandai config connected, lalu balik ke halaman pengaturan.
export async function GET(request: Request) {
  try {
    // Verifikasi sesi admin (cookie httpOnly) — callback harus milik user terautentikasi
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const googleError = searchParams.get('error');

    if (googleError) {
      return fail(`Google menolak: ${googleError}`, 400);
    }
    if (!code || !state) {
      return fail('Kode/state OAuth tidak lengkap', 400);
    }

    const cookieStore = await cookies();
    const savedState = cookieStore.get(STATE_COOKIE)?.value;
    // Hapus cookie state (sekali pakai)
    cookieStore.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });

    if (!savedState || savedState !== state) {
      // Proteksi CSRF: state tidak cocok
      logError({
        error: new Error('OAuth state mismatch'),
        route: '/api/sheets/oauth/callback',
        method: 'GET',
      });
      return fail('State OAuth tidak valid (kemungkinan CSRF). Coba lagi dari awal.', 400);
    }

    const noncePart = state.split(':')[0];
    if (!noncePart || noncePart.length < 16) {
      return fail('Format state tidak valid', 400);
    }
    const schoolId = state.split(':')[1] || null;
    if (!schoolId) {
      return fail('School ID tidak ada pada state OAuth', 400);
    }

    // Tukar kode dengan token
    const tokens = await exchangeCodeForTokens(code);

    const existing = await db.googleSheetsConfig.findFirst({ where: { schoolId } });
    const accessTokenExpiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);

    const data = {
      status: 'connected' as const,
      encryptedAccessToken: encryptText(tokens.access_token),
      encryptedRefreshToken: tokens.refresh_token ? encryptText(tokens.refresh_token) : null,
      accessTokenExpiresAt,
      lastError: null,
    };

    if (existing) {
      await db.googleSheetsConfig.update({ where: { id: existing.id }, data });
    } else {
      await db.googleSheetsConfig.create({
        data: { schoolId, ...data },
      });
    }

    return NextResponse.redirect(`${BACK_URL}&status=connected`, { status: 302 });
  } catch (error) {
    if (error instanceof AuthError) {
      return fail('Sesi tidak valid, silakan login ulang', error.status);
    }
    logError({ error, route: '/api/sheets/oauth/callback', method: 'GET' });
    return fail('Gagal menyelesaikan koneksi Google Sheets', 500);
  }
}
