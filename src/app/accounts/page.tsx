'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Stub lama — dialihkan ke dashboard utama.
// Super admin dapat memakai menu "Akun Global" di sidebar.
export default function AccountsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]">
      <p className="text-sm font-medium text-muted-foreground">Mengalihkan ke dashboard...</p>
    </div>
  );
}
