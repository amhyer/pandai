'use client';

import { RouteShell } from '@/components/app/route-shell';

export default function Page() {
  return (
    <RouteShell
      initialView="users-global"
      allowedRoles={['SUPER_ADMIN']}
      loadingLabel="Membuka Akun Global..."
    />
  );
}
