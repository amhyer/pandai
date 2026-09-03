import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

// GET /api/dapodik/status?schoolId=xxx — Cek status sinkronisasi DAPODIK
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH']);
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId') || auth.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 });
    }

    if (auth.role !== 'SUPER_ADMIN') {
      requireSchoolScope(auth, schoolId);
    }

    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { id: true, npsn: true, updatedAt: true },
    });

    if (!school) {
      return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 });
    }

    const [totalStudents, totalTeachers, totalClasses] = await Promise.all([
      db.user.count({ where: { schoolId, role: 'SISWA' } }),
      db.user.count({ where: { schoolId, role: 'GURU' } }),
      db.class.count({ where: { schoolId } }),
    ]);

    const lastSync = school.npsn ? school.updatedAt.toISOString() : null;

    return NextResponse.json({
      lastSync,
      totalStudents,
      totalTeachers,
      totalClasses,
      hasNpsn: !!school.npsn,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/dapodik/status error:', error);
    const msg = error instanceof Error ? error.message : 'Gagal mengambil status DAPODIK';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
