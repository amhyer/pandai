import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: auth headers
function getAuth(req: NextRequest) {
  const userId = req.headers.get('X-User-Id');
  const schoolId = req.headers.get('X-School-Id');
  const userRole = req.headers.get('X-User-Role');
  return { userId, schoolId, userRole };
}

// Roles allowed to respond/update feedback
const RESPONDER_ROLES = ['GURU', 'KEPALA_SEKOLAH', 'ADMIN_SCHOOL', 'SUPER_ADMIN'];

// PATCH /api/feedback/:id — update status & response
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, schoolId, userRole } = getAuth(req);

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ORANG_TUA TIDAK BOLEH PATCH
    if (userRole === 'ORANG_TUA') {
      return NextResponse.json({ error: 'Orang tua tidak diizinkan memperbarui feedback' }, { status: 403 });
    }

    if (!RESPONDER_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Role tidak diizinkan' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, response } = body;

    // Validate status if provided
    if (status) {
      const validStatuses = ['baru', 'dibaca', 'ditindaklanjuti'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'status harus: baru, dibaca, atau ditindaklanjuti' }, { status: 400 });
      }
    }

    // Fetch existing feedback
    const existing = await db.feedback.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Feedback tidak ditemukan' }, { status: 404 });
    }

    // School-level guard: GURU/KEPALA_SEKOLAH/ADMIN_SCHOOL hanya boleh akses feedback sekolahnya
    if (['GURU', 'KEPALA_SEKOLAH', 'ADMIN_SCHOOL'].includes(userRole)) {
      if (schoolId && existing.schoolId !== schoolId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (response !== undefined) {
      updateData.response = typeof response === 'string' ? response.trim().slice(0, 5000) : response;
      updateData.respondedBy = userId;
      updateData.respondedAt = new Date();
    }

    const updated = await db.feedback.update({
      where: { id },
      data: updateData,
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        responder: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
