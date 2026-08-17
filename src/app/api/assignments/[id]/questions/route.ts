import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';

// POST /api/assignments/[id]/questions — add questions to assignment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { questionIds, replaceAll } = body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: 'questionIds wajib berupa array' }, { status: 400 });
    }

    // Guard: can't change questions if submissions exist
    const subCount = await db.assignmentSubmission.count({ where: { assignmentId: id } });
    if (subCount > 0) {
      return NextResponse.json({ error: 'Tidak bisa mengubah soal — sudah ada siswa yang mengerjakan' }, { status: 403 });
    }

    // Get assignment for maxScore
    const assignment = await db.assignment.findUnique({ where: { id }, select: { maxScore: true } });
    if (!assignment) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });

    if (replaceAll) {
      await db.assignmentQuestion.deleteMany({ where: { assignmentId: id } });
    }

    // Calculate points per question
    const totalPoints = assignment.maxScore || 100;
    const pointsPerQ = Math.floor(totalPoints / questionIds.length);

    await db.assignmentQuestion.createMany({
      data: questionIds.map((qId: string, idx: number) => ({
        assignmentId: id,
        questionId: qId,
        orderNum: idx,
        points: pointsPerQ,
      })),
    });

    const questions = await db.assignmentQuestion.findMany({
      where: { assignmentId: id },
      include: { question: { select: { id: true, content: true, type: true, options: true, answer: true } } },
      orderBy: { orderNum: 'asc' },
    });

    return NextResponse.json(questions, { status: 201 });
  } catch (error) {
    await logError({ error, route: '/api/assignments/[id]/questions', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menambahkan soal' }, { status: 500 });
  }
}

// DELETE /api/assignments/[id]/questions — remove a question
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get('questionId');
    if (!questionId) return NextResponse.json({ error: 'questionId wajib' }, { status: 400 });

    // Guard: can't remove questions if submissions exist
    const subCount = await db.assignmentSubmission.count({ where: { assignmentId: id } });
    if (subCount > 0) {
      return NextResponse.json({ error: 'Tidak bisa menghapus soal — sudah ada siswa yang mengerjakan' }, { status: 403 });
    }

    await db.assignmentQuestion.delete({ where: { assignmentId_questionId: { assignmentId: id, questionId } } });
    return NextResponse.json({ success: true });
  } catch (error) {
    await logError({ error, route: '/api/assignments/[id]/questions', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal menghapus soal' }, { status: 500 });
  }
}
