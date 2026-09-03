'use client';

import { useParams } from 'next/navigation';
import { RouteShell } from '@/components/app/route-shell';
import { AppRouteNotFound } from '@/components/app/app-route-not-found';
import { getGuruView } from '@/lib/route-map';

export default function GuruFeaturePage() {
  const params = useParams<{ feature: string }>();
  const view = getGuruView(params.feature);

  if (!view) {
    return <AppRouteNotFound />;
  }

  return (
    <RouteShell
      initialView={view}
      allowedRoles={['GURU']}
      loadingLabel="Membuka fitur guru..."
    />
  );
}
