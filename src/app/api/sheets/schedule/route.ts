import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';
import type { SheetsSyncFrequency } from '@/lib/google-sheets/types';

// ===== GET /api/sheets/schedule =====
// Ambil frekuensi jadwal sync sekolah.
export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const { searchParams } = new URL(request.url);
    const schoolId =
      auth.role === 'SUPER_ADMIN' ? searchParams.get('schoolId') || auth.schoolId : auth.schoolId;
    if (!schoolId) return NextResponse.json({ frequency: 'none' });

    const config = await db.googleSheetsConfig.findFirst({
      where: { schoolId },
      select: { scheduleFrequency: true, lastSyncAt: true },
    });

    return NextResponse.json({
      frequency: config?.scheduleFrequency ?? 'none',
      lastSyncAt: config?.lastSyncAt ?? null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/sheets/schedule', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil jadwal sync' }, { status: 500 });
  }
}

// ===== POST /api/sheets/schedule =====
// Ubah frekuensi jadwal: { frequency: 'none' | 'hourly' | 'daily' }
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { schoolId: bodySchoolId, frequency } = (await request.json().catch(() => ({}))) as {
      schoolId?: string;
      frequency?: string;
    };
    const schoolId = auth.role === 'SUPER_ADMIN' ? bodySchoolId || auth.schoolId : auth.schoolId;
    if (!schoolId) return NextResponse.json({ error: 'Tidak ada sekolah' }, { status: 400 });
    if (frequency !== 'none' && frequency !== 'hourly' && frequency !== 'daily') {
      return NextResponse.json(
        { error: 'Frekuensi harus "none", "hourly", atau "daily"' },
        { status: 400 }
      );
    }

    const config = await db.googleSheetsConfig.findFirst({ where: { schoolId } });
    if (!config) {
      return NextResponse.json({ error: 'Konfigurasi Google Sheets belum ada' }, { status: 404 });
    }

    await db.googleSheetsConfig.update({
      where: { id: config.id },
      data: { scheduleFrequency: frequency as SheetsSyncFrequency },
    });

    return NextResponse.json({ success: true, frequency });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/sheets/schedule', method: 'POST' });
    return NextResponse.json({ error: 'Gagal mengubah jadwal sync' }, { status: 500 });
  }
}
