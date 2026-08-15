import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';

export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    const { questionId, action, reviewerId, schoolId } = data;

    if (!questionId || !action || !reviewerId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Aksi tidak valid (approve/reject)' }, { status: 400 });
    }

    // Verify question belongs to school
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
    logError({ error, route: '/api/ai/review-question', method: 'PATCH' });
    console.error('Review question error:', error);
    return NextResponse.json({ error: 'Gagal mereview soal' }, { status: 500 });
  }
}
