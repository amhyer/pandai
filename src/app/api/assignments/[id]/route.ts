import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';

// GET /api/assignments/[id] — single assignment detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH', 'SISWA']);
    const { id } = await params;
    const assignment = await db.assignment.findUnique({
      where: { id },
      include: {
        questions: {
          include: { question: { select: { id: true, content: true, type: true, options: true, answer: true } } },
          orderBy: { orderNum: 'asc' },
        },
        _count: { select: { submissions: true } },
      },
    });

    if (!assignment) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });
    return NextResponse.json(assignment);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/assignments/[id]', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil tugas' }, { status: 500 });
  }
}
