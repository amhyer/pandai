import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/lib/server-auth';
import { getAdminSchoolDashboardData } from '@/lib/server-dashboard';
import { ServerAdminSchoolDashboard } from '@/components/app/server-admin-school-dashboard';
import type { User as StoreUser } from '@/store/use-store';

export const dynamic = 'force-dynamic';

export default async function AdminSchoolDashboardPage() {
  const user = await getServerSessionUser(['ADMIN_SCHOOL']);
  if (!user || !user.schoolId) redirect('/');

  const data = await getAdminSchoolDashboardData(user.schoolId);

  const storeUser: StoreUser = {
    ...user,
    role: user.role as StoreUser['role'],
  };

  return (
    <ServerAdminSchoolDashboard
      user={storeUser}
      data={{
        analytics: data.analytics,
        upcomingExams: data.upcomingExams,
      }}
    />
  );
}
