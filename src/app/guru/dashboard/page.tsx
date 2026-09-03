import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/lib/server-auth';
import { getGuruDashboardData } from '@/lib/server-dashboard';
import { ServerGuruDashboard } from '@/components/app/server-guru-dashboard';
import type { User as StoreUser } from '@/store/use-store';

export const dynamic = 'force-dynamic';

export default async function GuruDashboardPage() {
  const user = await getServerSessionUser(['GURU']);
  if (!user || !user.schoolId) redirect('/');

  const data = await getGuruDashboardData(user.schoolId);

  const storeUser: StoreUser = {
    ...user,
    role: user.role as StoreUser['role'],
  };

  return (
    <ServerGuruDashboard
      user={storeUser}
      data={{
        totalQuestions: data.totalQuestions,
        totalExams: data.totalExams,
        avgStudentScore: data.avgStudentScore,
        recentActivities: data.recentActivities,
        topStudents: data.topStudents,
      }}
    />
  );
}
