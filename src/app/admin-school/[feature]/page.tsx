'use client';

import { useParams } from 'next/navigation';
import { RouteShell } from '@/components/app/route-shell';
import { AppRouteNotFound } from '@/components/app/app-route-not-found';
import { getAdminSchoolView } from '@/lib/route-map';

export default function AdminSchoolFeaturePage() {
  const params = useParams<{ feature: string }>();
  const feature = params.feature;
  const view = getAdminSchoolView(feature);

  if (!view) {
    return <AppRouteNotFound />;
  }

  return (
    <RouteShell
      initialView={view}
      allowedRoles={['ADMIN_SCHOOL']}
      loadingLabel="Membuka fitur..."
    />
  );
}
