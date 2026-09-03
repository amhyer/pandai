'use client';

import { useEffect, useState } from 'react';
import { useAppStore, type User } from '@/store/use-store';
import AppLayout from '@/components/layout/app-layout';
import AppRouteLoading from '@/components/app/app-route-loading';
import { SiswaDashboard, type SiswaDashboardServerData } from '@/components/dashboard/siswa/siswa-dashboard';
import { setOnUnauthorized, clearUnauthorizedHandler } from '@/lib/api-client';
import { toast } from 'sonner';

interface ServerSiswaDashboardProps {
  user: User;
  data: SiswaDashboardServerData;
}

export function ServerSiswaDashboard({ user: initialUser, data }: ServerSiswaDashboardProps) {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    setUser(initialUser);
    setCurrentView('dashboard');
    sessionStorage.setItem('pandai_view', 'dashboard');
    setSeeded(true);
  }, [initialUser, setCurrentView, setUser]);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      setCurrentView('login');
      toast.error('Sesi Anda telah berakhir. Silakan masuk kembali.');
    });
    return () => clearUnauthorizedHandler();
  }, [setCurrentView, setUser]);

  if (!seeded || !user) return <AppRouteLoading label="Menyiapkan dashboard..." />;

  return (
    <AppLayout>
      <SiswaDashboard serverData={data} />
    </AppLayout>
  );
}
