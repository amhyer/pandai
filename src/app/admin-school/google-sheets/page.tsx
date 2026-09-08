import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/lib/server-auth';
import { PrefetchedRouteShell } from '@/components/app/prefetched-route-shell';
import type { User as StoreUser } from '@/store/use-store';

export const dynamic = 'force-dynamic';

export default async function GoogleSheetsSetupPage() {
  const user = await getServerSessionUser(['SUPER_ADMIN', 'ADMIN_SCHOOL']);
  if (!user) redirect('/');

  const storeUser: StoreUser = {
    ...user,
    role: user.role as StoreUser['role'],
  };

  return (
    <PrefetchedRouteShell
      initialUser={storeUser}
      initialView="google-sheets-setup"
      loadingLabel="Mengatur Google Sheets..."
    />
  );
}