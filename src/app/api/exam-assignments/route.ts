import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';

// GET /api/exam-assignments — list exam assignments for a school
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']);
    const { searchParams } = new URL(req.url);
    const querySchoolId = searchParams.get('schoolId');

    // P1-10: Enforce school scope
    const schoolF = getSchoolFilter(auth);
    const effectiveSchoolId = schoolF || (querySchoolId && auth.role === 'SUPER_ADMIN' ? querySchoolId : null);

    const where: Record<string, unknown> = {};
    if (effectiveSchoolId) where.schoolId = effectiveSchoolId;

    const assignments = await db.examAssignment.findMany({
      where,
      include: {
        examSession: { include: { examPackage: { select: { id: true, title: true, status: true } } } },
        class: { select: { id: true, name: true, grade: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(assignments);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/exam-assignments error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}
