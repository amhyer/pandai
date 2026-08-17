import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';

// GET /api/assignments/[id]/submissions — guru sees all submissions, student sees their own
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (studentId) {
      // Student-specific: get their non-remedial submission with answers
      const sub = await db.assignmentSubmission.findFirst({
        where: { assignmentId: id, studentId, isRemedial: false },
        include: {
          answers: { include: { question: { include: { question: { select: { id: true, content: true, type: true, options: true } } } } } },
          remedialSubmissions: { select: { id: true, status: true, score: true, submittedAt: true, isRemedial: true } },
        },
      });

      if (!sub) return NextResponse.json(null);

      // Enrich with remedial info
      const extra: Record<string, unknown> = {};
      if (sub.remedialSubmissions.length > 0) {
        const remedial = sub.remedialSubmissions[0];
        extra.hasRemedial = true;
        extra.remedialId = remedial.id;
        extra.remedialStatus = remedial.status;
        extra.remedialScore = remedial.score;
        if (remedial.status === 'submitted' || remedial.status === 'dinilai') {
          extra.activeScore = remedial.score;
          extra.originalScore = sub.score;
        } else {
          extra.activeScore = sub.score;
          extra.originalScore = sub.score;
        }
      } else {
        extra.hasRemedial = false;
        extra.activeScore = sub.score;
      }
      return NextResponse.json({ ...sub, ...extra });
    }

    // Guru view: all submissions (original + remedial) with student info
    const subs = await db.assignmentSubmission.findMany({
      where: { assignmentId: id },
      include: {
        answers: { select: { questionId: true, isCorrect: true, pointsEarned: true } },
        originalSubmission: { select: { id: true, score: true } },
      },
      orderBy: { startedAt: 'asc' },
    });

    // Enrich with student names
    const enriched = await Promise.all(subs.map(async (sub) => {
      const student = sub.studentId ? await db.user.findUnique({ where: { id: sub.studentId }, select: { id: true, name: true, nisn: true } }) : null;
      return { ...sub, student };
    }));
    return NextResponse.json(enriched);
  } catch (error) {
    await logError({ error, route: '/api/assignments/[id]/submissions', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil submission' }, { status: 500 });
  }
}

// POST /api/assignments/[id]/submissions — student submit (autosave draft or final submit)
// Supports both normal and remedial submissions via `remedialSubmissionId` param
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { studentId, schoolId, classId, action, answers, remedialSubmissionId } = body;

    if (!studentId) return NextResponse.json({ error: 'studentId wajib' }, { status: 400 });
    if (!action || !['draft', 'submit'].includes(action)) return NextResponse.json({ error: 'action harus draft atau submit' }, { status: 400 });

    // Check assignment exists and is published
    const assignment = await db.assignment.findUnique({
      where: { id },
      include: { questions: { include: { question: { select: { id: true, type: true, options: true, answer: true } } } } },
    });
    if (!assignment) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });
    if (assignment.status === 'draft') return NextResponse.json({ error: 'Tugas belum dipublish' }, { status: 403 });
    if (assignment.status === 'closed') return NextResponse.json({ error: 'Tugas sudah ditutup' }, { status: 403 });

    // Determine which submission to update
    let submission: { id: string; status: string; isRemedial: boolean };

    if (remedialSubmissionId) {
      // Working on remedial submission
      submission = await db.assignmentSubmission.findUnique({ where: { id: remedialSubmissionId } }) as typeof submission;
      if (!submission) return NextResponse.json({ error: 'Submission remedial tidak ditemukan' }, { status: 404 });
      if (!submission.isRemedial) return NextResponse.json({ error: 'Bukan submission remedial' }, { status: 400 });
    } else {
      // Working on normal (non-remedial) submission
      // Find existing non-remedial submission
      const existingSub = await db.assignmentSubmission.findFirst({
        where: { assignmentId: id, studentId, isRemedial: false },
      });
      if (existingSub && (existingSub.status === 'submitted' || existingSub.status === 'dinilai')) {
        return NextResponse.json({ error: 'Tugas sudah disubmit dan tidak bisa diubah lagi' }, { status: 403 });
      }

      // Upsert normal submission
      if (existingSub) {
        submission = existingSub;
      } else {
        const created = await db.assignmentSubmission.create({
          data: {
            assignmentId: id,
            studentId,
            schoolId: schoolId || null,
            classId: classId || null,
            status: action === 'submit' ? 'submitted' : 'dikerjakan',
            submittedAt: action === 'submit' ? new Date() : null,
          },
        });
        submission = created;
      }
    }

    // Update status
    await db.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        status: action === 'submit' ? 'submitted' : 'dikerjakan',
        ...(action === 'submit' && { submittedAt: new Date() }),
      },
    });

    // Save/update answers
    if (Array.isArray(answers) && answers.length > 0) {
      for (const ans of answers) {
        const { questionId, answer, essayAnswer } = ans;

        // Validate question belongs to this assignment
        const aq = assignment.questions.find((q) => q.questionId === questionId);
        if (!aq) continue;

        // Use AssignmentQuestion.id (NOT Question.id) as the FK for AssignmentAnswer
        const assignmentQuestionId = aq.id;

        // Auto-score PG
        let isCorrect: boolean | null = null;
        let pointsEarned = 0;

        if (aq.question.type === 'pg' && answer) {
          const correctAnswer = aq.question.answer;
          isCorrect = answer === correctAnswer;
          pointsEarned = isCorrect ? aq.points : 0;
        }

        await db.assignmentAnswer.upsert({
          where: { submissionId_questionId: { submissionId: submission.id, questionId: assignmentQuestionId } },
          create: {
            submissionId: submission.id,
            questionId: assignmentQuestionId,
            answer: answer || null,
            essayAnswer: essayAnswer || null,
            isCorrect,
            pointsEarned,
          },
          update: {
            ...(answer !== undefined && { answer }),
            ...(essayAnswer !== undefined && { essayAnswer }),
            ...(isCorrect !== null && { isCorrect }),
            ...(action === 'submit' && aq.question.type === 'pg' && { isCorrect, pointsEarned }),
          },
        });
      }
    }

    // If final submit, calculate total score (PG auto-scored + essay pending)
    if (action === 'submit') {
      const allAnswers = await db.assignmentAnswer.findMany({ where: { submissionId: submission.id } });
      const totalPgScore = allAnswers.reduce((sum, a) => sum + (a.pointsEarned || 0), 0);
      const totalEssayPoints = assignment.questions.filter((q) => q.question.type !== 'pg').reduce((sum, q) => sum + q.points, 0);
      const hasEssay = totalEssayPoints > 0;

      await db.assignmentSubmission.update({
        where: { id: submission.id },
        data: {
          score: hasEssay ? null : totalPgScore,
          status: hasEssay ? 'submitted' : 'dinilai',
          gradedAt: hasEssay ? null : new Date(),
        },
      });
    }

    // Fetch updated submission with full question data
    const updated = await db.assignmentSubmission.findUnique({
      where: { id: submission.id },
      include: {
        answers: { include: { question: { include: { question: { select: { id: true, content: true, type: true, options: true } } } } } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    await logError({ error, route: '/api/assignments/[id]/submissions', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menyimpan jawaban' }, { status: 500 });
  }
}
