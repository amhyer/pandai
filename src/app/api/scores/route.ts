import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    // Fetch all attempts for this student
    const attempts = await db.studentAttempt.findMany({
      where: { userId: studentId },
      orderBy: { startedAt: 'desc' },
    });

    if (attempts.length === 0) {
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

    // Use the percentage field directly from StudentAttempt
    const scores = attempts.map(a => Math.round(a.percentage || 0));

    const avgScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    const highScore = Math.max(...scores);
    const totalTryout = attempts.length;

    // Score trend
    const scoreTrend = attempts.map((a, idx) => ({
      label: a.examPackageId ? `Paket ${idx + 1}` : `Tes ${idx + 1}`,
      value: scores[idx],
    }));

    // Recent scores
    const recentScores = attempts.map((a, idx) => ({
      id: a.id,
      examName: a.examPackageId ? `Paket ${idx + 1}` : `Tes ${idx + 1}`,
      date: a.submittedAt
        ? new Date(a.submittedAt).toISOString().split('T')[0]
        : new Date(a.startedAt).toISOString().split('T')[0],
      score: scores[idx],
      status: scores[idx] >= 70 ? 'Lulus' : 'Belum Lulus',
    }));

    // Class rank estimation
    const classId = attempts[0].classId;
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
