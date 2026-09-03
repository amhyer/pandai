'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/use-store';
import AppLayout from '@/components/layout/app-layout';
import { ViewRouter } from '@/components/app/view-router';
import { setOnUnauthorized, clearUnauthorizedHandler } from '@/lib/api-client';
import { toast } from 'sonner';

// Legacy SPA entry: wraps the current-view router in the shared AppLayout.
// Feature routes in src/app/<role>/... use the same ViewRouter via RouteShell.
export default function AuthenticatedApp() {
  const setUser = useAppStore((s) => s.setUser);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      setCurrentView('login');
      toast.error('Sesi Anda telah berakhir. Silakan masuk kembali.');
    });
    return () => clearUnauthorizedHandler();
  }, [setUser, setCurrentView]);

  return (
    <AppLayout>
      <ViewRouter />
    </AppLayout>
  );
}
