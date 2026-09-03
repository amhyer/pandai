'use client';

import { useParams } from 'next/navigation';
import { RouteShell } from '@/components/app/route-shell';
import { AppRouteNotFound } from '@/components/app/app-route-not-found';
import { getSiswaView } from '@/lib/route-map';

export default function SiswaFeaturePage() {
  const params = useParams<{ feature: string }>();
  const view = getSiswaView(params.feature);

  if (!view) {
    return <AppRouteNotFound />;
  }

  return (
    <RouteShell
      initialView={view}
      allowedRoles={['SISWA']}
      loadingLabel="Membuka fitur siswa..."
    />
  );
}
