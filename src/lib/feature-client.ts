export async function featureJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  if (!response.ok || body === null) throw new Error(body?.error || body?.message || 'Gagal memuat atau menyimpan data. Silakan coba lagi.');
  return body as T;
}

export function jsonBody(method: string, data: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}
