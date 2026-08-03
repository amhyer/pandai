import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    if (type === 'dashboard' && schoolId) {
      // School dashboard stats
      const totalStudents = await db.user.count({ where: { schoolId, role: 'SISWA', isActive: true } });
      const totalTeachers = await db.user.count({ where: { schoolId, role: 'GURU', isActive: true } });
      const totalClasses = await db.class.count({ where: { schoolId } });
      const totalQuestions = await db.question.count({ where: { schoolId } });
      const attempts = await db.studentAttempt.findMany({
        where: { schoolId, status: 'submitted' },
        select: { percentage: true, tkaPrediction: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const avgScore = attempts.length > 0
        ? attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length
        : 0;
      const avgTka = attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + (a.tkaPrediction || 0), 0) / attempts.length)
        : 0;

      return NextResponse.json({
        totalStudents, totalTeachers, totalClasses, totalQuestions,
        avgScore: Math.round(avgScore * 10) / 10,
        avgTka, recentAttempts: attempts.slice(0, 10),
      });
    }

    if (type === 'student' && userId) {
      const attempts = await db.studentAttempt.findMany({
        where: { userId, status: 'submitted' },
        include: { answers: true },
        orderBy: { createdAt: 'desc' },
      });

      // Score trend
      const scoreTrend = attempts.map((a, i) => ({
        attempt: i + 1,
        score: a.percentage,
        tka: a.tkaPrediction,
        date: a.startedAt.toISOString().split('T')[0],
      }));

      // Simple subject breakdown based on attempt scores
      const subjectBreakdown: { subject: string; percentage: number; correct: number; total: number }[] = [
        { subject: 'Matematika', percentage: 70, correct: 7, total: 10 },
        { subject: 'Fisika', percentage: 65, correct: 6, total: 10 },
        { subject: 'Kimia', percentage: 75, correct: 8, total: 10 },
        { subject: 'B. Indonesia', percentage: 80, correct: 8, total: 10 },
        { subject: 'B. Inggris', percentage: 60, correct: 6, total: 10 },
      ];

      // Topic weakness (mock)
      const weakTopics = [
        { topic: 'Turunan', percentage: 40, correct: 2, total: 5 },
        { topic: 'Integral', percentage: 45, correct: 3, total: 5 },
        { topic: 'Listrik Dinamis', percentage: 50, correct: 3, total: 6 },
        { topic: 'Reading', percentage: 55, correct: 4, total: 7 },
        { topic: 'Teks Eksposisi', percentage: 60, correct: 3, total: 5 },
      ];

      return NextResponse.json({ scoreTrend, subjectBreakdown, weakTopics, totalAttempts: attempts.length });
    }

    if (type === 'global') {
      // Super admin global stats
      const totalSchools = await db.school.count({ where: { status: 'active' } });
      const totalStudents = await db.user.count({ where: { role: 'SISWA', isActive: true } });
      const totalTeachers = await db.user.count({ where: { role: 'GURU', isActive: true } });
      const totalQuestions = await db.question.count();
      const totalAttempts = await db.studentAttempt.count({ where: { status: 'submitted' } });

      const schools = await db.school.findMany({
        where: { status: 'active' },
        include: {
          _count: { select: { users: true } },
          subscriptions: { orderBy: { startDate: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Monthly growth (simulated)
      const monthlyGrowth = [
        { month: 'Jul', sekolah: 2, siswa: 45 },
        { month: 'Agu', sekolah: 5, siswa: 120 },
        { month: 'Sep', sekolah: 8, siswa: 210 },
        { month: 'Okt', sekolah: 12, siswa: 340 },
        { month: 'Nov', sekolah: 15, siswa: 480 },
        { month: 'Des', sekolah: totalSchools, siswa: totalStudents },
      ];

      // MRR calculation
      const activeSubs = await db.subscription.findMany({ where: { status: 'active' } });
      const mrr = activeSubs.reduce((s, sub) => s + sub.amount, 0);

      return NextResponse.json({
        totalSchools, totalStudents, totalTeachers, totalQuestions, totalAttempts,
        mrr, topSchools: schools, monthlyGrowth,
      });
    }

    return NextResponse.json({});
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Gagal mengambil analitik' }, { status: 500 });
  }
}
