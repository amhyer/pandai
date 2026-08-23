import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, AuthError } from '@/lib/auth';
import { requireStudentScope, getSchoolFilter } from '@/lib/scope';

// GET /api/submissions/[id] — get a specific submission (including remedial)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    const sub = await db.assignmentSubmission.findUnique({
      where: { id },
      include: {
        answers: {
          include: {
            question: {
              include: {
                question: { select: { id: true, content: true, type: true, options: true } },
              },
            },
          },
        },
        originalSubmission: { select: { id: true, score: true, status: true } },
      },
    });

    if (!sub) return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 });

    // IDOR fix: student ownership / school isolation
    if (sub.studentId) {
      await requireStudentScope(auth, sub.studentId);
    } else if (sub.schoolId) {
      const schoolF = getSchoolFilter(auth);
      if (schoolF && sub.schoolId !== schoolF) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    } else if (auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    return NextResponse.json(sub);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/submissions/[id]', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil submission' }, { status: 500 });
  }
}
