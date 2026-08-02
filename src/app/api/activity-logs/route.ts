import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/activity-logs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const userId = searchParams.get('userId');
    const module_ = searchParams.get('module');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (userId) where.userId = userId;
    if (module_) where.module = module_;

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
        skip: offset,
      }),
      db.activityLog.count({ where }),
    ]);

    // Enrich with user names
    const enriched = await Promise.all(
      logs.map(async (log) => {
        let user: any = null;
        if (log.userId) {
          user = await db.user.findUnique({
            where: { id: log.userId },
            select: { id: true, name: true, role: true },
          });
        }
        return { ...log, user };
      })
    );

    return NextResponse.json({ data: enriched, total });
  } catch (error) {
    console.error('GET /api/activity-logs error:', error);
    return NextResponse.json({ error: 'Gagal mengambil log aktivitas' }, { status: 500 });
  }
}

// POST /api/activity-logs — Create activity log
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, schoolId, action, detail, module: mod } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action wajib diisi' }, { status: 400 });
    }

    const log = await db.activityLog.create({
      data: {
        userId: userId || null,
        schoolId: schoolId || null,
        action,
        detail: detail || null,
        module: mod || null,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('POST /api/activity-logs error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan log' }, { status: 500 });
  }
}
