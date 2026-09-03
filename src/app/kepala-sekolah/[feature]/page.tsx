'use client';

import { useParams } from 'next/navigation';
import { RouteShell } from '@/components/app/route-shell';
import { AppRouteNotFound } from '@/components/app/app-route-not-found';
import { getKepalaSekolahView } from '@/lib/route-map';

export default function KepalaSekolahFeaturePage() {
  const params = useParams<{ feature: string }>();
  const view = getKepalaSekolahView(params.feature);

  if (!view) {
    return <AppRouteNotFound />;
  }

  return (
    <RouteShell
      initialView={view}
      allowedRoles={['KEPALA_SEKOLAH']}
      loadingLabel="Membuka fitur kepala sekolah..."
    />
  );
}
