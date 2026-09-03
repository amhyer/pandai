'use client';

import { useEffect, useState } from 'react';
import { useAppStore, type ViewType, type User } from '@/store/use-store';
import AppLayout from '@/components/layout/app-layout';
import { ViewRouter } from '@/components/app/view-router';
import AppRouteLoading from '@/components/app/app-route-loading';

interface PrefetchedRouteShellProps {
  initialUser: User;
  initialView: ViewType;
  loadingLabel?: string;
}

/**
 * Client shell used by a Server Component route after it has already loaded
 * the signed-in user from the database.
 *
 * It seeds the Zustand session store from the server-provided `initialUser`
 * (no second /api/auth/me request), then renders the same AppLayout and
 * URL-first ViewRouter as the legacy SPA.
 */
export function PrefetchedRouteShell({
  initialUser,
  initialView,
  loadingLabel = 'Menyiapkan halaman...',
}: PrefetchedRouteShellProps) {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    setUser(initialUser);
    setCurrentView(initialView);
    sessionStorage.setItem('pandai_view', initialView);
    setSeeded(true);
  }, [initialUser, initialView, setCurrentView, setUser]);

  if (!seeded || !user) {
    return <AppRouteLoading label={loadingLabel} />;
  }

  return (
    <AppLayout>
      <ViewRouter />
    </AppLayout>
  );
}
