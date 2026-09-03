'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore, ViewType, UserRole } from '@/store/use-store';
import AppLayout from '@/components/layout/app-layout';
import { ViewRouter } from '@/components/app/view-router';
import { LoginForm } from '@/components/auth/login-form';
import AppRouteLoading from '@/components/app/app-route-loading';
import { setOnUnauthorized, clearUnauthorizedHandler } from '@/lib/api-client';
import { toast } from 'sonner';

type AllowedRole = UserRole;

interface RouteShellProps {
  initialView: ViewType;
  allowedRoles?: AllowedRole[];
  loadingLabel?: string;
}

/**
 * Shared client shell for App Router feature routes.
 *
 * During the SPA → route-per-feature migration this component:
 *  1. restores the session from the httpOnly cookie (/api/auth/me),
 *  2. checks the role against `allowedRoles`,
 *  3. initialises `currentView` to the feature that owns the route,
 *  4. renders the existing AppLayout + ViewRouter so sidebar navigation
 *     and legacy `currentView` state continue to work.
 */
export function RouteShell({ initialView, allowedRoles, loadingLabel = 'Menyiapkan sesi...' }: RouteShellProps) {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            if (cancelled) return;

            if (allowedRoles && !allowedRoles.includes(data.user.role)) {
              router.replace('/');
              return;
            }

            setUser(data.user);
            setCurrentView(initialView);
            sessionStorage.setItem('pandai_view', initialView);
          }
        }
      } catch {
        // Session check failure is treated as unauthenticated.
      } finally {
        if (!cancelled) setChecked(true);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [allowedRoles, initialView, router, setCurrentView, setUser]);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      setCurrentView('login');
      toast.error('Sesi Anda telah berakhir. Silakan masuk kembali.');
    });
    return () => clearUnauthorizedHandler();
  }, [setCurrentView, setUser]);

  if (!checked) {
    return <AppRouteLoading label={loadingLabel} />;
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <AppLayout>
      <ViewRouter />
    </AppLayout>
  );
}
