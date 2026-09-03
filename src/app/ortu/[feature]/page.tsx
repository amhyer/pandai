import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/lib/server-auth';
import { PrefetchedRouteShell } from '@/components/app/prefetched-route-shell';
import { AppRouteNotFound } from '@/components/app/app-route-not-found';
import { getOrtuView } from '@/lib/route-map';
import type { User as StoreUser } from '@/store/use-store';

export const dynamic = 'force-dynamic';

export default async function OrtuFeaturePage({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  const view = getOrtuView(feature);
  if (!view) return <AppRouteNotFound />;

  const user = await getServerSessionUser(['ORANG_TUA']);
  if (!user) redirect('/');

  const storeUser: StoreUser = {
    ...user,
    role: user.role as StoreUser['role'],
  };

  return (
    <PrefetchedRouteShell
      initialUser={storeUser}
      initialView={view}
      loadingLabel="Membuka fitur orang tua..."
    />
  );
}
