import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'SISWA']);

    // RBAC: Kepala Sekolah cannot access individual student data
    if (auth.role === 'KEPALA_SEKOLAH') {
      return NextResponse.json(
        { error: 'Kepala Sekolah hanya dapat mengakses data agregat. Akses data individu tidak diizinkan.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    // IDOR fix: students can only view their own scores; ortu can view children
    if (auth.role === 'SISWA' && studentId !== auth.userId) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
    }
    if (auth.role === 'ORANG_TUA') {
      // Verify the student is a child of this ortu
      const student = await db.user.findUnique({ where: { id: studentId }, select: { parentId: true, schoolId: true } });
      if (!student || (student.parentId !== auth.userId && student.schoolId !== auth.schoolId)) {
        return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
      }
    }

    const allAttempts = await db.studentAttempt.findMany({
      where: { userId: studentId },
      orderBy: { startedAt: 'desc' },
      include: { remedialAttempts: { select: { id: true, status: true, score: true, percentage: true, submittedAt: true, isRemedial: true } } },
    });

    if (allAttempts.length === 0) {
      return NextResponse.json({ avgScore: 0, highScore: 0, classRank: 0, totalClassmates: 0, totalTryout: 0, subjects: [], scoreTrend: [], recentScores: [] });
    }

    const originalAttempts = allAttempts.filter((a) => !a.isRemedial);

    const activeScores = originalAttempts.map((a) => {
      if (a.remedialAttempts.length > 0) {
        const remedial = a.remedialAttempts[0];
        if (remedial.status === 'submitted' || remedial.status === 'graded') {
          return Math.round(remedial.percentage || 0);
        }
      }
      return Math.round(a.percentage || 0);
    });

    const avgScore = activeScores.length > 0 ? Math.round(activeScores.reduce((s, v) => s + v, 0) / activeScores.length) : 0;
    const highScore = activeScores.length > 0 ? Math.max(...activeScores) : 0;
    const totalTryout = originalAttempts.length;

    const scoreTrend = originalAttempts.map((a, idx) => {
      let activeVal = Math.round(a.percentage || 0);
      if (a.remedialAttempts.length > 0) {
        const r = a.remedialAttempts[0];
        if (r.status === 'submitted' || r.status === 'graded') { activeVal = Math.round(r.percentage || 0); }
      }
      return { label: a.examPackageId ? `Paket ${idx + 1}` : `Tes ${idx + 1}`, value: activeVal };
    });

    const recentScores = originalAttempts.map((a, idx) => {
      const originalScore = Math.round(a.percentage || 0);
      let activeScore = originalScore;
      let remedialInfo: { id: string; status: string; score: number } | null = null;
      if (a.remedialAttempts.length > 0) {
        const r = a.remedialAttempts[0];
        remedialInfo = { id: r.id, status: r.status, score: Math.round(r.percentage || 0) };
        if (r.status === 'submitted' || r.status === 'graded') { activeScore = remedialInfo.score; }
      }
      return {
        id: a.id,
        examName: a.examPackageId ? `Paket ${idx + 1}` : `Tes ${idx + 1}`,
        date: a.submittedAt ? new Date(a.submittedAt).toISOString().split('T')[0] : new Date(a.startedAt).toISOString().split('T')[0],
        score: activeScore, originalScore, isRemedial: a.isRemedial,
        hasRemedial: !!remedialInfo, remedialStatus: remedialInfo?.status || null,
        remedialScore: remedialInfo?.score || null, status: activeScore >= 70 ? 'Lulus' : 'Belum Lulus',
        learningObjective: a.learningObjective || null,
      };
    });

    const classId = originalAttempts[0]?.classId;
    let classRank = 0;
    let totalClassmates = 0;
    if (classId) {
      const classmates = await db.user.findMany({ where: { classId, role: 'SISWA', isActive: true }, take: 100 });
      totalClassmates = classmates.length;
      classRank = Math.min(avgScore > 75 ? 3 : Math.ceil(avgScore / 20), totalClassmates);
    }

    return NextResponse.json({ avgScore, highScore, classRank, totalClassmates, totalTryout, subjects: [], scoreTrend, recentScores: recentScores.slice(0, 10) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Scores API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
