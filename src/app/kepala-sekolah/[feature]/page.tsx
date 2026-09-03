import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/lib/server-auth';
import { PrefetchedRouteShell } from '@/components/app/prefetched-route-shell';
import { AppRouteNotFound } from '@/components/app/app-route-not-found';
import { getKepalaSekolahView } from '@/lib/route-map';
import type { User as StoreUser } from '@/store/use-store';

export const dynamic = 'force-dynamic';

export default async function KepalaSekolahFeaturePage({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  const view = getKepalaSekolahView(feature);
  if (!view) return <AppRouteNotFound />;

  const user = await getServerSessionUser(['KEPALA_SEKOLAH']);
  if (!user) redirect('/');

  const storeUser: StoreUser = {
    ...user,
    role: user.role as StoreUser['role'],
  };

  return (
    <PrefetchedRouteShell
      initialUser={storeUser}
      initialView={view}
      loadingLabel="Membuka fitur kepala sekolah..."
    />
  );
}
