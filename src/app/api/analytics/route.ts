import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH', 'GURU', 'SISWA', 'ORANG_TUA']);
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const type = searchParams.get('type');

    if (type === 'dashboard' && schoolId) {
      // Enforce school scope for non-super-admin
      if (auth.role !== 'SUPER_ADMIN') {
        requireSchoolScope(auth, schoolId);
      }
      const totalStudents = await db.user.count({ where: { schoolId, role: 'SISWA', isActive: true } });
      const totalTeachers = await db.user.count({ where: { schoolId, role: 'GURU', isActive: true } });
      const totalClasses = await db.class.count({ where: { schoolId } });
      const totalQuestions = await db.question.count({ where: { schoolId } });
      const attempts = await db.studentAttempt.findMany({
        where: { schoolId, status: 'submitted' },
        select: { percentage: true, tkaPrediction: true, createdAt: true, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }, take: 50,
      });
      const avgScore = attempts.length > 0 ? attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length : 0;
      const avgTka = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + (a.tkaPrediction || 0), 0) / attempts.length) : 0;
      return NextResponse.json({ totalStudents, totalTeachers, totalClasses, totalQuestions, avgScore: Math.round(avgScore * 10) / 10, predictedScore: avgTka, recentAttempts: attempts.slice(0, 10).map(a => ({ name: a.user?.name || 'Anonim', score: a.percentage, date: a.createdAt.toISOString().split('T')[0] })) });
    }

    if (type === 'guru-dashboard' && schoolId) {
      // Enforce school scope
      if (auth.role !== 'SUPER_ADMIN') {
        requireSchoolScope(auth, schoolId);
      }
      const totalExams = await db.examSession.count({ where: { schoolId, status: { in: ['published', 'in_progress'] } } });
      const attempts = await db.studentAttempt.findMany({
        where: { schoolId, status: 'submitted' },
        select: { percentage: true },
        orderBy: { createdAt: 'desc' }, take: 1000,
      });
      const avgStudentScore = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length * 10) / 10 : 0;

      // Top students by latest attempt score
      const latestAttempts = await db.studentAttempt.findMany({
        where: { schoolId, status: 'submitted' },
        select: { percentage: true, tkaPrediction: true, user: { select: { name: true } } },
        orderBy: { percentage: 'desc' }, take: 3,
      });
      const topStudents = latestAttempts.map((a, idx) => ({
        name: a.user?.name || 'Anonim',
        score: a.percentage,
        progress: Math.min(Math.round(a.percentage), 100),
        trend: idx === 0 ? 'up' as const : idx === 1 ? 'up' as const : 'stable' as const,
      }));

      // Recent activities from activity log
      const recentActivities = await db.activityLog.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, action: true, detail: true, createdAt: true },
      });
      const activityTypes: Record<string, 'create' | 'exam' | 'result'> = {
        'create_question': 'create', 'create_exam': 'exam', 'submit_attempt': 'result',
      };
      const formattedActivities = recentActivities.map(a => {
        const timeDiff = Date.now() - a.createdAt.getTime();
        const hours = Math.floor(timeDiff / 3600000);
        const days = Math.floor(timeDiff / 86400000);
        let time = hours < 1 ? 'Baru saja' : hours < 24 ? `${hours} jam lalu` : `${days} hari lalu`;
        return {
          id: a.id,
          action: a.action,
          detail: a.detail || '',
          time,
          type: activityTypes[a.action] || 'create',
        };
      });

      return NextResponse.json({ totalExams, avgStudentScore, topStudents, recentActivities: formattedActivities });
    }

    if (type === 'global') {
      // Restrict global analytics to SUPER_ADMIN only
      if (auth.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Akses ditolak — hanya SUPER_ADMIN' }, { status: 403 });
      }
      const totalSchools = await db.school.count({ where: { status: 'active' } });
      const totalStudents = await db.user.count({ where: { role: 'SISWA', isActive: true } });
      const totalTeachers = await db.user.count({ where: { role: 'GURU', isActive: true } });
      const totalQuestions = await db.question.count();
      const totalAttempts = await db.studentAttempt.count({ where: { status: 'submitted' } });
      const schools = await db.school.findMany({ where: { status: 'active' }, include: { _count: { select: { users: true } }, subscriptions: { orderBy: { startDate: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, take: 10 });
      // Real monthly data from database
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const monthlyData = await db.school.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      });
      const monthlyGrowth = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const monthStr = d.toLocaleString('id-ID', { month: 'short' });
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const schoolsThisMonth = monthlyData.filter(s => s.createdAt >= d && s.createdAt <= monthEnd).length;
        return { month: monthStr, sekolah: schoolsThisMonth, siswa: 0 };
      });
      const activeSubs = await db.subscription.findMany({ where: { status: 'active' } });
      const mrr = activeSubs.reduce((s, sub) => s + sub.amount, 0);
      return NextResponse.json({ totalSchools, totalStudents, totalTeachers, totalQuestions, totalAttempts, mrr, topSchools: schools, monthlyGrowth });
    }

    // P0-03: Student analytics — real data from DB
    if (type === 'student') {
      const studentId = searchParams.get('userId');
      // Only allow SISWA to access own data, or admin/guru with proper scope
      if (auth.role === 'SISWA') {
        if (studentId && studentId !== auth.userId) {
          return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
        }
      }
      const effectiveUserId = auth.role === 'SISWA' ? auth.userId : studentId;
      if (!effectiveUserId) {
        return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 });
      }

      // Get student's school for scope
      const student = await db.user.findUnique({
        where: { id: effectiveUserId },
        select: { schoolId: true, classId: true },
      });
      if (!student) {
        return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
      }
      // Non-super-admin: verify school scope
      if (auth.role !== 'SUPER_ADMIN' && student.schoolId && auth.schoolId && student.schoolId !== auth.schoolId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }

      // Fetch all submitted attempts with question/subject info
      const attempts = await db.studentAttempt.findMany({
        where: { userId: effectiveUserId, status: 'submitted' },
        include: {
          answers: { select: { questionId: true, isCorrect: true, question: { select: { subjectId: true, topicId: true } } } },
        },
        orderBy: { submittedAt: 'desc' },
      });

      const totalExams = attempts.length;
      const lastScore = attempts.length > 0 ? Math.round(attempts[0].percentage * 10) / 10 : 0;
      const avgCorrect = attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length * 10) / 10
        : 0;

      // Weak topics: topics with average score < 70%
      const topicScores: Record<string, { topic: string; totalScore: number; count: number }> = {};
      for (const att of attempts) {
        for (const ans of att.answers) {
          const tId = ans.question?.topicId;
          if (!tId) continue;
          if (!topicScores[tId]) {
            const topic = await db.topic.findUnique({ where: { id: tId }, select: { name: true } });
            topicScores[tId] = { topic: topic?.name || 'Tanpa Topik', totalScore: 0, count: 0 };
          }
          topicScores[tId].count++;
          if (ans.isCorrect) topicScores[tId].totalScore++;
        }
      }
      const weakTopics = Object.values(topicScores)
        .map(t => ({ ...t, score: t.count > 0 ? Math.round(t.totalScore / t.count * 100) : 0 }))
        .filter(t => t.score < 70)
        .sort((a, b) => a.score - b.score);

      // Score trend by date
      const scoreTrend = attempts.slice(0, 20).reverse().map(a => ({
        date: (a.submittedAt || a.createdAt).toISOString().split('T')[0],
        score: a.percentage,
      }));

      // Subject breakdown
      const subjectScores: Record<string, { subject: string; totalScore: number; totalMax: number }> = {};
      for (const att of attempts) {
        for (const ans of att.answers) {
          const sId = ans.question?.subjectId;
          if (!sId) continue;
          if (!subjectScores[sId]) {
            const subj = await db.subject.findUnique({ where: { id: sId }, select: { name: true } });
            subjectScores[sId] = { subject: subj?.name || 'Unknown', totalScore: 0, totalMax: 0 };
          }
          subjectScores[sId].totalMax++;
          if (ans.isCorrect) subjectScores[sId].totalScore++;
        }
      }
      const subjectBreakdown = Object.values(subjectScores)
        .map(s => ({ ...s, score: s.totalMax > 0 ? Math.round(s.totalScore / s.totalMax * 100) : 0, maxScore: 100 }))
        .sort((a, b) => b.score - a.score);

      // Rank among school students
      let rank: number | undefined;
      if (student.schoolId) {
        const schoolStudents = await db.user.findMany({
          where: { schoolId: student.schoolId, role: 'SISWA', isActive: true },
          select: { id: true },
        });
        const studentIds = schoolStudents.map(s => s.id);
        const schoolAvgScores: Record<string, number> = {};
        const schoolAttempts = await db.studentAttempt.findMany({
          where: { userId: { in: studentIds }, status: 'submitted' },
          select: { userId: true, percentage: true },
        });
        for (const sa of schoolAttempts) {
          if (!schoolAvgScores[sa.userId]) schoolAvgScores[sa.userId] = 0;
          schoolAvgScores[sa.userId] += sa.percentage;
        }
        // Convert to averages and sort descending
        const ranked = Object.entries(schoolAvgScores)
          .map(([uid, total]) => ({ uid, avg: total / schoolAttempts.filter(a => a.userId === uid).length }))
          .sort((a, b) => b.avg - a.avg);
        const rankIdx = ranked.findIndex(r => r.uid === effectiveUserId);
        if (rankIdx >= 0) rank = rankIdx + 1;
      }

      return NextResponse.json({ lastScore, totalExams, avgCorrect, rank, weakTopics, scoreTrend, subjectBreakdown });
    }

    return NextResponse.json({});
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal mengambil analitik' }, { status: 500 });
  }
}
