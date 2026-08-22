import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter } from '@/lib/scope';

// POST /api/attempts/remedial — guru activates remedial for a student's attempt
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);

    const body = await req.json();
    const { attemptId } = body;
    if (!attemptId) return NextResponse.json({ error: 'attemptId wajib' }, { status: 400 });

    const original = await db.studentAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });

    if (!original) return NextResponse.json({ error: 'Attempt tidak ditemukan' }, { status: 404 });
    if (original.isRemedial) return NextResponse.json({ error: 'Tidak bisa mengaktifkan remedial untuk attempt yang sudah remedial' }, { status: 400 });

    // IDOR fix: verify the attempt belongs to the same school
    if (original.schoolId) {
      const schoolF = getSchoolFilter(auth);
      if (schoolF && original.schoolId !== schoolF) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    const existingRemedial = await db.studentAttempt.findFirst({ where: { remedialOfId: attemptId } });
    if (existingRemedial) {
      return NextResponse.json({
        error: 'Remedial sudah diaktifkan untuk attempt ini',
        remedialId: existingRemedial.id,
        status: existingRemedial.status,
      }, { status: 409 });
    }

    const remedial = await db.studentAttempt.create({
      data: {
        userId: original.userId, examSessionId: original.examSessionId,
        examPackageId: original.examPackageId, schoolId: original.schoolId,
        classId: original.classId, score: 0, totalCorrect: 0, totalWrong: 0,
        totalUnanswered: 0, percentage: 0, duration: 0, status: 'in_progress',
        learningObjective: original.learningObjective, isRemedial: true, remedialOfId: attemptId,
      },
    });

    return NextResponse.json(remedial, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/attempts/remedial', method: 'POST' });
    return NextResponse.json({ error: 'Gagal mengaktifkan remedial' }, { status: 500 });
  }
}
