import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

export async function PATCH(request: Request) {
  try {
    // IDOR fix: only GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN can review questions
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']);
    const data = await request.json();
    const { questionId, action, schoolId } = data;
    const reviewerId = auth.userId; // Force from session, not body

    if (!questionId || !action || !schoolId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Aksi tidak valid (approve/reject)' }, { status: 400 });
    }

    // IDOR fix: verify question belongs to user's school
    requireSchoolScope(auth, schoolId);

    const existing = await db.question.findFirst({
      where: { id: questionId, schoolId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Soal tidak ditemukan' }, { status: 404 });
    }

    const newStatus = action === 'approve' ? 'published' : 'archived';

    const updated = await db.question.update({
      where: { id: questionId },
      data: {
        status: newStatus,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    const statusLabel = action === 'approve' ? 'disetujui' : 'ditolak';
    return NextResponse.json({ success: true, question: updated, message: `Soal berhasil ${statusLabel}` });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/ai/review-question', method: 'PATCH' });
    console.error('Review question error:', error);
    return NextResponse.json({ error: 'Gagal mereview soal' }, { status: 500 });
  }
}
