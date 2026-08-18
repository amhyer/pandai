import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth';

// Roles allowed to respond/update feedback
const RESPONDER_ROLES = ['GURU', 'KEPALA_SEKOLAH', 'ADMIN_SCHOOL', 'SUPER_ADMIN'];

// PATCH /api/feedback/:id — update status & response
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);

    if (auth.role === 'ORANG_TUA') {
      return NextResponse.json({ error: 'Orang tua tidak diizinkan memperbarui feedback' }, { status: 403 });
    }

    if (!RESPONDER_ROLES.includes(auth.role)) {
      return NextResponse.json({ error: 'Role tidak diizinkan' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, response } = body;

    if (status) {
      const validStatuses = ['baru', 'dibaca', 'ditindaklanjuti'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'status harus: baru, dibaca, atau ditindaklanjuti' }, { status: 400 });
      }
    }

    const existing = await db.feedback.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Feedback tidak ditemukan' }, { status: 404 });
    }

    if (['GURU', 'KEPALA_SEKOLAH', 'ADMIN_SCHOOL'].includes(auth.role)) {
      if (auth.schoolId && existing.schoolId !== auth.schoolId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (response !== undefined) {
      updateData.response = typeof response === 'string' ? response.trim().slice(0, 5000) : response;
      updateData.respondedBy = auth.userId;
      updateData.respondedAt = new Date();
    }

    const updated = await db.feedback.update({
      where: { id }, data: updateData,
      include: { fromUser: { select: { id: true, name: true, role: true } }, responder: { select: { id: true, name: true, role: true } } },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
