import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, [
      'SUPER_ADMIN',
      'ADMIN_SCHOOL',
      'GURU',
      'KEPALA_SEKOLAH',
      'SISWA',
    ]);
    const { id } = await params;
    const assignment = await db.assignment.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: {
              select: {
                id: true,
                content: true,
                type: true,
                options: true,
                answer: auth.role === 'SISWA' ? false : true,
              },
            },
          },
          orderBy: { orderNum: 'asc' },
        },
        _count: { select: { submissions: true } },
      },
    });

    if (!assignment) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });

    if (assignment.schoolId) {
      requireSchoolScope(auth, assignment.schoolId);
    } else if (auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // SISWA: only published/closed and own class if set
    if (auth.role === 'SISWA') {
      if (!['published', 'closed'].includes(assignment.status)) {
        return NextResponse.json({ error: 'Tugas tidak tersedia' }, { status: 403 });
      }
      if (assignment.classId && auth.classId && assignment.classId !== auth.classId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
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
