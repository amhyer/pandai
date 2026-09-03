'use client';

import { RouteShell } from '@/components/app/route-shell';

export default function Page() {
  return (
    <RouteShell
      initialView="dashboard-guru"
      allowedRoles={['GURU']}
      loadingLabel="Membuka Dashboard Guru..."
    />
  );
}
