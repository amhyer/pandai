'use client';

import { RouteShell } from '@/components/app/route-shell';

export default function SiswaPage() {
  return (
    <RouteShell
      initialView="dashboard"
      allowedRoles={['SISWA']}
      loadingLabel="Membuka Beranda Siswa..."
    />
  );
}
