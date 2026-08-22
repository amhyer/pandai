import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';

// Roles allowed to send feedback
const SENDER_ROLES = ['ORANG_TUA', 'GURU', 'KEPALA_SEKOLAH', 'ADMIN_SCHOOL', 'SUPER_ADMIN'];

// POST /api/feedback — kirim feedback baru
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);

    if (!SENDER_ROLES.includes(auth.role)) {
      return NextResponse.json({ error: 'Role tidak diizinkan mengirim feedback' }, { status: 403 });
    }

    const body = await req.json();
    const { category, subject, message } = body;

    if (!category || !subject || !message) {
      return NextResponse.json({ error: 'category, subject, dan message wajib diisi' }, { status: 400 });
    }

    const validCategories = ['saran', 'kritik', 'apresiasi'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'category harus: saran, kritik, atau apresiasi' }, { status: 400 });
    }

    const finalSchoolId = auth.schoolId || '';

    const feedback = await db.feedback.create({
      data: {
        schoolId: finalSchoolId, fromUserId: auth.userId, fromRole: auth.role,
        category, subject: subject.trim().slice(0, 200), message: message.trim().slice(0, 5000), status: 'baru',
      },
      include: { fromUser: { select: { id: true, name: true, role: true } } },
    });

    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[POST /api/feedback]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

// GET /api/feedback — list feedback dengan guard privasi
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const categoryFilter = searchParams.get('category');

    const where: Record<string, unknown> = {};

    // IDOR fix: SISWA should not access feedback
    if (auth.role === 'SISWA') {
      return NextResponse.json({ data: [] });
    }

    if (auth.role === 'ORANG_TUA') {
      where.fromUserId = auth.userId;
    }

    if (['GURU', 'KEPALA_SEKOLAH', 'ADMIN_SCHOOL'].includes(auth.role)) {
      if (auth.schoolId) where.schoolId = auth.schoolId;
    }

    if (statusFilter) where.status = statusFilter;
    if (categoryFilter) where.category = categoryFilter;

    const feedbacks = await db.feedback.findMany({
      where, orderBy: [{ createdAt: 'desc' }], take: 200,
      include: { fromUser: { select: { id: true, name: true, role: true } }, responder: { select: { id: true, name: true, role: true } } },
    });

    return NextResponse.json({ data: feedbacks });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[GET /api/feedback]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
