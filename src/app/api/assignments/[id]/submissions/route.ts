import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { requireStudentScope } from '@/lib/scope';
import { logAccess } from '@/lib/audit-log';

// GET /api/assignments/[id]/submissions — guru sees all submissions, student sees their own
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH', 'SISWA']);
    const { id } = await params;
    try { await logAccess(auth, { action: 'READ', resourceType: 'submissions' }); } catch {}
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    // IDOR fix: SISWA can only see their own submissions
    if (auth.role === 'SISWA') {
      if (studentId && studentId !== auth.userId) {
        return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
      }
      // When no studentId, only show own submission
      const sub = await db.assignmentSubmission.findFirst({
        where: { assignmentId: id, studentId: auth.userId, isRemedial: false },
        include: {
          answers: { include: { question: { include: { question: { select: { id: true, content: true, type: true, options: true } } } } } },
          remedialSubmissions: { select: { id: true, status: true, score: true, submittedAt: true, isRemedial: true } },
        },
      });
      if (!sub) return NextResponse.json(null);

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

    if (studentId) {
      await requireStudentScope(auth, studentId);
      const sub = await db.assignmentSubmission.findFirst({
        where: { assignmentId: id, studentId, isRemedial: false },
        include: {
          answers: { include: { question: { include: { question: { select: { id: true, content: true, type: true, options: true } } } } } },
          remedialSubmissions: { select: { id: true, status: true, score: true, submittedAt: true, isRemedial: true } },
        },
      });

      if (!sub) return NextResponse.json(null);

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

    const subs = await db.assignmentSubmission.findMany({
      where: { assignmentId: id },
      include: {
        answers: { select: { questionId: true, isCorrect: true, pointsEarned: true } },
        originalSubmission: { select: { id: true, score: true } },
      },
      orderBy: { startedAt: 'asc' },
    });

    const enriched = await Promise.all(subs.map(async (sub) => {
      const student = sub.studentId ? await db.user.findUnique({ where: { id: sub.studentId }, select: { id: true, name: true, nisn: true } }) : null;
      return { ...sub, student };
    }));
    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/assignments/[id]/submissions', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil submission' }, { status: 500 });
  }
}

// POST /api/assignments/[id]/submissions — student submit
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ['SISWA']);
    const { id } = await params;
    try { await logAccess(auth, { action: 'CREATE', resourceType: 'submissions' }); } catch {}
    const body = await req.json();
    let { studentId, schoolId, classId, action, answers, remedialSubmissionId } = body;

    // IDOR fix: SISWA can only submit for themselves — ignore body studentId
    if (auth.role === 'SISWA') {
      if (studentId && studentId !== auth.userId) {
        return NextResponse.json({ error: 'Tidak diizinkan submit atas nama siswa lain' }, { status: 403 });
      }
      studentId = auth.userId;
    }

    if (!studentId) return NextResponse.json({ error: 'studentId wajib' }, { status: 400 });
    if (!action || !['draft', 'submit'].includes(action)) return NextResponse.json({ error: 'action harus draft atau submit' }, { status: 400 });

    const assignment = await db.assignment.findUnique({
      where: { id },
      select: { id: true, status: true, deadline: true, schoolId: true, questions: { include: { question: { select: { id: true, type: true, options: true, answer: true } } } } },
    });
    if (!assignment) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });
    if (assignment.status === 'draft') return NextResponse.json({ error: 'Tugas belum dipublish' }, { status: 403 });
    if (assignment.status === 'closed') return NextResponse.json({ error: 'Tugas sudah ditutup' }, { status: 403 });

    // P0-02: School scope check — ensure student can only submit to their own school's assignment
    if (auth.role === 'SISWA' && assignment.schoolId && auth.schoolId && assignment.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // P0-02: Server-side deadline enforcement
    if (assignment.deadline) {
      const deadlineDate = new Date(assignment.deadline);
      if (!isNaN(deadlineDate.getTime()) && new Date() > deadlineDate) {
        return NextResponse.json(
          { error: 'Batas waktu pengumpulan tugas sudah berakhir' },
          { status: 422 }
        );
      }
    }

    let submission: { id: string; status: string; isRemedial: boolean };

    if (remedialSubmissionId) {
      submission = await db.assignmentSubmission.findUnique({ where: { id: remedialSubmissionId } }) as typeof submission;
      if (!submission) return NextResponse.json({ error: 'Submission remedial tidak ditemukan' }, { status: 404 });
      if (!submission.isRemedial) return NextResponse.json({ error: 'Bukan submission remedial' }, { status: 400 });
    } else {
      submission = await db.$transaction(async (tx) => {
        const existingSub = await tx.assignmentSubmission.findFirst({
          where: { assignmentId: id, studentId, isRemedial: false },
        });
        if (existingSub && (existingSub.status === 'submitted' || existingSub.status === 'dinilai')) {
          throw new Error('ALREADY_SUBMITTED');
        }
        if (existingSub) {
          return existingSub;
        }
        return tx.assignmentSubmission.create({
          data: {
            assignmentId: id, studentId, schoolId: schoolId || null, classId: classId || null,
            status: action === 'submit' ? 'submitted' : 'dikerjakan',
            submittedAt: action === 'submit' ? new Date() : null,
          },
        });
      });
    }

    await db.assignmentSubmission.update({
      where: { id: submission.id },
      data: { status: action === 'submit' ? 'submitted' : 'dikerjakan', ...(action === 'submit' && { submittedAt: new Date() }) },
    });

    if (Array.isArray(answers) && answers.length > 0) {
      for (const ans of answers) {
        const { questionId, answer, essayAnswer } = ans;
        const aq = assignment.questions.find((q) => q.questionId === questionId);
        if (!aq) continue;
        const assignmentQuestionId = aq.id;
        let isCorrect: boolean | null = null;
        let pointsEarned = 0;
        if (aq.question.type === 'pg' && answer) {
          const correctAnswer = aq.question.answer;
          isCorrect = answer === correctAnswer;
          pointsEarned = isCorrect ? aq.points : 0;
        }
        await db.assignmentAnswer.upsert({
          where: { submissionId_questionId: { submissionId: submission.id, questionId: assignmentQuestionId } },
          create: { submissionId: submission.id, questionId: assignmentQuestionId, answer: answer || null, essayAnswer: essayAnswer || null, isCorrect, pointsEarned },
          update: { ...(answer !== undefined && { answer }), ...(essayAnswer !== undefined && { essayAnswer }), ...(isCorrect !== null && { isCorrect }), ...(action === 'submit' && aq.question.type === 'pg' && { isCorrect, pointsEarned }) },
        });
      }
    }

    if (action === 'submit') {
      const allAnswers = await db.assignmentAnswer.findMany({ where: { submissionId: submission.id } });
      const totalPgScore = allAnswers.reduce((sum, a) => sum + (a.pointsEarned || 0), 0);
      const totalEssayPoints = assignment.questions.filter((q) => q.question.type !== 'pg').reduce((sum, q) => sum + q.points, 0);
      const hasEssay = totalEssayPoints > 0;
      await db.assignmentSubmission.update({
        where: { id: submission.id },
        data: { score: hasEssay ? null : totalPgScore, status: hasEssay ? 'submitted' : 'dinilai', gradedAt: hasEssay ? null : new Date() },
      });
    }

    const updated = await db.assignmentSubmission.findUnique({
      where: { id: submission.id },
      include: { answers: { include: { question: { include: { question: { select: { id: true, content: true, type: true, options: true } } } } } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === 'ALREADY_SUBMITTED') {
      return NextResponse.json({ error: 'Tugas sudah disubmit dan tidak bisa diubah lagi' }, { status: 403 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Submission sudah ada' }, { status: 409 });
    }
    await logError({ error, route: '/api/assignments/[id]/submissions', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menyimpan jawaban' }, { status: 500 });
  }
}
