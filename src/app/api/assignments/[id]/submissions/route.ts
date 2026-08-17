import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';

// GET /api/assignments/[id]/submissions — guru sees all submissions for an assignment
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (studentId) {
      // Student-specific: get their submission with answers
      const sub = await db.assignmentSubmission.findUnique({
        where: { assignmentId_studentId: { assignmentId: id, studentId } },
        include: {
          answers: { include: { question: { include: { question: { select: { id: true, content: true, type: true, options: true } } } } } },
        },
      });
      if (!sub) return NextResponse.json(null);
      return NextResponse.json(sub);
    }

    // Guru view: all submissions with student info
    const subs = await db.assignmentSubmission.findMany({
      where: { assignmentId: id },
      include: {
        answers: { select: { questionId: true, isCorrect: true, pointsEarned: true } },
      },
      orderBy: { submittedAt: 'asc' },
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
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { studentId, schoolId, classId, action, answers } = body; // action: 'draft' | 'submit'

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

    // Check if student already submitted — prevent further changes
    const existingSub = await db.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId: id, studentId } },
    });
    if (existingSub && (existingSub.status === 'submitted' || existingSub.status === 'dinilai')) {
      return NextResponse.json({ error: 'Tugas sudah disubmit dan tidak bisa diubah lagi' }, { status: 403 });
    }

    // Upsert submission
    const submission = await db.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId: id, studentId } },
      create: {
        assignmentId: id,
        studentId,
        schoolId: schoolId || null,
        classId: classId || null,
        status: action === 'submit' ? 'submitted' : 'dikerjakan',
        submittedAt: action === 'submit' ? new Date() : null,
      },
      update: {
        status: action === 'submit' ? 'submitted' : 'dikerjakan',
        submittedAt: action === 'submit' ? new Date() : undefined,
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
          score: hasEssay ? null : totalPgScore, // null if has essay (needs manual grading)
          status: hasEssay ? 'submitted' : 'dinilai', // auto-graded if no essay
          gradedAt: hasEssay ? null : new Date(),
        },
      });
    }

    // Fetch updated submission with full question data for frontend
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
