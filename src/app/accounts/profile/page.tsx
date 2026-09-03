import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/lib/server-auth';
import { PrefetchedRouteShell } from '@/components/app/prefetched-route-shell';
import type { User as StoreUser } from '@/store/use-store';

export const dynamic = 'force-dynamic';

export default async function AccountsProfilePage() {
  const user = await getServerSessionUser(['SUPER_ADMIN']);
  if (!user) redirect('/');

  const storeUser: StoreUser = {
    ...user,
    role: user.role as StoreUser['role'],
  };

  return (
    <PrefetchedRouteShell
      initialUser={storeUser}
      initialView="profile"
      loadingLabel="Membuka Profil Super Admin..."
    />
  );
}
