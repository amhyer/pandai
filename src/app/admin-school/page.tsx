'use client';

import { RouteShell } from '@/components/app/route-shell';

export default function AdminSchoolPage() {
  return (
    <RouteShell
      initialView="dashboard"
      allowedRoles={['ADMIN_SCHOOL']}
      loadingLabel="Membuka Beranda Admin Sekolah..."
    />
  );
}
