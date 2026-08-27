import { useAppStore } from '@/store/use-store';

/**
 * fetchWithAuth — wrapper around fetch() that injects auth headers from Zustand store.
 * Use this for API calls that require server-side auth verification.
 */
export function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const user = useAppStore.getState().user;
  const headers = new Headers(options.headers || {});

  if (user?.id) {
    headers.set('X-User-Id', user.id);
    headers.set('X-School-Id', user.schoolId || '');
    headers.set('X-User-Role', user.role || '');
  }

  return fetch(url, { ...options, headers });
}
