import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/notifications/broadcast — Send notification to users
// SUPER_ADMIN: can broadcast to all, by school, or by role
// ADMIN_SCHOOL: can only broadcast to their own school
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);

    const body = await req.json();
    const { title, message, schoolId, role, userIds } = body as {
      title: string;
      message: string;
      schoolId?: string;
      role?: string;
      userIds?: string[];
    };

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Judul dan pesan wajib diisi' }, { status: 400 });
    }

    // ADMIN_SCHOOL can only broadcast to their own school
    if (user.role === 'ADMIN_SCHOOL') {
      if (schoolId && schoolId !== user.schoolId) {
        return NextResponse.json({ error: 'Anda hanya dapat mengirim ke sekolah Anda sendiri' }, { status: 403 });
      }
    }

    // Build where clause for target users
    const where: any = { isActive: true };

    if (userIds && userIds.length > 0) {
      where.id = { in: userIds };
    } else if (schoolId) {
      where.schoolId = schoolId;
    } else if (role) {
      where.role = role;
    }
    // If no filters, target ALL users (SUPER_ADMIN only)

    const targetUsers = await db.user.findMany({
      where,
      select: { id: true, schoolId: true },
    });

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: 'Tidak ada pengguna yang sesuai kriteria' }, { status: 400 });
    }

    // Create notifications in batch
    const notifications = targetUsers.map((u) => ({
      userId: u.id,
      schoolId: u.schoolId,
      title: title.trim(),
      message: message.trim(),
      category: 'general' as const,
    }));

    // Use createMany for efficiency
    await db.notification.createMany({ data: notifications });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.userId,
        schoolId: user.schoolId,
        action: 'Broadcast Notifikasi',
        detail: `Mengirim notifikasi "${title.trim()}" ke ${targetUsers.length} pengguna`,
        module: 'sistem',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Notifikasi berhasil dikirim ke ${targetUsers.length} pengguna`,
      count: targetUsers.length,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('POST /api/notifications/broadcast error:', err);
    return NextResponse.json({ error: 'Gagal mengirim broadcast' }, { status: 500 });
  }
}
