import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

// GET /api/notifications?category=xxx&unread=true — current user's notifications
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const unreadOnly = searchParams.get('unread') === 'true';

    // userId is always derived from the authenticated session.
    const where: Record<string, unknown> = { userId: auth.userId };
    if (category && category !== 'semua') where.category = category;
    if (unreadOnly) where.isRead = false;

    const notifications = await db.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 100),
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

// POST /api/notifications — create a new notification (admin/kepala only)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH']);
    const body = await req.json();
    const { userId, schoolId, title, message, category } = body;

    if (!userId || !title) {
      return NextResponse.json({ error: 'userId dan title wajib diisi' }, { status: 400 });
    }

    // Non-super-admins can only create notifications inside their own school.
    if (schoolId && auth.role !== 'SUPER_ADMIN') {
      requireSchoolScope(auth, schoolId);
    }

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, schoolId: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'Pengguna tujuan tidak ditemukan' }, { status: 404 });
    }
    if (auth.role !== 'SUPER_ADMIN') {
      requireSchoolScope(auth, target.schoolId ?? '');
    }

    const notification = await db.notification.create({
      data: {
        userId,
        schoolId: schoolId || target.schoolId || null,
        title: String(title).trim(),
        message: String(message || '').trim(),
        category: String(category || 'general').trim(),
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
