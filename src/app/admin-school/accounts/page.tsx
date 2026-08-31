'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/use-store';

// Halaman ini dulu stub yang membaca `users` dari store (tidak pernah ada),
// sehingga selalu kosong/crash. Sekarang dialihkan ke aplikasi utama yang
// memiliki Pengelolaan Akun lengkap (AccountManager).
export default function AdminSchoolAccountsPage() {
  const router = useRouter();
  const navigateTo = useAppStore((s) => s.navigateTo);

  useEffect(() => {
    navigateTo('accounts');
    router.replace('/');
  }, [navigateTo, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#1F3864] animate-pulse">
          <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" />
          </svg>
        </div>
        <p className="text-sm font-medium text-muted-foreground">Membuka Pengelolaan Akun...</p>
      </div>
    </div>
  );
}
