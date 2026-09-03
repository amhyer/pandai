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
