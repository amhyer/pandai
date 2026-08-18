import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';

// POST /api/assignments/[id]/submissions/remedial — guru activates remedial
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);

    const { id } = await params;
    const body = await req.json();
    const { studentId } = body;
    if (!studentId) return NextResponse.json({ error: 'studentId wajib' }, { status: 400 });

    const assignment = await db.assignment.findUnique({ where: { id } });
    if (!assignment) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });

    const original = await db.assignmentSubmission.findFirst({
      where: { assignmentId: id, studentId, isRemedial: false },
      include: { answers: true },
    });
    if (!original) return NextResponse.json({ error: 'Submission asli tidak ditemukan' }, { status: 404 });

    const existingRemedial = await db.assignmentSubmission.findFirst({
      where: { assignmentId: id, studentId, isRemedial: true },
    });
    if (existingRemedial) {
      return NextResponse.json({
        error: 'Remedial sudah diaktifkan untuk siswa ini',
        remedialId: existingRemedial.id,
        status: existingRemedial.status,
      }, { status: 409 });
    }

    const remedial = await db.assignmentSubmission.create({
      data: {
        assignmentId: id, studentId, schoolId: original.schoolId,
        classId: original.classId, status: 'belum_dikerjakan', score: null,
        isRemedial: true, remedialOfId: original.id,
      },
    });

    return NextResponse.json(remedial, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/assignments/[id]/submissions/remedial', method: 'POST' });
    return NextResponse.json({ error: 'Gagal mengaktifkan remedial' }, { status: 500 });
  }
}
