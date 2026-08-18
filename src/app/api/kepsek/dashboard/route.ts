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

    const totalSiswa = await db.user.count({ where: { schoolId, role: 'SISWA', isActive: true } });
    const totalGuru = await db.user.count({ where: { schoolId, role: 'GURU', isActive: true } });
    const totalKelas = await db.class.count({ where: { schoolId } });

    const classes = await db.class.findMany({ where: { schoolId }, orderBy: [{ grade: 'asc' }, { name: 'asc' }] });

    const rekapKelas = await Promise.all(classes.map(async (cls) => {
      const studentCount = await db.user.count({ where: { classId: cls.id, role: 'SISWA', isActive: true } });
      const attendanceRecords = await db.attendance.findMany({ where: { classId: cls.id } });
      let avgKehadiran: number | null = null;
      if (attendanceRecords.length > 0) {
        const hadirCount = attendanceRecords.filter((a) => a.status === 'hadir').length;
        avgKehadiran = Math.round((hadirCount / attendanceRecords.length) * 100);
      }
      const characterRecords = await db.characterReport.findMany({ where: { classId: cls.id } });
      let avgKebiasaan: number | null = null;
      if (characterRecords.length > 0) {
        avgKebiasaan = Math.round((characterRecords.reduce((sum, r) => sum + r.rating, 0) / characterRecords.length) * 100) / 100;
      }
      const extScores = await db.externalQuizScore.findMany({ where: { classId: cls.id }, select: { score: true } });
      let avgNilai: number | null = null;
      if (extScores.length > 0) {
        avgNilai = Math.round((extScores.reduce((sum, s) => sum + s.score, 0) / extScores.length) * 100) / 100;
      }
      return { className: cls.name, classId: cls.id, studentCount, avgKehadiran, avgNilai, avgKebiasaan };
    }));

    const gurus = await db.user.findMany({ where: { schoolId, role: 'GURU', isActive: true }, orderBy: { name: 'asc' } });
    const rekapGuru = await Promise.all(gurus.map(async (guru) => ({
      teacherName: guru.name, teacherId: guru.id, nip: guru.nip || null,
      kehadiranMengajar: await db.teachingJournal.count({ where: { teacherId: guru.id } }),
      jumlahMateri: await db.material.count({ where: { teacherId: guru.id, type: 'materi' } }),
      jumlahKuis: await db.material.count({ where: { teacherId: guru.id, type: 'quiz' } }),
      jumlahTugas: await db.material.count({ where: { teacherId: guru.id, type: 'tugas' } }),
    })));

    const allReports = await db.characterReport.findMany({ where: { schoolId } });
    const habitMap = new Map<string, { totalRating: number; count: number }>();
    for (const report of allReports) {
      const existing = habitMap.get(report.habit) || { totalRating: 0, count: 0 };
      existing.totalRating += report.rating; existing.count += 1;
      habitMap.set(report.habit, existing);
    }
    const rekapKebiasaan = Object.entries(SEVEN_HABIT_LABELS).map(([habitKey, habitInfo]) => {
      const data = habitMap.get(habitKey);
      return { habitId: habitKey, habitName: habitInfo.name, avgRating: data ? Math.round((data.totalRating / data.count) * 100) / 100 : null, reportCount: data ? data.count : 0 };
    });

    const rekapKebiasaanPerKelas = await Promise.all(classes.map(async (cls) => {
      const classReports = await db.characterReport.findMany({ where: { classId: cls.id } });
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
    }));

    const allAttendance = await db.attendance.findMany({ where: { schoolId } });
    let overallAvgKehadiran: number | null = null;
    if (allAttendance.length > 0) {
      overallAvgKehadiran = Math.round((allAttendance.filter((a) => a.status === 'hadir').length / allAttendance.length) * 100);
    }

    return NextResponse.json({ schoolInfo: { schoolName: school.name, totalSiswa, totalGuru, totalKelas, overallAvgKehadiran }, rekapKelas, rekapGuru, rekapKebiasaan, rekapKebiasaanPerKelas });
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    await logError({ error, route: '/api/kepala-sekolah/dashboard', method: 'GET' });
    return NextResponse.json({ error: 'Gagal memuat data dashboard' }, { status: 500 });
  }
}
