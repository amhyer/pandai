import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: auto-create Notification records for targeted users
async function createNotificationsForAnnouncement(
  schoolId: string,
  title: string,
  announcementId: string,
  targetRoles?: string | null,
  targetClassIds?: string | null,
): Promise<number> {
  const where: Record<string, unknown> = { schoolId, isActive: true };

  // Build role filter
  let roles: string[] = [];
  if (targetRoles) {
    try {
      roles = JSON.parse(targetRoles);
    } catch {
      roles = [];
    }
  }

  // Build class filter
  let classIds: string[] = [];
  if (targetClassIds) {
    try {
      classIds = JSON.parse(targetClassIds);
    } catch {
      classIds = [];
    }
  }

  // Find matching users
  const users = await db.user.findMany({
    where: {
      ...where,
      ...(roles.length > 0 ? { role: { in: roles } } : {}),
      ...(classIds.length > 0 ? { classId: { in: classIds } } : {}),
    },
    select: { id: true },
  });

  if (users.length === 0) return 0;

  const notifications = users.map((u) => ({
    userId: u.id,
    title: 'Pengumuman Baru',
    message: title,
    type: 'pengumuman' as const,
    link: 'broadcasts',
  }));

  const result = await db.notification.createMany({ data: notifications });
  return result.count;
}

// GET /api/announcements — List announcements
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const role = searchParams.get('role');

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;

    let announcements = await db.announcement.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Client-side filter by role: if role is specified, only return announcements
    // where targetRoles is null (all) or contains the role
    if (role) {
      announcements = announcements.filter((a) => {
        if (!a.targetRoles) return true; // null = semua role
        try {
          const roles: string[] = JSON.parse(a.targetRoles);
          return roles.includes(role);
        } catch {
          return true;
        }
      });
    }

    return NextResponse.json(announcements);
  } catch (error) {
    console.error('GET /api/announcements error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pengumuman' }, { status: 500 });
  }
}

// POST /api/announcements — Create announcement + auto-notifications
export async function POST(req: NextRequest) {
  try {
    const { schoolId, title, content, category, attachmentUrl, targetRoles, targetClassIds, createdById } = await req.json();

    if (!schoolId || !title || !content || !createdById) {
      return NextResponse.json({ error: 'schoolId, title, content, dan createdById wajib diisi' }, { status: 400 });
    }

    const announcement = await db.announcement.create({
      data: {
        schoolId,
        title,
        content,
        category: category || 'Umum',
        attachmentUrl: attachmentUrl || null,
        targetRoles: targetRoles ? JSON.stringify(targetRoles) : null,
        targetClassIds: targetClassIds ? JSON.stringify(targetClassIds) : null,
        createdById,
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    // Auto-create notifications for targeted users
    const notifCount = await createNotificationsForAnnouncement(
      schoolId,
      title,
      announcement.id,
      announcement.targetRoles,
      announcement.targetClassIds,
    );

    return NextResponse.json({ announcement, notificationsCreated: notifCount }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/announcements error:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat pengumuman' }, { status: 500 });
  }
}

// PATCH /api/announcements — Update announcement by id
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    // Re-stringify arrays if passed
    const updateData: Record<string, unknown> = { ...data };
    if (data.targetRoles && !Array.isArray(data.targetRoles)) {
      // Already a string, pass through
    } else if (data.targetRoles && Array.isArray(data.targetRoles)) {
      updateData.targetRoles = JSON.stringify(data.targetRoles);
    }
    if (data.targetClassIds && !Array.isArray(data.targetClassIds)) {
      // Already a string, pass through
    } else if (data.targetClassIds && Array.isArray(data.targetClassIds)) {
      updateData.targetClassIds = JSON.stringify(data.targetClassIds);
    }

    const announcement = await db.announcement.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(announcement);
  } catch (error: any) {
    console.error('PATCH /api/announcements error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengupdate pengumuman' }, { status: 500 });
  }
}

// DELETE /api/announcements — Delete announcement by id
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    await db.announcement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/announcements error:', error);
    return NextResponse.json({ error: 'Gagal menghapus pengumuman' }, { status: 500 });
  }
}
