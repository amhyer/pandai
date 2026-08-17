import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';

// PATCH /api/assignments/[id]/submissions/[studentId]/grade — guru input skor esai + feedback
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; studentId: string }> }) {
  try {
    const { id, studentId } = await params;
    const body = await req.json();
    const { score, feedback, essayScores, isRemedial } = body; // essayScores: [{questionId, pointsEarned}]

    const submission = await db.assignmentSubmission.findFirst({
      where: { assignmentId: id, studentId, ...(isRemedial ? { isRemedial: true } : { isRemedial: false }) },
    });

    if (!submission) return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 });
    if (submission.status !== 'submitted') return NextResponse.json({ error: 'Hanya bisa menilai submission yang sudah dikumpulkan' }, { status: 400 });

    // Update essay scores if provided
    if (Array.isArray(essayScores)) {
      for (const es of essayScores) {
        await db.assignmentAnswer.updateMany({
          where: { submissionId: submission.id, questionId: es.questionId },
          data: { pointsEarned: es.pointsEarned || 0 },
        });
      }
    }

    // Recalculate total score
    const allAnswers = await db.assignmentAnswer.findMany({ where: { submissionId: submission.id } });
    const totalScore = allAnswers.reduce((sum, a) => sum + (a.pointsEarned || 0), 0);

    await db.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        score: score !== undefined ? score : totalScore,
        feedback: feedback || null,
        status: 'dinilai',
        gradedAt: new Date(),
      },
    });

    const updated = await db.assignmentSubmission.findUnique({
      where: { id: submission.id },
      include: { answers: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    await logError({ error, route: '/api/assignments/[id]/submissions/[studentId]/grade', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal menilai' }, { status: 500 });
  }
}
