import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/lib/server-auth';
import { getOrtuDashboardData } from '@/lib/server-dashboard';
import { ServerOrtuDashboard } from '@/components/app/server-ortu-dashboard';
import type { User as StoreUser } from '@/store/use-store';

export const dynamic = 'force-dynamic';

export default async function OrtuDashboardPage() {
  const user = await getServerSessionUser(['ORANG_TUA']);
  if (!user) redirect('/');

  const children = await getOrtuDashboardData(user.id, user.schoolId);

  const storeUser: StoreUser = {
    ...user,
    role: user.role as StoreUser['role'],
  };

  return <ServerOrtuDashboard user={storeUser} data={{ children }} />;
}
