import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH', 'SISWA']);
    const { sessionId } = await params;

    // Fetch session with package
    const session = await db.examSession.findUnique({
      where: { id: sessionId },
      include: { examPackage: true },
    });
    if (!session) {
      return NextResponse.json({ error: 'Sesi ujian tidak ditemukan' }, { status: 404 });
    }

    // SISWA: verify the session is assigned to their class
    if (auth.role === 'SISWA') {
      const assignment = await db.examAssignment.findFirst({
        where: { examSessionId: sessionId, schoolId: auth.schoolId },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
      // Also check student's classId matches
      const student = await db.user.findUnique({
        where: { id: auth.userId },
        select: { classId: true },
      });
      if (!student || student.classId !== assignment.classId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    // Fetch exam items with questions, ordered
    const examItems = await db.examItem.findMany({
      where: { examPackageId: session.examPackageId },
      include: {
        question: {
          include: { subject: { select: { id: true, name: true } } },
        },
      },
      orderBy: { orderNum: 'asc' },
    });

    // Check if student already has a submitted attempt
    let existingAttempt = null;
    if (auth.role === 'SISWA') {
      existingAttempt = await db.studentAttempt.findFirst({
        where: {
          userId: auth.userId,
          examSessionId: sessionId,
          status: 'submitted',
        },
      });
    }

    // For SISWA: strip answer, explanation, and isCorrect from options
    function sanitizeQuestion(q: any, item: any, idx: number) {
      const base = {
        id: q.id,
        subjectId: q.subjectId,
        type: q.type,
        content: q.content,
        options: q.options,
        cognitiveLevel: q.cognitiveLevel,
        difficulty: q.difficulty,
        status: q.status,
        source: q.source,
        subject: q.subject,
        examItemId: item.id,
        orderNum: item.orderNum || idx + 1,
        points: item.points,
      };
      return base;
    }

    const questions = examItems.map((item, idx) => {
      const q = item.question;
      if (auth.role === 'SISWA') {
        // Strip isCorrect from options JSON
        let sanitizedOptions = q.options;
        if (sanitizedOptions) {
          try {
            const parsed = JSON.parse(sanitizedOptions);
            const cleaned = parsed.map((o: any) => {
              const { isCorrect, ...rest } = o;
              return rest;
            });
            sanitizedOptions = JSON.stringify(cleaned);
          } catch {}
        }
        return {
          ...sanitizeQuestion(q, item, idx),
          options: sanitizedOptions,
        };
      }
      return sanitizeQuestion(q, item, idx);
    });

    return NextResponse.json({
      session,
      questions,
      hasAttempt: !!existingAttempt,
      attemptId: existingAttempt?.id || null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/exam-session/[sessionId]', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil data soal' }, { status: 500 });
  }
}
