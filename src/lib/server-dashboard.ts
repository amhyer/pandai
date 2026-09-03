import { db } from '@/lib/db';

/**
 * Server-only dashboard data loaders.
 *
 * These mirror the Supabase/API route queries used by the client dashboards
 * but run directly on the Next.js server. Server Component routes can pass
 * the result through props so the client does not perform a second fetch on
 * first load.
 */

export interface SuperAdminDashboardData {
  analytics: {
    totalSchools: number;
    totalStudents: number;
    totalTeachers: number;
    totalQuestions: number;
    totalAttempts: number;
    mrr: number;
    monthlyGrowth: { month: string; sekolah: number; siswa: number }[];
    topSchools: {
      id: string;
      name: string;
      code: string;
      plan: string;
      status: string;
      _count?: { users: number };
    }[];
  };
  activities: {
    id: string;
    action: string;
    detail: string | null;
    module: string | null;
    createdAt: Date;
  }[];
}

export interface AdminSchoolDashboardData {
  analytics: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalQuestions: number;
    avgScore: number;
    predictedScore: number;
    recentAttempts: { name: string; score: number; date: string }[];
  };
  upcomingExams: {
    id: string;
    name: string;
    date: string;
    status: 'scheduled' | 'in_progress' | 'grading';
    participants: number;
    subject: string;
  }[];
}

export async function getAdminSchoolDashboardData(
  schoolId: string
): Promise<AdminSchoolDashboardData> {
  const [totalStudents, totalTeachers, totalClasses, totalQuestions, attempts, examSessions] =
    await Promise.all([
      db.user.count({ where: { schoolId, role: 'SISWA', isActive: true } }),
      db.user.count({ where: { schoolId, role: 'GURU', isActive: true } }),
      db.class.count({ where: { schoolId } }),
      db.question.count({ where: { schoolId } }),
      db.studentAttempt.findMany({
        where: { schoolId, status: 'submitted' },
        select: { percentage: true, tkaPrediction: true, createdAt: true, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.examSession.findMany({
        where: { schoolId, status: { in: ['scheduled', 'active'] } },
        include: { examPackage: true, assignments: { select: { id: true } } },
        orderBy: { startDate: 'asc' },
        take: 5,
      }),
    ]);

  const avgScore =
    attempts.length > 0
      ? Math.round((attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) * 10) / 10
      : 0;
  const avgTka =
    attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.tkaPrediction || 0), 0) / attempts.length)
      : 0;

  return {
    analytics: {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalQuestions,
      avgScore,
      predictedScore: avgTka,
      recentAttempts: attempts.slice(0, 10).map((a) => ({
        name: a.user?.name || 'Anonim',
        score: a.percentage,
        date: a.createdAt.toISOString().split('T')[0],
      })),
    },
    upcomingExams: examSessions.map((session) => ({
      id: session.id,
      name: session.title || session.examPackage?.title || 'Tryout',
      date: session.startDate.toISOString(),
      status: session.status === 'active' ? 'in_progress' as const : 'scheduled' as const,
      participants: session.assignments.length,
      subject: session.examPackage?.title || 'Tryout',
    })),
  };
}

export async function getSuperAdminDashboardData(): Promise<SuperAdminDashboardData> {
  const [
    totalSchools,
    totalStudents,
    totalTeachers,
    totalQuestions,
    totalAttempts,
    schools,
    monthlySchools,
    activeSubs,
    activities,
  ] = await Promise.all([
    db.school.count({ where: { status: 'active' } }),
    db.user.count({ where: { role: 'SISWA', isActive: true } }),
    db.user.count({ where: { role: 'GURU', isActive: true } }),
    db.question.count(),
    db.studentAttempt.count({ where: { status: 'submitted' } }),
    db.school.findMany({
      where: { status: 'active' },
      include: {
        _count: { select: { users: true } },
        subscriptions: { orderBy: { startDate: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.school.findMany({
      where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } },
      select: { createdAt: true },
    }),
    db.subscription.findMany({ where: { status: 'active' } }),
    db.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, action: true, detail: true, module: true, createdAt: true },
    }),
  ]);

  const now = new Date();
  const monthlyGrowth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const monthStr = d.toLocaleString('id-ID', { month: 'short' });
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const schoolsThisMonth = monthlySchools.filter(
      (s) => s.createdAt >= d && s.createdAt <= monthEnd
    ).length;
    return { month: monthStr, sekolah: schoolsThisMonth, siswa: 0 };
  });
  const mrr = activeSubs.reduce((sum, sub) => sum + sub.amount, 0);

  return {
    analytics: {
      totalSchools,
      totalStudents,
      totalTeachers,
      totalQuestions,
      totalAttempts,
      mrr,
      monthlyGrowth,
      topSchools: schools.map((school) => ({
        id: school.id,
        name: school.name,
        code: school.code || '',
        plan: school.plan || '',
        status: school.status,
        _count: school._count,
      })),
    },
    activities: activities.map((activity) => ({
      ...activity,
      detail: activity.detail ?? '',
      module: activity.module ?? '',
    })),
  };
}
