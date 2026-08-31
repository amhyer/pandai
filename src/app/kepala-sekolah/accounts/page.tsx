'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Stub lama — dialihkan ke dashboard utama.
export default function KepalaSekolahAccountsPage() {
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
