'use client';

import { RouteShell } from '@/components/app/route-shell';

export default function Page() {
  return (
    <RouteShell
      initialView="dashboard-kepsek"
      allowedRoles={['KEPALA_SEKOLAH']}
      loadingLabel="Membuka Dashboard Kepala Sekolah..."
    />
  );
}
