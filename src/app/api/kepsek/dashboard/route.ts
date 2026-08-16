import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';

// 7 Kebiasaan labels (mirrored from character-reports)
const SEVEN_HABIT_LABELS: Record<string, { name: string }> = {
  bangun_pagi:    { name: 'Bangun Pagi' },
  beribadah:      { name: 'Beribadah' },
  berolahraga:    { name: 'Berolahraga' },
  makan_sehat:    { name: 'Makan Sehat dan Bergizi' },
  gemar_belajar:  { name: 'Gemar Belajar' },
  bermasyarakat:  { name: 'Bermasyarakat' },
  tidur_cepat:    { name: 'Tidur Cepat' },
};

// GET /api/kepala-sekolah/dashboard?schoolId=...
// Returns aggregated data for the school — NO individual student data
export async function GET(req: NextRequest) {
  try {
    // ── Auth: only KEPALA_SEKOLAH and SUPER_ADMIN ──
    const role = req.headers.get('X-User-Role');
    if (role !== 'KEPALA_SEKOLAH' && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya Kepala Sekolah dan Super Admin yang dapat mengakses dashboard ini.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId') || req.headers.get('X-School-Id');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 });
    }

    // ── schoolInfo ──
    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 });
    }

    const totalSiswa = await db.user.count({ where: { schoolId, role: 'SISWA', isActive: true } });
    const totalGuru = await db.user.count({ where: { schoolId, role: 'GURU', isActive: true } });
    const totalKelas = await db.class.count({ where: { schoolId } });

    // ── rekapKelas ──
    const classes = await db.class.findMany({
      where: { schoolId },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    });

    const rekapKelas = await Promise.all(
      classes.map(async (cls) => {
        // Student count
        const studentCount = await db.user.count({
          where: { classId: cls.id, role: 'SISWA', isActive: true },
        });

        // Average attendance (hadir / total * 100)
        const attendanceRecords = await db.attendance.findMany({
          where: { classId: cls.id },
        });
        let avgKehadiran: number | null = null;
        if (attendanceRecords.length > 0) {
          const hadirCount = attendanceRecords.filter((a) => a.status === 'hadir').length;
          avgKehadiran = Math.round((hadirCount / attendanceRecords.length) * 100);
        }

        // Average kebiasaan (CharacterReport) for this class
        const characterRecords = await db.characterReport.findMany({
          where: { classId: cls.id },
        });
        let avgKebiasaan: number | null = null;
        if (characterRecords.length > 0) {
          const totalRating = characterRecords.reduce((sum, r) => sum + r.rating, 0);
          avgKebiasaan = Math.round((totalRating / characterRecords.length) * 100) / 100;
        }

        // Average nilai from ExternalQuizScore for students in this class
        const studentIds = (await db.user.findMany({
          where: { classId: cls.id, role: 'SISWA', isActive: true },
          select: { id: true },
        })).map((s) => s.id);

        let avgNilai: number | null = null;
        if (studentIds.length > 0) {
          const extScores = await db.externalQuizScore.findMany({
            where: { classId: cls.id },
            select: { score: true },
          });
          if (extScores.length > 0) {
            const totalScore = extScores.reduce((sum, s) => sum + s.score, 0);
            avgNilai = Math.round((totalScore / extScores.length) * 100) / 100;
          }
        }

        return {
          className: cls.name,
          classId: cls.id,
          studentCount,
          avgKehadiran,
          avgNilai,
          avgKebiasaan,
        };
      })
    );

    // ── rekapGuru ──
    const gurus = await db.user.findMany({
      where: { schoolId, role: 'GURU', isActive: true },
      orderBy: { name: 'asc' },
    });

    const rekapGuru = await Promise.all(
      gurus.map(async (guru) => {
        const kehadiranMengajar = await db.teachingJournal.count({
          where: { teacherId: guru.id },
        });
        const jumlahMateri = await db.material.count({
          where: { teacherId: guru.id, type: 'materi' },
        });
        const jumlahKuis = await db.material.count({
          where: { teacherId: guru.id, type: 'quiz' },
        });
        const jumlahTugas = await db.material.count({
          where: { teacherId: guru.id, type: 'tugas' },
        });

        return {
          teacherName: guru.name,
          teacherId: guru.id,
          nip: guru.nip || null,
          kehadiranMengajar,
          jumlahMateri,
          jumlahKuis,
          jumlahTugas,
        };
      })
    );

    // ── rekapKebiasaan (school-wide) ──
    const allReports = await db.characterReport.findMany({
      where: { schoolId },
    });

    // Group by habit
    const habitMap = new Map<string, { totalRating: number; count: number }>();
    for (const report of allReports) {
      const existing = habitMap.get(report.habit) || { totalRating: 0, count: 0 };
      existing.totalRating += report.rating;
      existing.count += 1;
      habitMap.set(report.habit, existing);
    }

    const rekapKebiasaan = Object.entries(SEVEN_HABIT_LABELS).map(([habitKey, habitInfo]) => {
      const data = habitMap.get(habitKey);
      return {
        habitId: habitKey,
        habitName: habitInfo.name,
        avgRating: data ? Math.round((data.totalRating / data.count) * 100) / 100 : null,
        reportCount: data ? data.count : 0,
      };
    });

    // ── rekapKebiasaanPerKelas (per-class 7 kebiasaan breakdown) ──
    const rekapKebiasaanPerKelas = await Promise.all(
      classes.map(async (cls) => {
        const classReports = await db.characterReport.findMany({
          where: { classId: cls.id },
        });

        const classHabitMap = new Map<string, { totalRating: number; count: number }>();
        for (const report of classReports) {
          const existing = classHabitMap.get(report.habit) || { totalRating: 0, count: 0 };
          existing.totalRating += report.rating;
          existing.count += 1;
          classHabitMap.set(report.habit, existing);
        }

        const habits = Object.entries(SEVEN_HABIT_LABELS).map(([habitKey, habitInfo]) => {
          const data = classHabitMap.get(habitKey);
          return {
            habitId: habitKey,
            habitName: habitInfo.name,
            avgRating: data ? Math.round((data.totalRating / data.count) * 100) / 100 : null,
            reportCount: data ? data.count : 0,
          };
        });

        const totalReports = classReports.length;
        const totalRating = classReports.reduce((sum, r) => sum + r.rating, 0);

        return {
          className: cls.name,
          classId: cls.id,
          totalReports,
          avgOverall: totalReports > 0 ? Math.round((totalRating / totalReports) * 100) / 100 : null,
          habits,
        };
      })
    );

    // ── Overall average kehadiran ──
    const allAttendance = await db.attendance.findMany({
      where: { schoolId },
    });
    let overallAvgKehadiran: number | null = null;
    if (allAttendance.length > 0) {
      const hadirCount = allAttendance.filter((a) => a.status === 'hadir').length;
      overallAvgKehadiran = Math.round((hadirCount / allAttendance.length) * 100);
    }

    return NextResponse.json({
      schoolInfo: {
        schoolName: school.name,
        totalSiswa,
        totalGuru,
        totalKelas,
        overallAvgKehadiran,
      },
      rekapKelas,
      rekapGuru,
      rekapKebiasaan,
      rekapKebiasaanPerKelas,
    });
  } catch (error) {
    await logError({ error, route: '/api/kepala-sekolah/dashboard', method: 'GET' });
    console.error('Kepala Sekolah Dashboard error:', error);
    return NextResponse.json({ error: 'Gagal memuat data dashboard' }, { status: 500 });
  }
}
