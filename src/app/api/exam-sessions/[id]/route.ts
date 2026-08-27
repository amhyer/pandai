import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PATCH /api/exam-sessions/[id] — cancel an exam session
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(req, {
      roles: ['ADMIN_SCHOOL', 'GURU', 'SUPER_ADMIN'],
    });
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    // Only 'cancelled' is allowed on this endpoint
    if (status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Hanya status "cancelled" yang diperbolehkan' },
        { status: 400 }
      );
    }

    // Check that the exam session exists
    const session = await db.examSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Sesi ujian tidak ditemukan' },
        { status: 404 }
      );
    }

    // School isolation for ADMIN_SCHOOL and GURU
    if (user.role !== 'SUPER_ADMIN') {
      if (session.schoolId !== user.schoolId) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses ke sesi ujian ini' },
          { status: 403 }
        );
      }
    }

    // Only allow cancellation if current status is 'scheduled'
    if (session.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Hanya sesi ujian dengan status "scheduled" yang dapat dibatalkan' },
        { status: 400 }
      );
    }

    const updated = await db.examSession.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('PATCH /api/exam-sessions/[id] error:', err);
    return NextResponse.json(
      { error: 'Gagal membatalkan sesi ujian' },
      { status: 500 }
    );
  }
}
