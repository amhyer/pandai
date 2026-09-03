import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/lib/server-auth';
import { getSuperAdminDashboardData } from '@/lib/server-dashboard';
import { ServerSuperAdminDashboard } from '@/components/app/server-super-admin-dashboard';
import type { User as StoreUser } from '@/store/use-store';

export const dynamic = 'force-dynamic';

export default async function AccountsDashboardPage() {
  const user = await getServerSessionUser(['SUPER_ADMIN']);
  if (!user) redirect('/');

  const data = await getSuperAdminDashboardData();

  const storeUser: StoreUser = {
    ...user,
    role: user.role as StoreUser['role'],
  };

  return (
    <ServerSuperAdminDashboard
      user={storeUser}
      data={{
        analytics: data.analytics,
        activities: data.activities,
      }}
    />
  );
}
