'use client';

import { RouteShell } from '@/components/app/route-shell';

export default function Page() {
  return (
    <RouteShell
      initialView="dashboard-ortu"
      allowedRoles={['ORANG_TUA']}
      loadingLabel="Membuka Dashboard Orang Tua..."
    />
  );
}
