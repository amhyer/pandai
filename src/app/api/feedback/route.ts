import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';

// Helper: auth headers
function getAuth(req: NextRequest) {
  const userId = req.headers.get('X-User-Id');
  const schoolId = req.headers.get('X-School-Id');
  const userRole = req.headers.get('X-User-Role');
  return { userId, schoolId, userRole };
}

// Roles allowed to send feedback
const SENDER_ROLES = ['ORANG_TUA', 'GURU', 'KEPALA_SEKOLAH', 'ADMIN_SCHOOL', 'SUPER_ADMIN'];

// POST /api/feedback — kirim feedback baru
export async function POST(req: NextRequest) {
  try {
    const { userId, schoolId, userRole } = getAuth(req);

    if (!userId || !schoolId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!SENDER_ROLES.includes(userRole)) {
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

    // SUPER_ADMIN mungkin tidak punya schoolId — skip jika kosong
    const finalSchoolId = schoolId || '';

    const feedback = await db.feedback.create({
      data: {
        schoolId: finalSchoolId,
        fromUserId: userId,
        fromRole: userRole,
        category,
        subject: subject.trim().slice(0, 200),
        message: message.trim().slice(0, 5000),
        status: 'baru',
      },
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (error) {
    await logError('POST /api/feedback', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/feedback — list feedback dengan guard privasi
export async function GET(req: NextRequest) {
  try {
    const { userId, schoolId, userRole } = getAuth(req);

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const categoryFilter = searchParams.get('category');

    const where: Record<string, unknown> = {};

    if (userRole === 'ORANG_TUA') {
      // ORANG_TUA: HANYA feedback yang dia kirim sendiri
      where.fromUserId = userId;
    }

    // GURU, KEPALA_SEKOLAH, ADMIN_SCHOOL: semua feedback sekolahnya
    if (['GURU', 'KEPALA_SEKOLAH', 'ADMIN_SCHOOL'].includes(userRole)) {
      if (schoolId) where.schoolId = schoolId;
    }

    // SUPER_ADMIN: lihat semua
    // (no schoolId filter for SUPER_ADMIN)

    if (statusFilter) where.status = statusFilter;
    if (categoryFilter) where.category = categoryFilter;

    const feedbacks = await db.feedback.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        responder: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ data: feedbacks });
  } catch (error) {
    await logError('GET /api/feedback', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
