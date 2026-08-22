import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';

// GET attempts
export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH', 'SISWA']);

    // RBAC: Kepala Sekolah cannot access individual attempt data
    if (auth.role === 'KEPALA_SEKOLAH') {
      return NextResponse.json(
        { error: 'Kepala Sekolah hanya dapat mengakses data agregat. Akses data individu tidak diizinkan.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const examSessionId = searchParams.get('examSessionId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (schoolId) where.schoolId = schoolId;
    if (classId) where.classId = classId;
    if (examSessionId) where.examSessionId = examSessionId;

    const attempts = await db.studentAttempt.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        answers: true,
        remedialAttempts: { select: { id: true, status: true, score: true, submittedAt: true, isRemedial: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip,
    });

    // Enrich: for each original attempt, add remedial status
    const enriched = await Promise.all(attempts.map(async (att) => {
      const extra: Record<string, unknown> = {};
      if (!att.isRemedial && att.remedialAttempts.length > 0) {
        const remedial = att.remedialAttempts[0];
        extra.hasRemedial = true;
        extra.remedialId = remedial.id;
        extra.remedialStatus = remedial.status;
        extra.remedialScore = remedial.score;
        if (remedial.status === 'submitted' || remedial.status === 'graded') {
          extra.activeScore = remedial.score;
          extra.originalScore = att.score;
        } else {
          extra.activeScore = att.score;
          extra.originalScore = att.score;
        }
      } else {
        extra.hasRemedial = false;
        extra.activeScore = att.score;
      }
      return { ...att, ...extra };
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/attempts', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

// POST submit attempt
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH', 'SISWA']);
    const data = await request.json();
    const { examSessionId, examPackageId, schoolId, classId, answers, duration, learningObjective } = data;

    // IDOR fix: force userId from authenticated session, never trust client
    const userId = auth.userId;
    if (auth.role === 'SISWA' && data.userId && data.userId !== auth.userId) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
    }

    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnanswered = 0;
    let totalPoints = 0;
    const answerRecords: any[] = [];

    // N+1 fix: batch fetch all questions in one query
    const questionIds = answers.map((a: any) => a.questionId).filter(Boolean);
    const questionsMap = new Map<string, any>();
    if (questionIds.length > 0) {
      const questions = await db.question.findMany({
        where: { id: { in: questionIds } },
      });
      for (const q of questions) questionsMap.set(q.id, q);
    }

    for (const a of answers) {
      if (!a.answer || a.answer === '') {
        totalUnanswered++;
        answerRecords.push({
          questionId: a.questionId, answer: null, isCorrect: false, pointsEarned: 0, timeSpent: a.timeSpent || 0,
        });
      } else {
        const question = questionsMap.get(a.questionId);
        let isCorrect = false;
        let points = 0;

        if (question) {
          if (question.type === 'pg' || question.type === 'pg_kompleks') {
            isCorrect = a.answer === question.answer;
            points = isCorrect ? 1 : 0;
          } else if (question.type === 'isian') {
            isCorrect = a.answer.toLowerCase().trim() === question.answer?.toLowerCase().trim();
            points = isCorrect ? 1 : 0;
          } else {
            points = 0;
            isCorrect = false;
          }
        }

        if (isCorrect) totalCorrect++;
        else totalWrong++;
        totalPoints += points;

        answerRecords.push({
          questionId: a.questionId, answer: a.answer, isCorrect, pointsEarned: points, timeSpent: a.timeSpent || 0,
        });
      }
    }

    const totalQuestions = answers.length;
    const percentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    const tkaPrediction = Math.round(percentage * 8 + 200);

    const attempt = await db.$transaction(async (tx) => {
      // Check for existing in-progress attempt for this exam session to prevent duplicates
      const existingAttempt = await tx.studentAttempt.findFirst({
        where: { userId, examSessionId, status: 'in_progress' },
      });
      if (existingAttempt) {
        throw new Error('ATTEMPT_EXISTS');
      }
      return tx.studentAttempt.create({
        data: {
          userId, examSessionId, examPackageId, schoolId, classId,
          score: totalPoints, totalCorrect, totalWrong, totalUnanswered,
          percentage: Math.round(percentage * 100) / 100, tkaPrediction,
          duration: duration || 0, status: 'submitted',
          learningObjective: learningObjective || null, submittedAt: new Date(),
          answers: { create: answerRecords },
        },
      });
    });

    return NextResponse.json(attempt);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === 'ATTEMPT_EXISTS') {
      return NextResponse.json({ error: 'Attempt sudah ada' }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2025')) {
      return NextResponse.json({ error: 'Attempt sudah ada' }, { status: 409 });
    }
    logError({ error, route: '/api/attempts', method: 'POST' });
    console.error('Submit attempt error:', error);
    return NextResponse.json({ error: 'Gagal submit jawaban' }, { status: 500 });
  }
}

// PATCH update attempt (e.g., update learningObjective)
export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);

    const body = await request.json();
    const { id, learningObjective } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const updateData: Record<string, unknown> = {};
    if (learningObjective !== undefined) {
      updateData.learningObjective = learningObjective || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 });
    }

    const attempt = await db.studentAttempt.update({ where: { id }, data: updateData });
    return NextResponse.json(attempt);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/attempts', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal mengupdate data attempt' }, { status: 500 });
  }
}
