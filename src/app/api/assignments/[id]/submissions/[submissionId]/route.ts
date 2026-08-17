import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';

// GET /api/assignments/[id]/submissions/[submissionId] — get a specific submission (including remedial)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; submissionId: string }> }) {
  try {
    const { submissionId } = await params;

    const sub = await db.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        answers: { include: { question: { include: { question: { select: { id: true, content: true, type: true, options: true } } } } } },
        originalSubmission: { select: { id: true, score: true, status: true } },
      },
    });

    if (!sub) return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 });
    return NextResponse.json(sub);
  } catch (error) {
    await logError({ error, route: '/api/assignments/[id]/submissions/[submissionId]', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil submission' }, { status: 500 });
  }
}
