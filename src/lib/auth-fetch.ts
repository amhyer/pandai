/**
 * Auth-aware fetch wrapper.
 * Automatically includes the session token from localStorage
 * in the Authorization header for all API requests.
 *
 * Usage (drop-in replacement for fetch):
 *   import { authFetch } from '@/lib/auth-fetch';
 *   const res = await authFetch('/api/users?schoolId=abc');
 *   const data = await res.json();
 */

export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let headers: HeadersInit = init?.headers || {};

  // If headers is a Headers object, we need to handle it differently
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pandai_session_token');
    if (token) {
      if (headers instanceof Headers) {
        headers.set('Authorization', `Bearer ${token}`);
      } else if (Array.isArray(headers)) {
        headers = [...headers, ['Authorization', `Bearer ${token}`]];
      } else {
        headers = {
          ...(headers as Record<string, string>),
          Authorization: `Bearer ${token}`,
        };
      }
    }
  }

  return fetch(input, { ...init, headers });
}

/**
 * Convenience: GET with auth token.
 */
export function authGet(url: string, options?: RequestInit): Promise<Response> {
  return authFetch(url, { ...options, method: 'GET' });
}

/**
 * Convenience: POST with auth token + JSON body.
 */
export function authPost(url: string, body?: unknown, options?: RequestInit): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience: PUT with auth token + JSON body.
 */
export function authPut(url: string, body?: unknown, options?: RequestInit): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience: PATCH with auth token + JSON body.
 */
export function authPatch(url: string, body?: unknown, options?: RequestInit): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience: DELETE with auth token.
 */
export function authDelete(url: string, options?: RequestInit): Promise<Response> {
  return authFetch(url, { ...options, method: 'DELETE' });
}
