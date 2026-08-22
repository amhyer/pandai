import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

/**
 * GET /api/audit/suspicious-access
 * 
 * Monitoring endpoint untuk mendeteksi pola akses mencurigakan:
 * - Satu userId mengakses > N targetUserId berbeda dalam window waktu tertentu
 * - Default: > 5 target berbeda dalam 10 menit
 * 
 * Query params:
 *   windowMinutes (default: 10)
 *   threshold (default: 5)
 *   schoolId (optional, SUPER_ADMIN only)
 */
export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH']);
    const { searchParams } = new URL(request.url);
    const windowMinutes = parseInt(searchParams.get('windowMinutes') || '10');
    const threshold = parseInt(searchParams.get('threshold') || '5');
    const schoolFilter = searchParams.get('schoolId');

    // Only SUPER_ADMIN can check other schools
    if (schoolFilter && auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const since = new Date(Date.now() - windowMinutes * 60 * 1000);

    // Query 1: Users accessing many different targetUserIds in the window
    // Build query dynamically based on whether schoolFilter is present
    let suspiciousUsers: any[];
    if (schoolFilter) {
      suspiciousUsers = await db.$queryRawUnsafe(`
        SELECT 
          a.userId,
          a.role,
          COUNT(DISTINCT a.targetUserId) as unique_targets,
          GROUP_CONCAT(DISTINCT a.resourceType) as resource_types,
          MIN(a.createdAt) as first_access,
          MAX(a.createdAt) as last_access
        FROM AuditLog a
        WHERE a.targetUserId IS NOT NULL
          AND a.targetUserId != ''
          AND a.createdAt >= ?
          AND a.userId IN (SELECT id FROM User WHERE schoolId = ?)
        GROUP BY a.userId, a.role
        HAVING unique_targets >= ?
        ORDER BY unique_targets DESC
      `, since.toISOString(), schoolFilter, threshold) as any[];
    } else {
      suspiciousUsers = await db.$queryRawUnsafe(`
        SELECT 
          a.userId,
          a.role,
          COUNT(DISTINCT a.targetUserId) as unique_targets,
          GROUP_CONCAT(DISTINCT a.resourceType) as resource_types,
          MIN(a.createdAt) as first_access,
          MAX(a.createdAt) as last_access
        FROM AuditLog a
        WHERE a.targetUserId IS NOT NULL
          AND a.targetUserId != ''
          AND a.createdAt >= ?
        GROUP BY a.userId, a.role
        HAVING unique_targets >= ?
        ORDER BY unique_targets DESC
      `, since.toISOString(), threshold) as any[];
    }

    // Enrich with user names
    const enriched = await Promise.all(suspiciousUsers.map(async (row: any) => {
      const user = await db.user.findUnique({ 
        where: { id: row.userId }, 
        select: { name: true, school: { select: { name: true } } } 
      });
      return {
        userId: row.userId,
        userName: user?.name || 'Unknown',
        schoolName: (user as any)?.school?.name || 'Unknown',
        role: row.role,
        uniqueTargetsAccessed: row.unique_targets,
        resourceTypes: row.resource_types,
        firstAccess: row.first_access,
        lastAccess: row.last_access,
        windowMinutes,
        threshold,
      };
    }));

    // Query 2: Count of denied access attempts in the window
    const deniedCount = await db.auditLog.count({
      where: {
        logStatus: 'denied',
        createdAt: { gte: since },
      },
    });

    // Query 3: Top denied access by userId
    const topDenied = await db.$queryRawUnsafe(`
      SELECT userId, role, COUNT(*) as deny_count
      FROM AuditLog
      WHERE logStatus = 'denied' AND createdAt >= ?
      GROUP BY userId, role
      ORDER BY deny_count DESC
      LIMIT 10
    `, since.toISOString()) as any[];

    // Query 4: Total AuditLog entries
    const totalEntries = await db.auditLog.count();

    return NextResponse.json({
      scanWindow: {
        since: since.toISOString(),
        windowMinutes,
        threshold,
      },
      suspiciousAccess: enriched,
      summary: {
        totalSuspiciousUsers: enriched.length,
        deniedAccessTotal: deniedCount,
        totalAuditLogEntries: totalEntries,
      },
      topDeniedAccess: topDenied.map((r: any) => ({
        userId: r.userId,
        role: r.role,
        denyCount: r.deny_count,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Audit anomaly check error:', error);
    return NextResponse.json({ error: 'Gagal memeriksa anomali akses' }, { status: 500 });
  }
}
