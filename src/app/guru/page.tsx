'use client';

import { RouteShell } from '@/components/app/route-shell';

export default function GuruPage() {
  return (
    <RouteShell
      initialView="dashboard"
      allowedRoles={['GURU']}
      loadingLabel="Membuka Beranda Guru..."
    />
  );
}
