import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/exam-sessions — list exam sessions for a school
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get('schoolId') || user.schoolId;
  const status = searchParams.get('status') || undefined;

  if (!schoolId) {
    return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 });
  }

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
}
