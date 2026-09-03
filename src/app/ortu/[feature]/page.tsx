'use client';

import { useParams } from 'next/navigation';
import { RouteShell } from '@/components/app/route-shell';
import { AppRouteNotFound } from '@/components/app/app-route-not-found';
import { getOrtuView } from '@/lib/route-map';

export default function OrtuFeaturePage() {
  const params = useParams<{ feature: string }>();
  const view = getOrtuView(params.feature);

  if (!view) {
    return <AppRouteNotFound />;
  }

  return (
    <RouteShell
      initialView={view}
      allowedRoles={['ORANG_TUA']}
      loadingLabel="Membuka fitur orang tua..."
    />
  );
}
