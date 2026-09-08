import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';
import { runSync, SheetsNotConfiguredError } from '@/lib/google-sheets/sync';

/**
 * Sync manual (admin) dan/atau terjadwal (cron).
 *
 * Manual:  POST /api/sheets/sync                { type?: 'SISWA'|'NILAI'|'all' }
 * Cron:    GET  /api/sheets/sync                (Vercel Cron — header Authorization: Bearer $CRON_SECRET)
 *          POST /api/sheets/sync?cron=1         + header x-cron-secret (cron eksternal)
 *          → hanya eksekusi sekolah yang scheduleFrequency != none dan sudah jatuh tempo.
 *
 * Vercel Cron terdaftar di vercel.json. Vercel Cron selalu mengirim GET dan tidak
 * bisa menyertakan custom header; ia otomatis menambahkan `Authorization: Bearer
 * $CRON_SECRET` bila project men-set env CRON_SECRET — jadi set CRON_SECRET sama
 * dengan SHEETS_SYNC_CRON_SECRET (lihat docs/GOOGLE_SHEETS_SYNC_SETUP.md).
 */

function isScheduleDue(frequency: string, lastSyncAt: Date | null): boolean {
  if (frequency === 'none') return false;
  if (!lastSyncAt) return true;
  const hours = (Date.now() - lastSyncAt.getTime()) / 3_600_000;
  return frequency === 'hourly' ? hours >= 1 : hours >= 24;
}

/**
 * Verifikasi shared secret cron. Sumber yang diterima:
 *  - header `x-cron-secret` (cron eksternal)
 *  - header `Authorization: Bearer <secret>` (otomatis dari Vercel Cron)
 *  - query `?secret=` (fallback, kurang aman)
 * Return null jika valid, atau NextResponse error siap-kirim.
 */
function checkCronAuth(request: Request, url: URL): NextResponse | null {
  const secret = process.env.SHEETS_SYNC_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'SHEETS_SYNC_CRON_SECRET belum dikonfigurasi' }, { status: 501 });
  }
  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const provided = request.headers.get('x-cron-secret') || bearer || url.searchParams.get('secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** Jalankan sync terjadwal untuk semua sekolah yang connected & sudah jatuh tempo. */
async function runScheduledSync(): Promise<NextResponse> {
  const configs = await db.googleSheetsConfig.findMany({
    where: { status: 'connected', scheduleFrequency: { not: 'none' } },
    select: { schoolId: true },
  });
  const schoolIds = Array.from(new Set(configs.map((c) => c.schoolId)));

  const results: Record<string, unknown> = {};
  let anyOk = false;
  let anyExecuted = false;

  for (const sid of schoolIds) {
    const config = await db.googleSheetsConfig.findFirst({
      where: { schoolId: sid },
      orderBy: { updatedAt: 'desc' },
    });
    if (!config || config.status !== 'connected' || !config.spreadsheetId) {
      results[sid] = { ok: false, error: 'Belum terhubung' };
      continue;
    }
    if (!isScheduleDue(config.scheduleFrequency, config.lastSyncAt)) {
      results[sid] = { ok: true, skipped: true, reason: 'Jadwal belum jatuh tempo' };
      continue;
    }

    anyExecuted = true;
    const perSheet: Record<string, unknown> = {};
    for (const s of ['SISWA', 'NILAI'] as const) {
      const res = await runSync(sid, s);
      perSheet[s] = res;
      if (res.ok) anyOk = true;
    }
    results[sid] = {
      ok: Object.values(perSheet).some((r) => (r as { ok: boolean }).ok),
      sheets: perSheet,
    };
  }

  return NextResponse.json({ success: anyOk, executed: anyExecuted, results });
}

// ===== GET /api/sheets/sync =====
// Dipanggil Vercel Cron (GET + Authorization: Bearer $CRON_SECRET).
export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const denied = checkCronAuth(request, url);
    if (denied) return denied;
    return await runScheduledSync();
  } catch (error) {
    if (error instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logError({ error, route: '/api/sheets/sync', method: 'GET' });
    return NextResponse.json({ error: 'Gagal menjalankan sinkronisasi terjadwal' }, { status: 500 });
  }
}

// ===== POST /api/sheets/sync =====
// Manual (sesi user) atau cron eksternal (?cron=1 + x-cron-secret).
export async function POST(request: Request) {
  const url = new URL(request.url);
  const isCron = url.searchParams.get('cron') === '1';

  try {
    // ── Autentikasi ──
    let auth: { schoolId: string | null; role: string } | null = null;
    if (isCron) {
      const denied = checkCronAuth(request, url);
      if (denied) return denied;
    } else {
      const user = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
      auth = user;
    }

    // ── Cron: semua sekolah yang jadwalnya jatuh tempo ──
    if (isCron) return await runScheduledSync();

    // ── Manual: tentukan target sekolah ──
    const body = (await request.json().catch(() => ({}))) as { schoolId?: string; type?: string };
    let schoolIds: string[] = [];

    if (body.schoolId) {
      if (!auth || auth.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Hanya SUPER_ADMIN yang bisa sync sekolah lain' }, { status: 403 });
      }
      schoolIds = [body.schoolId];
    } else if (auth?.schoolId) {
      schoolIds = [auth.schoolId];
    } else {
      return NextResponse.json({ error: 'Tidak ada sekolah untuk disinkronkan' }, { status: 400 });
    }

    const type = (body.type ?? 'all') as 'all' | 'SISWA' | 'NILAI';
    const sheets: Array<'SISWA' | 'NILAI'> = type === 'SISWA' || type === 'NILAI' ? [type] : ['SISWA', 'NILAI'];

    // ── Eksekusi ──
    const results: Record<string, unknown> = {};
    let anyOk = false;

    for (const sid of schoolIds) {
      const config = await db.googleSheetsConfig.findFirst({
        where: { schoolId: sid },
        orderBy: { updatedAt: 'desc' },
      });
      if (!config || config.status !== 'connected' || !config.spreadsheetId) {
        results[sid] = { ok: false, error: 'Belum terhubung' };
        continue;
      }

      const perSheet: Record<string, unknown> = {};
      for (const s of sheets) {
        const res = await runSync(sid, s);
        perSheet[s] = res;
        if (res.ok) anyOk = true;
      }
      results[sid] = {
        ok: Object.values(perSheet).some((r) => (r as { ok: boolean }).ok),
        sheets: perSheet,
      };
    }

    return NextResponse.json({ success: anyOk, results });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logError({ error, route: '/api/sheets/sync', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menjalankan sinkronisasi' }, { status: 500 });
  }
}
