'use client';

import { RouteShell } from '@/components/app/route-shell';

export default function KepalaSekolahPage() {
  return (
    <RouteShell
      initialView="dashboard-kepsek"
      allowedRoles={['KEPALA_SEKOLAH']}
      loadingLabel="Membuka Beranda Kepala Sekolah..."
    />
  );
}
