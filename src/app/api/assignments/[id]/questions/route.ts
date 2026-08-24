import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

// POST /api/assignments/[id]/questions — add questions to assignment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const { id } = await params;
    const body = await req.json();
    const { questionIds, replaceAll } = body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: 'questionIds wajib berupa array' }, { status: 400 });
    }

    const subCount = await db.assignmentSubmission.count({ where: { assignmentId: id } });
    if (subCount > 0) {
      return NextResponse.json({ error: 'Tidak bisa mengubah soal — sudah ada siswa yang mengerjakan' }, { status: 403 });
    }

    // P1-03: Verify assignment belongs to auth school
    const assignment = await db.assignment.findUnique({ where: { id }, select: { maxScore: true, schoolId: true } });
    if (!assignment) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });
    if (assignment.schoolId) { try { requireSchoolScope(auth, assignment.schoolId); } catch { throw new AuthError('Akses ditolak', 403); } }

    if (replaceAll) {
      await db.assignmentQuestion.deleteMany({ where: { assignmentId: id } });
    }

    const totalPoints = assignment.maxScore || 100;
    const pointsPerQ = Math.floor(totalPoints / questionIds.length);

    await db.assignmentQuestion.createMany({
      data: questionIds.map((qId: string, idx: number) => ({ assignmentId: id, questionId: qId, orderNum: idx, points: pointsPerQ })),
    });

    const questions = await db.assignmentQuestion.findMany({
      where: { assignmentId: id },
      include: { question: { select: { id: true, content: true, type: true, options: true, answer: true } } },
      orderBy: { orderNum: 'asc' },
    });

    return NextResponse.json(questions, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/assignments/[id]/questions', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menambahkan soal' }, { status: 500 });
  }
}

// DELETE /api/assignments/[id]/questions — remove a question
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get('questionId');
    if (!questionId) return NextResponse.json({ error: 'questionId wajib' }, { status: 400 });

    const subCount = await db.assignmentSubmission.count({ where: { assignmentId: id } });
    if (subCount > 0) {
      return NextResponse.json({ error: 'Tidak bisa menghapus soal — sudah ada siswa yang mengerjakan' }, { status: 403 });
    }

    // P1-03: Verify assignment belongs to auth school
    const assignment = await db.assignment.findUnique({ where: { id }, select: { schoolId: true } });
    if (!assignment) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });
    if (assignment.schoolId) { try { requireSchoolScope(auth, assignment.schoolId); } catch { throw new AuthError('Akses ditolak', 403); } }

    await db.assignmentQuestion.delete({ where: { assignmentId_questionId: { assignmentId: id, questionId } } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/assignments/[id]/questions', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal menghapus soal' }, { status: 500 });
  }
}
