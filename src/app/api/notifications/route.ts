import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';

// GET /api/notifications?userId=xxx&schoolId=xxx&category=xxx&unread=true
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const unreadOnly = searchParams.get('unread') === 'true';

    // Users can only see their own notifications
    // Admin can see all notifications in their school
    let targetUserId = auth.userId;
    if (userId && userId !== auth.userId) {
      if (auth.role !== 'SUPER_ADMIN' && auth.role !== 'ADMIN_SCHOOL') {
        return NextResponse.json({ error: 'Tidak diizinkan melihat notifikasi orang lain' }, { status: 403 });
      }
      targetUserId = userId;
    }

    const where: Record<string, unknown> = { userId: targetUserId };
    if (category && category !== 'semua') where.category = category;
    if (unreadOnly) where.isRead = false;

    const notifications = await db.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });

    return NextResponse.json({ data: notifications });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Gagal mengambil notifikasi' }, { status: 500 });
  }
}

// POST /api/notifications — create a new notification (admin only)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH']);
    const body = await req.json();
    const { userId, title, message, category } = body;

    if (!userId || !title) {
      return NextResponse.json({ error: 'userId dan title wajib diisi' }, { status: 400 });
    }

    // Verify target user exists and is in same school (for non-super-admin)
    const targetUser = await db.user.findUnique({ where: { id: userId }, select: { schoolId: true } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }
    if (auth.role !== 'SUPER_ADMIN' && targetUser.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
    }

    const notification = await db.notification.create({
      data: {
        userId,
        schoolId: auth.schoolId || null,
        title,
        message: message || '',
        category: category || 'general',
      },
    });

    return NextResponse.json({ data: notification }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/notifications error:', error);
    return NextResponse.json({ error: 'Gagal membuat notifikasi' }, { status: 500 });
  }
}
