'use client';

import { RouteShell } from '@/components/app/route-shell';

export default function OrtuPage() {
  return (
    <RouteShell
      initialView="dashboard"
      allowedRoles={['ORANG_TUA']}
      loadingLabel="Membuka Beranda Orang Tua..."
    />
  );
}
