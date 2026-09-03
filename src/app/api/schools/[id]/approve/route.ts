import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/schools/[id]/approve — SUPER_ADMIN approves a pending school
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    await requireRole(_request, ['SUPER_ADMIN']);
    const { id } = await params;

    const school = await db.school.findUnique({
      where: { id },
      select: { id: true, name: true, status: true },
    });
    if (!school) {
      return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 });
    }
    if (school.status === 'deleted') {
      return NextResponse.json({ error: 'Sekolah sudah dihapus dan tidak dapat disetujui' }, { status: 400 });
    }

    const updated = await db.school.update({
      where: { id },
      data: { status: 'active' },
      select: { id: true, name: true, status: true },
    });

    // Activate all admin-school accounts that are waiting for approval.
    await db.user.updateMany({
      where: { schoolId: id, role: 'ADMIN_SCHOOL' },
      data: { isActive: true },
    });

    return NextResponse.json({
      success: true,
      message: `Sekolah "${updated.name}" disetujui. Akun admin sekolah sudah diaktifkan.`,
      school: updated,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Approve school error:', error);
    return NextResponse.json({ error: 'Gagal menyetujui sekolah' }, { status: 500 });
  }
}
