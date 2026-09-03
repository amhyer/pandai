'use client';

import { RouteShell } from '@/components/app/route-shell';

export default function Page() {
  return (
    <RouteShell
      initialView="accounts"
      allowedRoles={['ADMIN_SCHOOL']}
      loadingLabel="Membuka Pengelolaan Akun..."
    />
  );
}
