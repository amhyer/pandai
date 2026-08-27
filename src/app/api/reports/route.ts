import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

// ── helpers ──────────────────────────────────────────────────────────

function generateReportId(): string {
  return `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildCsv(columns: string[], rows: (string | number | null)[][]): string {
  const header = columns.map(escapeCsvField).join(',');
  const dataRows = rows.map((r) => r.map(escapeCsvField).join(','));
  return [header, ...dataRows].join('\n');
}

function escapeCsvField(val: string | number | null): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── GET /api/reports — list recent report generations ────────────────

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);

    const { searchParams } = new URL(req.url);
    const globalFlag = searchParams.get('global') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const where: Record<string, unknown> = {
      action: 'generate_report',
      module: 'reports',
    };

    if (!globalFlag || user.role !== 'SUPER_ADMIN') {
      where.schoolId = user.schoolId;
    }

    const logs = await db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Enrich with user name
    const enriched = await Promise.all(
      logs.map(async (log) => {
        let userName: string | null = null;
        if (log.userId) {
          const u = await db.user.findUnique({
            where: { id: log.userId },
            select: { name: true },
          });
          userName = u?.name ?? null;
        }
        // Parse detail JSON for report metadata
        let detail: { type?: string; reportId?: string } = {};
        try {
          detail = JSON.parse(log.detail || '{}');
        } catch {
          // ignore parse error
        }
        return {
          id: log.id,
          reportId: detail.reportId,
          type: detail.type,
          generatedBy: userName,
          schoolId: log.schoolId,
          createdAt: log.createdAt,
        };
      })
    );

    return NextResponse.json({ data: enriched, total: enriched.length });
  } catch (err) {
    console.error('GET /api/reports error:', err);
    return NextResponse.json(
      { error: 'Gagal mengambil daftar laporan' },
      { status: 500 }
    );
  }
}

// ── POST /api/reports — generate a report ────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);

    const { searchParams } = new URL(req.url);
    const globalFlag = searchParams.get('global') === 'true';

    const body = await req.json();
    const { type, schoolId, classId, subjectId } = body as {
      type: string;
      schoolId?: string;
      classId?: string;
      subjectId?: string;
    };

    if (!type || !['school', 'tryout', 'nilai_siswa', 'attendance', 'financial'].includes(type)) {
      return NextResponse.json(
        { error: `Tipe laporan '${type}' tidak valid. Pilih: school, tryout, nilai_siswa` },
        { status: 400 }
      );
    }

    // ── Unsupported types ──
    if (type === 'attendance') {
      return NextResponse.json({
        error: "Tipe laporan 'attendance' belum didukung. Data kehadiran tersedia tetapi generasi laporan belum diimplementasikan.",
        unsupportedType: true,
      });
    }
    if (type === 'financial') {
      return NextResponse.json({
        error: "Tipe laporan 'financial' belum didukung. Data pembayaran/transaksi belum tersedia.",
        unsupportedType: true,
      });
    }

    // Determine effective schoolId
    const effectiveSchoolId =
      user.role === 'SUPER_ADMIN' && globalFlag ? undefined : (schoolId || user.schoolId);

    const reportId = generateReportId();
    const generatedAt = new Date().toISOString();
    let columns: string[] = [];
    let rows: (string | number | null)[][] = [];

    // ────────────────────────────────────────────────────────────────
    // ADMIN_SCHOOL reports
    // ────────────────────────────────────────────────────────────────
    if (user.role === 'ADMIN_SCHOOL') {
      if (!effectiveSchoolId) {
        return NextResponse.json(
          { error: 'schoolId diperlukan' },
          { status: 400 }
        );
      }

      // ── nilai_siswa ──
      if (type === 'nilai_siswa') {
        columns = ['Nama Siswa', 'Total Tryout', 'Rata-rata Skor', 'Rata-rata Persentase'];

        const attempts = await db.studentAttempt.findMany({
          where: { schoolId: effectiveSchoolId, classId: classId || undefined },
          select: { userId: true, score: true, percentage: true },
        });

        // Group by userId
        const grouped = new Map<string, { scores: number[]; percentages: number[] }>();
        for (const a of attempts) {
          if (!grouped.has(a.userId)) {
            grouped.set(a.userId, { scores: [], percentages: [] });
          }
          const g = grouped.get(a.userId)!;
          g.scores.push(a.score);
          g.percentages.push(a.percentage);
        }

        // Get user names
        const userIds = [...grouped.keys()];
        const users =
          userIds.length > 0
            ? await db.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true },
              })
            : [];
        const userMap = new Map(users.map((u) => [u.id, u.name]));

        for (const [uid, data] of grouped) {
          const avgScore =
            data.scores.length > 0
              ? round1(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
              : 0;
          const avgPct =
            data.percentages.length > 0
              ? round1(data.percentages.reduce((s, v) => s + v, 0) / data.percentages.length)
              : 0;
          rows.push([userMap.get(uid) || uid, data.scores.length, avgScore, avgPct]);
        }

        // Also include students with no attempts
        if (!classId) {
          // get all siswa in school
          const allSiswa = await db.user.findMany({
            where: { schoolId: effectiveSchoolId, role: 'SISWA' },
            select: { id: true, name: true },
          });
          for (const s of allSiswa) {
            if (!grouped.has(s.id)) {
              rows.push([s.name, 0, 0, 0]);
            }
          }
        } else {
          const allSiswa = await db.user.findMany({
            where: { schoolId: effectiveSchoolId, role: 'SISWA', classId },
            select: { id: true, name: true },
          });
          for (const s of allSiswa) {
            if (!grouped.has(s.id)) {
              rows.push([s.name, 0, 0, 0]);
            }
          }
        }

        // Sort by name
        rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      }

      // ── tryout ──
      if (type === 'tryout') {
        columns = ['Paket Tryout', 'Total Sesi', 'Total Percobaan', 'Rata-rata Skor'];

        const sessions = await db.examSession.findMany({
          where: { schoolId: effectiveSchoolId },
          include: { examPackage: { select: { title: true } } },
        });

        // Group sessions by examPackageId
        const pkgSessions = new Map<string, { title: string; sessionIds: string[] }>();
        for (const s of sessions) {
          if (!pkgSessions.has(s.examPackageId)) {
            pkgSessions.set(s.examPackageId, { title: s.examPackage.title, sessionIds: [] });
          }
          pkgSessions.get(s.examPackageId)!.sessionIds.push(s.id);
        }

        const sessionIds = sessions.map((s) => s.id);
        const attempts =
          sessionIds.length > 0
            ? await db.studentAttempt.findMany({
                where: { examSessionId: { in: sessionIds } },
                select: { examSessionId: true, score: true },
              })
            : [];

        for (const [pkgId, info] of pkgSessions) {
          const pkgAttempts = attempts.filter((a) => info.sessionIds.includes(a.examSessionId || ''));
          const avgScore =
            pkgAttempts.length > 0
              ? round1(pkgAttempts.reduce((s, a) => s + a.score, 0) / pkgAttempts.length)
              : 0;
          rows.push([info.title, info.sessionIds.length, pkgAttempts.length, avgScore]);
        }
      }
    }

    // ────────────────────────────────────────────────────────────────
    // SUPER_ADMIN reports (global)
    // ────────────────────────────────────────────────────────────────
    if (user.role === 'SUPER_ADMIN') {

      // ── school (global overview) ──
      if (type === 'school') {
        columns = [
          'Sekolah',
          'Siswa',
          'Guru',
          'Total Tryout',
          'Total Tugas',
          'Rata-rata Skor',
        ];

        const schools = await db.school.findMany({
          select: { id: true, name: true },
        });

        for (const school of schools) {
          const [siswaCount, guruCount, attemptCount, assignmentCount, avgScoreResult] =
            await Promise.all([
              db.user.count({ where: { schoolId: school.id, role: 'SISWA' } }),
              db.user.count({ where: { schoolId: school.id, role: 'GURU' } }),
              db.studentAttempt.count({ where: { schoolId: school.id } }),
              db.assignment.count({ where: { schoolId: school.id } }),
              db.studentAttempt.aggregate({
                where: { schoolId: school.id },
                _avg: { score: true },
              }),
            ]);

          const avgScore = round1(avgScoreResult._avg.score ?? 0);
          rows.push([
            school.name,
            siswaCount,
            guruCount,
            attemptCount,
            assignmentCount,
            avgScore,
          ]);
        }
      }

      // ── tryout (global) ──
      if (type === 'tryout') {
        columns = ['Sekolah', 'Total Sesi Tryout', 'Total Percobaan', 'Rata-rata Skor'];

        const schools = await db.school.findMany({
          select: { id: true, name: true },
        });

        for (const school of schools) {
          const [sessionCount, attemptResult] = await Promise.all([
            db.examSession.count({ where: { schoolId: school.id } }),
            db.studentAttempt.aggregate({
              where: { schoolId: school.id },
              _count: true,
              _avg: { score: true },
            }),
          ]);

          const totalAttempts = attemptResult._count;
          const avgScore = round1(attemptResult._avg.score ?? 0);
          rows.push([school.name, sessionCount, totalAttempts, avgScore]);
        }
      }

      // ── nilai_siswa for SUPER_ADMIN (requires schoolId) ──
      if (type === 'nilai_siswa') {
        if (!effectiveSchoolId) {
          return NextResponse.json(
            { error: 'schoolId diperlukan untuk laporan nilai siswa' },
            { status: 400 }
          );
        }

        columns = ['Nama Siswa', 'Total Tryout', 'Rata-rata Skor', 'Rata-rata Persentase'];

        const attempts = await db.studentAttempt.findMany({
          where: { schoolId: effectiveSchoolId, classId: classId || undefined },
          select: { userId: true, score: true, percentage: true },
        });

        const grouped = new Map<string, { scores: number[]; percentages: number[] }>();
        for (const a of attempts) {
          if (!grouped.has(a.userId)) {
            grouped.set(a.userId, { scores: [], percentages: [] });
          }
          const g = grouped.get(a.userId)!;
          g.scores.push(a.score);
          g.percentages.push(a.percentage);
        }

        const userIds = [...grouped.keys()];
        const users =
          userIds.length > 0
            ? await db.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true },
              })
            : [];
        const userMap = new Map(users.map((u) => [u.id, u.name]));

        for (const [uid, data] of grouped) {
          const avgScore =
            data.scores.length > 0
              ? round1(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
              : 0;
          const avgPct =
            data.percentages.length > 0
              ? round1(data.percentages.reduce((s, v) => s + v, 0) / data.percentages.length)
              : 0;
          rows.push([userMap.get(uid) || uid, data.scores.length, avgScore, avgPct]);
        }

        // Include students with no attempts
        const siswaWhere: Record<string, unknown> = { schoolId: effectiveSchoolId, role: 'SISWA' };
        if (classId) siswaWhere.classId = classId;
        const allSiswa = await db.user.findMany({
          where: siswaWhere,
          select: { id: true, name: true },
        });
        for (const s of allSiswa) {
          if (!grouped.has(s.id)) {
            rows.push([s.name, 0, 0, 0]);
          }
        }

        rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      }
    }

    // ── Build CSV ──
    const csv = buildCsv(columns, rows);

    // ── Log to ActivityLog ──
    await db.activityLog.create({
      data: {
        userId: user.userId,
        schoolId: effectiveSchoolId || user.schoolId || null,
        action: 'generate_report',
        module: 'reports',
        detail: JSON.stringify({ type, reportId }),
      },
    });

    return NextResponse.json({
      reportId,
      type,
      generatedAt,
      generatedBy: user.userId,
      status: 'Selesai',
      columns,
      rows,
      csv,
    });
  } catch (err) {
    console.error('POST /api/reports error:', err);
    return NextResponse.json(
      { error: 'Gagal menghasilkan laporan' },
      { status: 500 }
    );
  }
}
