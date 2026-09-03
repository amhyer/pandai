import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/lib/server-auth';
import { getSiswaDashboardData } from '@/lib/server-dashboard';
import { ServerSiswaDashboard } from '@/components/app/server-siswa-dashboard';
import type { User as StoreUser } from '@/store/use-store';

export const dynamic = 'force-dynamic';

export default async function SiswaDashboardPage() {
  const user = await getServerSessionUser(['SISWA']);
  if (!user) redirect('/');

  const data = await getSiswaDashboardData(user.id);

  const storeUser: StoreUser = {
    ...user,
    role: user.role as StoreUser['role'],
  };

  return <ServerSiswaDashboard user={storeUser} data={data} />;
}
