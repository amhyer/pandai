import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';

// POST /api/assignments/[id]/submissions/remedial — guru activates remedial for a student's submission
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = req.headers.get('X-User-Role');
    if (role !== 'GURU' && role !== 'ADMIN_SCHOOL' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Hanya guru atau admin yang dapat mengaktifkan remedial' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { studentId } = body;
    if (!studentId) return NextResponse.json({ error: 'studentId wajib' }, { status: 400 });

    // Verify assignment exists
    const assignment = await db.assignment.findUnique({ where: { id } });
    if (!assignment) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });

    // Find original submission (non-remedial)
    const original = await db.assignmentSubmission.findFirst({
      where: { assignmentId: id, studentId, isRemedial: false },
      include: { answers: true },
    });
    if (!original) return NextResponse.json({ error: 'Submission asli tidak ditemukan' }, { status: 404 });

    // Guard: check if remedial already exists
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

    // Create new remedial submission (empty, waiting for student)
    const remedial = await db.assignmentSubmission.create({
      data: {
        assignmentId: id,
        studentId,
        schoolId: original.schoolId,
        classId: original.classId,
        status: 'belum_dikerjakan',
        score: null,
        isRemedial: true,
        remedialOfId: original.id,
      },
    });

    return NextResponse.json(remedial, { status: 201 });
  } catch (error) {
    await logError({ error, route: '/api/assignments/[id]/submissions/remedial', method: 'POST' });
    return NextResponse.json({ error: 'Gagal mengaktifkan remedial' }, { status: 500 });
  }
}
