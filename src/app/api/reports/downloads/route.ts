import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth';

/**
 * GET /api/reports/downloads?studentId=xxx
 *
 * Fetches download history and available reports for a student.
 * Accessible only by ORANG_TUA for their own children,
 * or by SUPER_ADMIN / ADMIN_SCHOOL / GURU for their school's students.
 */
export async function GET(request: NextRequest) {
  let session;
  try {
    session = await requireAuth(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Autentikasi diperlukan' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId diperlukan' },
        { status: 400 }
      );
    }

    // Verify the student exists
    const student = await db.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, schoolId: true, parentId: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Siswa tidak ditemukan' },
        { status: 404 }
      );
    }

    // ORANG_TUA: can only access their own children's reports
    if (session.role === 'ORANG_TUA') {
      if (student.parentId !== session.userId) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses ke laporan siswa ini' },
          { status: 403 }
        );
      }
    }
    // SUPER_ADMIN: can access any school
    // ADMIN_SCHOOL / GURU: can only access their own school's students
    else if (session.role !== 'SUPER_ADMIN') {
      if (student.schoolId !== session.schoolId) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses ke laporan siswa dari sekolah lain' },
          { status: 403 }
        );
      }
    }

    // Fetch attempts data for reports
    const attempts = await db.studentAttempt.findMany({
      where: { userId: studentId },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        examPackageId: true,
        percentage: true,
        totalCorrect: true,
        totalWrong: true,
        totalUnanswered: true,
        status: true,
        submittedAt: true,
      },
    });

    // Fetch attendance data
    const attendance = await db.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      take: 30,
      select: {
        id: true,
        date: true,
        status: true,
      },
    });

    // Fetch character reports
    const charReports = await db.characterReport.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        id: true,
        habit: true,
        rating: true,
        date: true,
        note: true,
      },
    });

    // Build download list from available data
    const downloads = [
      // Attempt-based score reports
      ...attempts.map((a, idx) => ({
        id: `attempt-${a.id}`,
        fileName: `Laporan_Skor_${idx + 1}_${a.submittedAt ? new Date(a.submittedAt).toISOString().split('T')[0] : 'belum'}.pdf`,
        type: 'Laporan Skor Ujian',
        downloadedAt: a.submittedAt ? new Date(a.submittedAt).toISOString().replace('T', ' ').substring(0, 16) : '-',
        status: a.status,
        percentage: a.percentage,
      })),
      // Attendance reports
      ...attendance.length > 0 ? [{
        id: 'attendance-report',
        fileName: `Laporan_Kehadiran_${student.name.replace(/\s+/g, '_')}.pdf`,
        type: 'Laporan Kehadiran',
        downloadedAt: attendance[0].date,
        totalRecords: attendance.length,
        hadir: attendance.filter((a) => a.status === 'hadir').length,
        izin: attendance.filter((a) => a.status === 'izin').length,
        sakit: attendance.filter((a) => a.status === 'sakit').length,
        alpa: attendance.filter((a) => a.status === 'alpa').length,
      }] : [],
      // Character reports
      ...charReports.map((cr) => ({
        id: `char-${cr.id}`,
        fileName: `Laporan_Karakter_${cr.habit}_${cr.date}.pdf`,
        type: `Laporan 7 Kebiasaan - ${cr.habit}`,
        downloadedAt: cr.date,
        rating: cr.rating,
      })),
    ];

    return NextResponse.json({
      downloads,
      studentName: student.name,
      summary: {
        totalAttempts: attempts.length,
        avgScore: attempts.length > 0
          ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
          : 0,
        totalAttendanceRecords: attendance.length,
        totalCharReports: charReports.length,
      },
    });
  } catch (error: any) {
    console.error('Reports downloads error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal mengambil data laporan' },
      { status: 500 }
    );
  }
}
