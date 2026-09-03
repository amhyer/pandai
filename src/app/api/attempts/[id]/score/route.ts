import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter } from '@/lib/scope';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/attempts/[id]/score — GURU/ADMIN scores essay answers manually
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const { id } = await params;
    const body = await request.json();
    const { scores } = body; // Array of { answerId, pointsEarned, isCorrect, note }

    if (!scores || !Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json({ error: 'Scores array wajib diisi' }, { status: 400 });
    }

    // Verify attempt exists and belongs to same school
    const attempt = await db.studentAttempt.findUnique({
      where: { id },
      select: { id: true, schoolId: true, status: true, examPackageId: true },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt tidak ditemukan' }, { status: 404 });
    }

    // School scope check
    const schoolF = getSchoolFilter(auth);
    if (schoolF && attempt.schoolId !== schoolF) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
    }

    // Get max points per question from exam package
    const examItems = await db.examItem.findMany({
      where: { examPackageId: attempt.examPackageId },
      select: { questionId: true, points: true },
    });
    const maxPointsMap = new Map(examItems.map(item => [item.questionId, item.points || 1]));

    // Update each answer
    let totalPoints = 0;
    const updatedAnswers = [];

    for (const score of scores) {
      const { answerId, pointsEarned, isCorrect, note } = score;

      if (!answerId) continue;

      // Verify answer belongs to this attempt
      const answer = await db.studentAnswer.findUnique({
        where: { id: answerId },
        select: { id: true, attemptId: true, questionId: true },
      });

      if (!answer || answer.attemptId !== id) continue;

      const maxPoints = maxPointsMap.get(answer.questionId) || 1;
      const clampedPoints = Math.min(Math.max(0, pointsEarned || 0), maxPoints);
      const correct = clampedPoints > 0;

      const updated = await db.studentAnswer.update({
        where: { id: answerId },
        data: {
          pointsEarned: clampedPoints,
          isCorrect: correct,
          manualScore: true,
          graderNote: note || null,
        },
      });

      totalPoints += clampedPoints;
      updatedAnswers.push(updated);
    }

    // Recalculate attempt totals
    const allAnswers = await db.studentAnswer.findMany({
      where: { attemptId: id },
    });

    const totalCorrect = allAnswers.filter(a => a.isCorrect).length;
    const totalWrong = allAnswers.filter(a => !a.isCorrect && a.answer !== null).length;
    const totalUnanswered = allAnswers.filter(a => a.answer === null).length;
    const totalQuestions = allAnswers.length;
    const percentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    // Update attempt
    const updatedAttempt = await db.studentAttempt.update({
      where: { id },
      data: {
        score: totalPoints,
        totalCorrect,
        totalWrong,
        totalUnanswered,
        percentage: Math.round(percentage * 100) / 100,
        status: 'graded',
      },
    });

    return NextResponse.json({
      attempt: updatedAttempt,
      scoredAnswers: updatedAnswers.length,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Score attempt error:', error);
    return NextResponse.json({ error: 'Gagal scoring attempt' }, { status: 500 });
  }
}
