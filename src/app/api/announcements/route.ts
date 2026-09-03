import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

// Helper: auto-create Notification records for targeted users
async function createNotificationsForAnnouncement(
  schoolId: string,
  title: string,
  announcementId: string,
  targetRoles?: string | null,
  targetClassIds?: string | null,
): Promise<number> {
  const where: Record<string, unknown> = { schoolId, isActive: true };

  let roles: string[] = [];
  if (targetRoles) {
    try {
      roles = JSON.parse(targetRoles);
    } catch {
      roles = [];
    }
  }

  let classIds: string[] = [];
  if (targetClassIds) {
    try {
      classIds = JSON.parse(targetClassIds);
    } catch {
      classIds = [];
    }
  }

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

// GET /api/announcements — List announcements visible to the current user
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const requestedSchoolId = searchParams.get('schoolId');

    // Non-super-admin users always see announcements from their own school.
    let schoolId = requestedSchoolId || auth.schoolId;
    if (schoolId && auth.role !== 'SUPER_ADMIN') {
      requireSchoolScope(auth, schoolId);
    }

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (!schoolId && auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    if (!schoolId && auth.role === 'SUPER_ADMIN') {
      // Super admin without a school filter sees school announcements?
      // Without a filter, return only platform-wide announcements.
      // If you need all announcements, pass schoolId explicitly.
      where.schoolId = null;
    }

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
    const role = searchParams.get('role') || auth.role;
    if (role) {
      announcements = announcements.filter((a) => {
        if (!a.targetRoles) return true;
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/announcements error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pengumuman' }, { status: 500 });
  }
}

// POST /api/announcements — Create announcement + auto-notifications
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { schoolId, title, content, category, attachmentUrl, targetRoles, targetClassIds } = await req.json();

    if (!schoolId || !title || !content) {
      return NextResponse.json({ error: 'schoolId, title, dan content wajib diisi' }, { status: 400 });
    }
    if (auth.role !== 'SUPER_ADMIN') {
      requireSchoolScope(auth, schoolId);
    }

    const announcement = await db.announcement.create({
      data: {
        schoolId,
        title: String(title).trim(),
        content: String(content).trim(),
        category: String(category || 'Umum').trim(),
        attachmentUrl: String(attachmentUrl || '').trim() || null,
        targetRoles: targetRoles ? JSON.stringify(targetRoles) : null,
        targetClassIds: targetClassIds ? JSON.stringify(targetClassIds) : null,
        createdById: auth.userId, // always derived from session
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    const notifCount = await createNotificationsForAnnouncement(
      schoolId,
      announcement.title,
      announcement.id,
      announcement.targetRoles,
      announcement.targetClassIds,
    );

    return NextResponse.json({ announcement, notificationsCreated: notifCount }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/announcements error:', error);
    return NextResponse.json({ error: 'Gagal membuat pengumuman' }, { status: 500 });
  }
}

// PATCH /api/announcements — Update announcement by id
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { id, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    const existing = await db.announcement.findUnique({ where: { id }, select: { schoolId: true } });
    if (!existing) return NextResponse.json({ error: 'Pengumuman tidak ditemukan' }, { status: 404 });
    if (auth.role !== 'SUPER_ADMIN') requireSchoolScope(auth, existing.schoolId);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = String(data.title).trim();
    if (data.content !== undefined) updateData.content = String(data.content).trim();
    if (data.category !== undefined) updateData.category = String(data.category).trim();
    if (data.attachmentUrl !== undefined) updateData.attachmentUrl = String(data.attachmentUrl || '').trim() || null;
    if (data.targetRoles !== undefined) {
      updateData.targetRoles = Array.isArray(data.targetRoles) ? JSON.stringify(data.targetRoles) : String(data.targetRoles);
    }
    if (data.targetClassIds !== undefined) {
      updateData.targetClassIds = Array.isArray(data.targetClassIds) ? JSON.stringify(data.targetClassIds) : String(data.targetClassIds);
    }

    const announcement = await db.announcement.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(announcement);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('PATCH /api/announcements error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate pengumuman' }, { status: 500 });
  }
}

// DELETE /api/announcements — Delete announcement by id
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    const existing = await db.announcement.findUnique({ where: { id }, select: { schoolId: true } });
    if (!existing) return NextResponse.json({ error: 'Pengumuman tidak ditemukan' }, { status: 404 });
    if (auth.role !== 'SUPER_ADMIN') requireSchoolScope(auth, existing.schoolId);

    await db.announcement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('DELETE /api/announcements error:', error);
    return NextResponse.json({ error: 'Gagal menghapus pengumuman' }, { status: 500 });
  }
}
