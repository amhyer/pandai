import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/notifications/mark-all-read — mark all user's notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const schoolId = searchParams.get('schoolId');

    if (!userId) {
      return NextResponse.json({ error: 'userId wajib diisi' }, { status: 400 });
    }

    const where: Record<string, unknown> = { userId, isRead: false };
    // Optionally scope to school
    if (schoolId) where.schoolId = schoolId;

    const result = await db.notification.updateMany({
      where,
      data: { isRead: true },
    });

    return NextResponse.json({ data: { updated: result.count } });
  } catch (error) {
    console.error('PATCH /api/notifications/mark-all-read error:', error);
    return NextResponse.json({ error: 'Gagal menandai semua dibaca' }, { status: 500 });
  }
}
