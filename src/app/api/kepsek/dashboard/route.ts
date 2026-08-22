import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';

const SEVEN_HABIT_LABELS: Record<string, { name: string }> = {
  bangun_pagi: { name: 'Bangun Pagi' }, beribadah: { name: 'Beribadah' }, berolahraga: { name: 'Berolahraga' },
  makan_sehat: { name: 'Makan Sehat dan Bergizi' }, gemar_belajar: { name: 'Gemar Belajar' },
  bermasyarakat: { name: 'Bermasyarakat' }, tidur_cepat: { name: 'Tidur Cepat' },
};

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['KEPALA_SEKOLAH', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId') || auth.schoolId;

    if (!schoolId) { return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 }); }

    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) { return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 }); }

    // Phase 1: All independent queries (no dependency on classIds/guruIds)
    const [totalSiswa, totalGuru, totalKelas, classes, gurus] = await Promise.all([
      db.user.count({ where: { schoolId, role: 'SISWA', isActive: true } }),
      db.user.count({ where: { schoolId, role: 'GURU', isActive: true } }),
      db.class.count({ where: { schoolId } }),
      db.class.findMany({ where: { schoolId }, orderBy: [{ grade: 'asc' }, { name: 'asc' }] }),
      db.user.findMany({ where: { schoolId, role: 'GURU', isActive: true }, orderBy: { name: 'asc' } }),
    ]);

    const classIds = classes.map(c => c.id);
    const guruIds = gurus.map(g => g.id);

    // Phase 2: Batched queries using classIds/guruIds (6 queries instead of N*4 + M*4 + N)
    const [
      studentCountsByClass,
      attendanceRecords,
      characterRecords,
      extScoreRecords,
      journalCounts,
      materialCounts,
    ] = await Promise.all([
      db.user.groupBy({
        by: ['classId'],
        where: { classId: { in: classIds }, role: 'SISWA', isActive: true },
        _count: true,
      }),
      db.attendance.findMany({
        where: { classId: { in: classIds } },
        select: { classId: true, status: true },
      }),
      db.characterReport.findMany({
        where: { classId: { in: classIds } },
        select: { classId: true, habit: true, rating: true },
      }),
      db.externalQuizScore.findMany({
        where: { classId: { in: classIds } },
        select: { classId: true, score: true },
      }),
      db.teachingJournal.groupBy({
        by: ['teacherId'],
        where: { teacherId: { in: guruIds } },
        _count: true,
      }),
      db.material.groupBy({
        by: ['teacherId', 'type'],
        where: { teacherId: { in: guruIds } },
        _count: true,
      }),
    ]);

    // Build lookup maps from batched results

    const studentCountMap = new Map(studentCountsByClass.map(r => [r.classId, r._count._all]));

    const attendanceByClass = new Map<string, { hadir: number; total: number }>();
    for (const a of attendanceRecords) {
      const entry = attendanceByClass.get(a.classId) || { hadir: 0, total: 0 };
      entry.total += 1;
      if (a.status === 'hadir') entry.hadir += 1;
      attendanceByClass.set(a.classId, entry);
    }

    // Overall attendance derived from the same batch (replaces separate allAttendance query)
    let overallAvgKehadiran: number | null = null;
    if (attendanceRecords.length > 0) {
      overallAvgKehadiran = Math.round((attendanceRecords.filter(a => a.status === 'hadir').length / attendanceRecords.length) * 100);
    }

    // Character reports grouped by class (reused for rekapKelas, rekapKebiasaan, and rekapKebiasaanPerKelas)
    const characterByClass = new Map<string, Array<{ habit: string; rating: number }>>();
    for (const r of characterRecords) {
      const arr = characterByClass.get(r.classId) || [];
      arr.push({ habit: r.habit, rating: r.rating });
      characterByClass.set(r.classId, arr);
    }

    const extScoresByClass = new Map<string, number[]>();
    for (const s of extScoreRecords) {
      const arr = extScoresByClass.get(s.classId) || [];
      arr.push(s.score);
      extScoresByClass.set(s.classId, arr);
    }

    const journalCountMap = new Map(journalCounts.map(r => [r.teacherId, r._count._all]));

    const materialCountMap = new Map<string, Map<string, number>>();
    for (const r of materialCounts) {
      if (!materialCountMap.has(r.teacherId)) materialCountMap.set(r.teacherId, new Map());
      materialCountMap.get(r.teacherId)!.set(r.type, r._count._all);
    }

    // Assemble rekapKelas from maps
    const rekapKelas = classes.map(cls => {
      const studentCount = studentCountMap.get(cls.id) || 0;
      const att = attendanceByClass.get(cls.id);
      let avgKehadiran: number | null = null;
      if (att && att.total > 0) {
        avgKehadiran = Math.round((att.hadir / att.total) * 100);
      }
      const charReports = characterByClass.get(cls.id) || [];
      let avgKebiasaan: number | null = null;
      if (charReports.length > 0) {
        avgKebiasaan = Math.round((charReports.reduce((sum, r) => sum + r.rating, 0) / charReports.length) * 100) / 100;
      }
      const scores = extScoresByClass.get(cls.id) || [];
      let avgNilai: number | null = null;
      if (scores.length > 0) {
        avgNilai = Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100;
      }
      return { className: cls.name, classId: cls.id, studentCount, avgKehadiran, avgNilai, avgKebiasaan };
    });

    // Assemble rekapGuru from maps
    const rekapGuru = gurus.map(guru => {
      const types = materialCountMap.get(guru.id) || new Map();
      return {
        teacherName: guru.name, teacherId: guru.id, nip: guru.nip || null,
        kehadiranMengajar: journalCountMap.get(guru.id) || 0,
        jumlahMateri: types.get('materi') || 0,
        jumlahKuis: types.get('quiz') || 0,
        jumlahTugas: types.get('tugas') || 0,
      };
    });

    // School-wide habit summary (from the same batched characterRecords, replaces separate allReports query)
    const habitMap = new Map<string, { totalRating: number; count: number }>();
    for (const report of characterRecords) {
      const existing = habitMap.get(report.habit) || { totalRating: 0, count: 0 };
      existing.totalRating += report.rating; existing.count += 1;
      habitMap.set(report.habit, existing);
    }
    const rekapKebiasaan = Object.entries(SEVEN_HABIT_LABELS).map(([habitKey, habitInfo]) => {
      const data = habitMap.get(habitKey);
      return { habitId: habitKey, habitName: habitInfo.name, avgRating: data ? Math.round((data.totalRating / data.count) * 100) / 100 : null, reportCount: data ? data.count : 0 };
    });

    // Per-class habit breakdown (from the same batched characterRecords, replaces N per-class queries)
    const rekapKebiasaanPerKelas = classes.map(cls => {
      const classReports = characterByClass.get(cls.id) || [];
      const classHabitMap = new Map<string, { totalRating: number; count: number }>();
      for (const report of classReports) {
        const existing = classHabitMap.get(report.habit) || { totalRating: 0, count: 0 };
        existing.totalRating += report.rating; existing.count += 1; classHabitMap.set(report.habit, existing);
      }
      const habits = Object.entries(SEVEN_HABIT_LABELS).map(([habitKey, habitInfo]) => {
        const data = classHabitMap.get(habitKey);
        return { habitId: habitKey, habitName: habitInfo.name, avgRating: data ? Math.round((data.totalRating / data.count) * 100) / 100 : null, reportCount: data ? data.count : 0 };
      });
      const totalReports = classReports.length;
      const totalRating = classReports.reduce((sum, r) => sum + r.rating, 0);
      return { className: cls.name, classId: cls.id, totalReports, avgOverall: totalReports > 0 ? Math.round((totalRating / totalReports) * 100) / 100 : null, habits };
    });

    return NextResponse.json({ schoolInfo: { schoolName: school.name, totalSiswa, totalGuru, totalKelas, overallAvgKehadiran }, rekapKelas, rekapGuru, rekapKebiasaan, rekapKebiasaanPerKelas });
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    await logError({ error, route: '/api/kepala-sekolah/dashboard', method: 'GET' });
    return NextResponse.json({ error: 'Gagal memuat data dashboard' }, { status: 500 });
  }
}
