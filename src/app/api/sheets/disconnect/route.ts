import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';

// ===== POST /api/sheets/disconnect =====
// Putuskan koneksi: hapus token & kembalikan status ke disconnected.
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const schoolId = auth.role === 'SUPER_ADMIN' ? null : auth.schoolId;

    const body = (await request.json().catch(() => ({}))) as { schoolId?: string };
    const targetSchoolId = auth.role === 'SUPER_ADMIN' ? body.schoolId || schoolId : schoolId;
    if (!targetSchoolId) return NextResponse.json({ error: 'Tidak ada sekolah' }, { status: 400 });

    const config = await db.googleSheetsConfig.findFirst({ where: { schoolId: targetSchoolId } });
    if (!config) {
      return NextResponse.json({ success: true, message: 'Tidak ada koneksi untuk diputus' });
    }

    await db.googleSheetsConfig.update({
      where: { id: config.id },
      data: {
        status: 'disconnected',
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        accessTokenExpiresAt: null,
        scheduleFrequency: 'none',
        lastError: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Koneksi Google Sheets diputus' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/sheets/disconnect', method: 'POST' });
    return NextResponse.json({ error: 'Gagal memutus koneksi Google Sheets' }, { status: 500 });
  }
}
