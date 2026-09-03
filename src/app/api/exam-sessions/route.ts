import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

// GET /api/exam-sessions — list exam sessions for a school
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId') || user.schoolId;
    const status = searchParams.get('status') || undefined;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 });
    }

    // Tenancy enforcement: non-super-admin cannot query another school.
    requireSchoolScope(user, schoolId);

    const where: Record<string, unknown> = { schoolId };
    if (status) where.status = status;

    const sessions = await db.examSession.findMany({
      where,
      include: {
        examPackage: { select: { id: true, title: true } },
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { startDate: 'desc' },
      take: 200,
    });

    // Transform to UI-friendly format
    const formatted = sessions.map((s) => ({
      id: s.id,
      examName: s.examPackage?.title ?? 'Tanpa Judul',
      examPackageId: s.examPackageId,
      className: s.classId ?? 'Semua Kelas',
      startDate: s.startDate.toISOString().replace('T', ' ').slice(0, 16),
      duration: s.duration,
      status: s.status,
      title: s.title,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/exam-sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
