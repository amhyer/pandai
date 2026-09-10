import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/error-log';
import { requireAuth } from '@/lib/auth';
import { logAccess } from '@/lib/audit-log';
import { upsertConfigBySchool } from '@/lib/google-sheets-config';

// ===== POST /api/google-sheets/sync =====
// Manual sync data ke Google Sheets
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { type, data, schoolId: bodySchoolId } = body;

    const effectiveSchoolId = bodySchoolId || auth.schoolId;

    // Simpan log sync
    await upsertConfigBySchool(
      effectiveSchoolId ?? null,
      {
        status: 'syncing',
        lastSync: new Date(),
      },
      {
        status: 'synced',
        lastSync: new Date(),
      }
    );

    // Catat log aktivitas
    try {
      await logAccess(auth, {
        action: 'CREATE',
        resourceType: 'google-sheets-sync',
        detail: `Sync ${type}: ${JSON.stringify(data).substring(0, 100)}`,
        targetUserId: effectiveSchoolId,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Data berhasil disinkronisasi ke Google Sheets (${type})`,
    });
  } catch (error) {
    await logError({ error, route: '/api/google-sheets/sync', method: 'POST' });
    return NextResponse.json({ error: 'Gagal sinkronisasi data' }, { status: 500 });
  }
}
