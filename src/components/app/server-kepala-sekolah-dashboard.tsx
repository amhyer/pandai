'use client';

import { useEffect, useState } from 'react';
import { useAppStore, type User } from '@/store/use-store';
import AppLayout from '@/components/layout/app-layout';
import AppRouteLoading from '@/components/app/app-route-loading';
import { KepalaSekolahDashboard, type KepalaSekolahDashboardServerData } from '@/components/dashboard/kepala-sekolah/kepala-sekolah-dashboard';
import { setOnUnauthorized, clearUnauthorizedHandler } from '@/lib/api-client';
import { toast } from 'sonner';

interface ServerKepalaSekolahDashboardProps {
  user: User;
  data: KepalaSekolahDashboardServerData;
}

export function ServerKepalaSekolahDashboard({ user: initialUser, data }: ServerKepalaSekolahDashboardProps) {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    setUser(initialUser);
    setCurrentView('dashboard-kepsek');
    sessionStorage.setItem('pandai_view', 'dashboard-kepsek');
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
      <KepalaSekolahDashboard serverData={data} />
    </AppLayout>
  );
}
