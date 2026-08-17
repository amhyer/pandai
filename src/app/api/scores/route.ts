import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // RBAC: Kepala Sekolah cannot access individual student data
    const role = req.headers.get('X-User-Role');
    if (role === 'KEPALA_SEKOLAH') {
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

    // Fetch ALL attempts (both original and remedial) for enrichment
    const allAttempts = await db.studentAttempt.findMany({
      where: { userId: studentId },
      orderBy: { startedAt: 'desc' },
      include: {
        remedialAttempts: { select: { id: true, status: true, score: true, percentage: true, submittedAt: true, isRemedial: true } },
      },
    });

    if (allAttempts.length === 0) {
      return NextResponse.json({
        avgScore: 0,
        highScore: 0,
        classRank: 0,
        totalClassmates: 0,
        totalTryout: 0,
        subjects: [],
        scoreTrend: [],
        recentScores: [],
      });
    }

    // Separate original attempts from remedial ones for stats
    // For stats/ranking: use only ORIGINAL attempts (exclude remedial to avoid double-counting)
    // But if original has remedial, use remedial score as the "active" score
    const originalAttempts = allAttempts.filter((a) => !a.isRemedial);

    // Build active scores: for each original attempt, determine the effective score
    const activeScores = originalAttempts.map((a) => {
      if (a.remedialAttempts.length > 0) {
        const remedial = a.remedialAttempts[0];
        // If remedial is submitted/graded, use remedial score; otherwise original
        if (remedial.status === 'submitted' || remedial.status === 'graded') {
          return Math.round(remedial.percentage || 0);
        }
      }
      return Math.round(a.percentage || 0);
    });

    const avgScore = activeScores.length > 0
      ? Math.round(activeScores.reduce((s, v) => s + v, 0) / activeScores.length)
      : 0;
    const highScore = activeScores.length > 0 ? Math.max(...activeScores) : 0;
    const totalTryout = originalAttempts.length;

    // Score trend (only originals, with active score shown)
    const scoreTrend = originalAttempts.map((a, idx) => {
      let activeVal = Math.round(a.percentage || 0);
      if (a.remedialAttempts.length > 0) {
        const r = a.remedialAttempts[0];
        if (r.status === 'submitted' || r.status === 'graded') {
          activeVal = Math.round(r.percentage || 0);
        }
      }
      return {
        label: a.examPackageId ? `Paket ${idx + 1}` : `Tes ${idx + 1}`,
        value: activeVal,
      };
    });

    // Recent scores with remedial info
    const recentScores = originalAttempts.map((a, idx) => {
      const originalScore = Math.round(a.percentage || 0);
      let activeScore = originalScore;
      let remedialInfo: { id: string; status: string; score: number } | null = null;

      if (a.remedialAttempts.length > 0) {
        const r = a.remedialAttempts[0];
        remedialInfo = {
          id: r.id,
          status: r.status,
          score: Math.round(r.percentage || 0),
        };
        if (r.status === 'submitted' || r.status === 'graded') {
          activeScore = remedialInfo.score;
        }
      }

      return {
        id: a.id,
        examName: a.examPackageId ? `Paket ${idx + 1}` : `Tes ${idx + 1}`,
        date: a.submittedAt
          ? new Date(a.submittedAt).toISOString().split('T')[0]
          : new Date(a.startedAt).toISOString().split('T')[0],
        score: activeScore, // nilai yang berlaku (remedial jika ada & submitted)
        originalScore, // nilai asli sebelum remedial
        isRemedial: a.isRemedial,
        hasRemedial: !!remedialInfo,
        remedialStatus: remedialInfo?.status || null,
        remedialScore: remedialInfo?.score || null,
        status: activeScore >= 70 ? 'Lulus' : 'Belum Lulus',
        learningObjective: a.learningObjective || null,
      };
    });

    // Class rank estimation
    const classId = originalAttempts[0]?.classId;
    let classRank = 0;
    let totalClassmates = 0;

    if (classId) {
      const classmates = await db.user.findMany({
        where: { classId, role: 'SISWA', isActive: true },
      });
      totalClassmates = classmates.length;
      classRank = Math.min(avgScore > 75 ? 3 : Math.ceil(avgScore / 20), totalClassmates);
    }

    return NextResponse.json({
      avgScore,
      highScore,
      classRank,
      totalClassmates,
      totalTryout,
      subjects: [],
      scoreTrend,
      recentScores: recentScores.slice(0, 10),
    });
  } catch (error) {
    console.error('Scores API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
