import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';
import { buildAuthUrl } from '@/lib/google-sheets/oauth';

export const STATE_COOKIE = 'pandai_sheets_oauth_state';
const STATE_TTL_SECONDS = 600; // 10 menit

// ===== GET /api/sheets/oauth =====
// Mulai alur OAuth: simpan state di httpOnly cookie, lalu redirect ke Google.
export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    if (!auth.schoolId && auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Akun tidak terikat sekolah' }, { status: 400 });
    }

    // SUPER_ADMIN bisa menghubungkan sekolah mana pun (?schoolId=)
    const { searchParams } = new URL(request.url);
    const targetSchoolId = auth.schoolId || searchParams.get('schoolId') || '';

    // state = <nonce>:<schoolId> — nonce dicek, schoolId dipakai saat callback
    const nonce = randomBytes(16).toString('hex');
    const state = `${nonce}:${targetSchoolId}`;
    const url = buildAuthUrl(state);

    const response = NextResponse.redirect(url, { status: 302 });
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: STATE_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/sheets/oauth', method: 'GET' });
    return NextResponse.json({ error: 'Gagal memulai OAuth Google Sheets' }, { status: 500 });
  }
}
