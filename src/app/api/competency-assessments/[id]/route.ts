import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { logError } from '@/lib/error-log';

// ─── DELETE: Remove a competency assessment ───
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, ['GURU', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH', 'SUPER_ADMIN']);
    const { id } = await params;

    const existing = await db.competencyAssessment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Penilaian tidak ditemukan' }, { status: 404 });
    }

    // School isolation
    if (auth.role !== 'SUPER_ADMIN' && existing.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Only the assessor (or admin/kepsek) can delete
    if (auth.role === 'GURU' && existing.assessedBy !== auth.userId) {
      return NextResponse.json({ error: 'Hanya guru yang menilai yang bisa menghapus' }, { status: 403 });
    }

    await db.competencyAssessment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/competency-assessments/[id]', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal menghapus penilaian' }, { status: 500 });
  }
}
