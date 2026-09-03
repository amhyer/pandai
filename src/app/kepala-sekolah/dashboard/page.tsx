import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/lib/server-auth';
import { getKepalaSekolahDashboardData } from '@/lib/server-dashboard';
import { ServerKepalaSekolahDashboard } from '@/components/app/server-kepala-sekolah-dashboard';
import type { User as StoreUser } from '@/store/use-store';

export const dynamic = 'force-dynamic';

export default async function KepalaSekolahDashboardPage() {
  const user = await getServerSessionUser(['KEPALA_SEKOLAH']);
  if (!user || !user.schoolId) redirect('/');

  const data = await getKepalaSekolahDashboardData(user.schoolId);

  const storeUser: StoreUser = {
    ...user,
    role: user.role as StoreUser['role'],
  };

  return <ServerKepalaSekolahDashboard user={storeUser} data={data} />;
}
