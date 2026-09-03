import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';
import { getKepalaSekolahDashboardData } from '@/lib/server-dashboard';

/**
 * GET /api/kepsek/dashboard?schoolId=...
 * Role: KEPALA_SEKOLAH | ADMIN_SCHOOL | SUPER_ADMIN
 *
 * Data shaping now lives in src/lib/server-dashboard.ts so the Server
 * Component route (/kepala-sekolah/dashboard) and this legacy endpoint
 * share one school-scoped query path.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['KEPALA_SEKOLAH', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId') || auth.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 });
    }

    // IDOR fix: non-super cannot query another school
    requireSchoolScope(auth, schoolId);

    const school = await db.school.findUnique({ where: { id: schoolId }, select: { id: true } });
    if (!school) {
      return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 });
    }

    const data = await getKepalaSekolahDashboardData(schoolId);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/kepsek/dashboard', method: 'GET' });
    return NextResponse.json({ error: 'Gagal memuat data dashboard' }, { status: 500 });
  }
}
