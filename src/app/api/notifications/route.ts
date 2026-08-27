import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notifications?userId=xxx&schoolId=xxx&category=xxx&unread=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const schoolId = searchParams.get('schoolId');
    const category = searchParams.get('category');
    const unreadOnly = searchParams.get('unread') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'userId wajib diisi' }, { status: 400 });
    }

    const where: Record<string, unknown> = { userId };
    if (category && category !== 'semua') where.category = category;
    if (unreadOnly) where.isRead = false;

    const notifications = await db.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });

    return NextResponse.json({ data: notifications });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Gagal mengambil notifikasi' }, { status: 500 });
  }
}

// POST /api/notifications — create a new notification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, schoolId, title, message, category } = body;

    if (!userId || !title) {
      return NextResponse.json({ error: 'userId dan title wajib diisi' }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        userId,
        schoolId: schoolId || null,
        title,
        message: message || '',
        category: category || 'general',
      },
    });

    return NextResponse.json({ data: notification }, { status: 201 });
  } catch (error) {
    console.error('POST /api/notifications error:', error);
    return NextResponse.json({ error: 'Gagal membuat notifikasi' }, { status: 500 });
  }
}
