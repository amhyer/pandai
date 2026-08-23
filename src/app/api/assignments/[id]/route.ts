import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

// GET /api/assignments/[id] — single assignment detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH', 'SISWA']);
    const { id } = await params;
    const isStudent = auth.role === 'SISWA';

    const assignment = await db.assignment.findUnique({
      where: { id },
      include: {
        questions: {
          include: { question: { select: { id: true, content: true, type: true, options: true, answer: true, explanation: true } } },
          orderBy: { orderNum: 'asc' },
        },
        _count: { select: { submissions: true } },
      },
    });

    if (!assignment) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });

    // School scope check for non-SUPER_ADMIN
    if (auth.role !== 'SUPER_ADMIN' && assignment.schoolId) {
      requireSchoolScope(auth, assignment.schoolId);
    }

    // Strip answers for student role
    if (isStudent) {
      const stripped = {
        ...assignment,
        questions: assignment.questions.map(q => {
          const { answer, explanation, ...rest } = q.question;
          return { ...q, question: rest };
        }),
      };
      return NextResponse.json(stripped);
    }

    return NextResponse.json(assignment);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/assignments/[id]', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil tugas' }, { status: 500 });
  }
}
