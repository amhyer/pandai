'use client';

import { RouteShell } from '@/components/app/route-shell';

export default function Page() {
  return (
    <RouteShell
      initialView="dashboard-siswa"
      allowedRoles={['SISWA']}
      loadingLabel="Membuka Dashboard Siswa..."
    />
  );
}
