import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth';

// PATCH /api/notifications/mark-all-read — mark all current user's notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);

    // userId is always derived from the authenticated session.
    const where: Record<string, unknown> = { userId: auth.userId, isRead: false };
    const result = await db.notification.updateMany({
      where,
      data: { isRead: true },
    });

    return NextResponse.json({ data: { updated: result.count } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('PATCH /api/notifications/mark-all-read error:', error);
    return NextResponse.json({ error: 'Gagal menandai semua dibaca' }, { status: 500 });
  }
}
