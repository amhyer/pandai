'use client';

import { toast } from 'sonner';

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

export function clearUnauthorizedHandler() {
  onUnauthorized = null;
}

export async function apiClient(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);

  if (res.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  return res;
}
