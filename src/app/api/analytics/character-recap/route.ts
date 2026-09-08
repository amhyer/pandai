import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, AuthError } from '@/lib/auth';
import { HABIT_LABELS } from '@/lib/pdf-report';

/**
 * GET /api/analytics/character-recap
 * Rekap 7 Kebiasaan Anak Indonesia Hebat.
 *
 * - GURU / KEPALA_SEKOLAH / ADMIN_SCHOOL: rekap sekolah (?classId= opsional,
 *   ?from=YYYY-MM-DD & ?to=YYYY-MM-DD opsional, default 30 hari terakhir)
 * - SISWA / ORANG_TUA: rekap diri/anak (?studentId untuk ortu)
 */

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const studentIdParam = searchParams.get('studentId');

    // Default rentang: 30 hari terakhir
    const defaultFrom = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const rangeFrom = from ?? defaultFrom;
    const rangeTo = to ?? new Date().toISOString().slice(0, 10);

    const where: Record<string, unknown> = { date: { gte: rangeFrom, lte: rangeTo } };

    if (auth.role === 'SISWA') {
      where.studentId = auth.userId;
    } else if (auth.role === 'ORANG_TUA') {
      if (!studentIdParam) {
        return NextResponse.json({ error: 'studentId diperlukan' }, { status: 400 });
      }
      const child = await db.user.findFirst({
        where: { id: studentIdParam, parentId: auth.userId, role: 'SISWA' },
        select: { id: true },
      });
      if (!child) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      where.studentId = studentIdParam;
    } else {
      // GURU / KEPALA_SEKOLAH / ADMIN_SCHOOL / SUPER_ADMIN
      if (auth.schoolId && auth.role !== 'SUPER_ADMIN') {
        where.schoolId = auth.schoolId;
      }
      if (classId) where.classId = classId;
    }

    const reports = await db.characterReport.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
        reporter: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 5000,
    });

    // ── Agregasi per kebiasaan ──
    const habitAgg = new Map<string, { count: number; sum: number }>();
    for (const r of reports) {
      const a = habitAgg.get(r.habit) ?? { count: 0, sum: 0 };
      a.count += 1;
      a.sum += r.rating;
      habitAgg.set(r.habit, a);
    }
    const habits = Object.keys(HABIT_LABELS).map((h) => {
      const a = habitAgg.get(h);
      return {
        habit: h,
        label: HABIT_LABELS[h] ?? h,
        average: a ? Math.round((a.sum / a.count) * 10) / 10 : 0,
        count: a?.count ?? 0,
      };
    });

    // ── Per siswa (untuk level sekolah) ──
    const perStudentAgg = new Map<string, { name: string; className: string; sum: number; count: number }>();
    for (const r of reports) {
      const key = r.studentId;
      const s = perStudentAgg.get(key) ?? {
        name: r.student?.name ?? '-',
        className: r.student?.class?.name ?? '',
        sum: 0,
        count: 0,
      };
      s.sum += r.rating;
      s.count += 1;
      perStudentAgg.set(key, s);
    }
    const perStudent = Array.from(perStudentAgg.entries())
      .map(([id, s]) => ({
        studentId: id,
        name: s.name,
        className: s.className,
        average: Math.round((s.sum / Math.max(s.count, 1)) * 10) / 10,
        reportCount: s.count,
      }))
      .sort((a, b) => b.average - a.average);

    // ── Ringkasan ──
    const totalReports = reports.length;
    const activeStudents = perStudent.length;
    const overallAvg = totalReports
      ? Math.round((reports.reduce((p, c) => p + c.rating, 0) / totalReports) * 10) / 10
      : 0;
    const topHabit = habits.reduce<typeof habits[number] | null>((best, h) => {
      if (!h.count) return best;
      return best == null || h.average > best.average ? h : best;
    }, null);
    const focusHabit = habits
      .filter((h) => h.count > 0)
      .reduce<typeof habits[number] | null>((worst, h) => {
        return worst == null || h.average < worst.average ? h : worst;
      }, null);

    return NextResponse.json({
      range: { from: rangeFrom, to: rangeTo },
      summary: {
        totalReports,
        activeStudents,
        overallAverage: overallAvg,
        topHabit: topHabit ? { habit: topHabit.habit, label: topHabit.label, average: topHabit.average } : null,
        focusHabit: focusHabit
          ? { habit: focusHabit.habit, label: focusHabit.label, average: focusHabit.average }
          : null,
      },
      habits,
      perStudent: auth.role === 'SISWA' || auth.role === 'ORANG_TUA' ? [] : perStudent,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/analytics/character-recap', method: 'GET' });
    return NextResponse.json({ error: 'Gagal memuat rekap karakter' }, { status: 500 });
  }
}
