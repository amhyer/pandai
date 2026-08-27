import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dapodik/status?schoolId=xxx — Cek status sinkronisasi DAPODIK
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 });
    }

    // Verify school exists
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { id: true, npsn: true, updatedAt: true },
    });

    if (!school) {
      return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 });
    }

    // Count totals
    const [totalStudents, totalTeachers, totalClasses] = await Promise.all([
      db.user.count({ where: { schoolId, role: 'SISWA' } }),
      db.user.count({ where: { schoolId, role: 'GURU' } }),
      db.class.count({ where: { schoolId } }),
    ]);

    // Determine if school has Dapodik-synced data
    // A school is considered Dapodik-synced if it has NPSN set
    const lastSync = school.npsn ? school.updatedAt.toISOString() : null;

    return NextResponse.json({
      lastSync,
      totalStudents,
      totalTeachers,
      totalClasses,
      hasNpsn: !!school.npsn,
    });
  } catch (error: unknown) {
    console.error('GET /api/dapodik/status error:', error);
    const msg = error instanceof Error ? error.message : 'Gagal mengambil status DAPODIK';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
