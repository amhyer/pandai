import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter } from '@/lib/scope';
import { logAccess } from '@/lib/audit-log';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH']);
    try { await logAccess(auth, { action: 'READ', resourceType: 'activity-logs' }); } catch {}
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const userId = searchParams.get('userId');
    const module_ = searchParams.get('module');
    const category = searchParams.get('category');
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50') || 50));
    const offset = Math.max(0, Math.min(1000000, parseInt(searchParams.get('offset') || '0') || 0));
    const query = (searchParams.get('q') || '').trim().slice(0, 100);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (auth.role !== 'SUPER_ADMIN' && !auth.schoolId) throw new AuthError('Sekolah tidak ditemukan', 403);
    if (schoolId && auth.role !== 'SUPER_ADMIN' && schoolId !== auth.schoolId) throw new AuthError('Bukan sekolah Anda', 403);
    for (const value of [from, to]) {
      if (value && !z.iso.date().safeParse(value).success) {
        throw new AuthError('Tanggal tidak valid', 400);
      }
    }
    if (from && to && from > to) throw new AuthError('Rentang tanggal tidak valid', 400);

    const where: Record<string, unknown> = {};
    // IDOR fix: ADMIN_SCHOOL can only see their own school's logs
    const schoolF = getSchoolFilter(auth);
    if (schoolF) where.schoolId = schoolF;
    else if (schoolId) where.schoolId = schoolId;
    if (userId) where.userId = userId;
    if (module_) where.module = module_;
    if (category) where.module = category;
    if (from || to) where.createdAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00+08:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999+08:00`) } : {}),
    };
    if (query) {
      const users = await db.user.findMany({
        where: { ...(schoolF ? { schoolId: schoolF } : schoolId ? { schoolId } : {}), name: { contains: query, mode: 'insensitive' } },
        select: { id: true },
      });
      where.OR = [
        { action: { contains: query, mode: 'insensitive' } },
        { detail: { contains: query, mode: 'insensitive' } },
        { userId: { in: users.map((u) => u.id) } },
      ];
    }

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(limit, 200), skip: offset }),
      db.activityLog.count({ where }),
    ]);

    const enriched = await Promise.all(logs.map(async (log) => {
      let user: any = null;
      if (log.userId) { user = await db.user.findUnique({ where: { id: log.userId }, select: { id: true, name: true, role: true } }); }
      return { ...log, user };
    }));

    return NextResponse.json({ data: enriched, total });
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    return NextResponse.json({ error: 'Gagal mengambil log aktivitas' }, { status: 500 });
  }
}

// POST /api/activity-logs — REMOVED (P0-05)
// Activity logs must be server-generated only via logAccess() helper.
// Client-supplied log entries pose audit trail poisoning risk.
export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint ini tidak tersedia. Log aktivitas dibuat otomatis oleh server.' },
    { status: 405 }
  );
}
