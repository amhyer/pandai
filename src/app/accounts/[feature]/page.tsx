'use client';

import { useParams } from 'next/navigation';
import { RouteShell } from '@/components/app/route-shell';
import { AppRouteNotFound } from '@/components/app/app-route-not-found';
import { getSuperAdminView } from '@/lib/route-map';

export default function AccountsFeaturePage() {
  const params = useParams<{ feature: string }>();
  const view = getSuperAdminView(params.feature);

  if (!view) {
    return <AppRouteNotFound />;
  }

  return (
    <RouteShell
      initialView={view}
      allowedRoles={['SUPER_ADMIN']}
      loadingLabel="Membuka fitur super admin..."
    />
  );
}
