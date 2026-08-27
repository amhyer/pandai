import { NextResponse } from 'next/server';

const CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_TOKEN = '7FJ9KP0Q3W8H6R2D5T1V';

/**
 * POST /api/dapodik/connect
 *
 * Body: { serverUrl?: string, token?: string, action: 'test' | 'schools' | 'school' }
 *   - action=test:    Test connection to local Dapodik API
 *   - action=schools: Fetch all schools (with optional filter)
 *   - action=school:  Fetch single school by NPSN
 *   - npsn?: string   (required for action=school)
 *   - bentuk?: string (optional filter for action=schools, e.g. "SD" or "SMP")
 *
 * Proxies requests to the operator's local Dapodik API (devmaarifnu/dapodik-api).
 */

function normalizeUrl(serverUrl: string): string {
  let url = serverUrl.trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  return url;
}

async function fetchFromDapodik(
  baseUrl: string,
  token: string,
  path: string,
  timeoutMs = CONNECT_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${baseUrl}/pusatdata/pendidikan${path}`;
    const res = await fetch(url, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    return { status: res.status, data: await res.json() };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serverUrl, token: userToken, action, npsn, bentuk } = body;

    const baseUrl = normalizeUrl(serverUrl || 'localhost:8881');
    const token = userToken || DEFAULT_TOKEN;

    if (!action) {
      return NextResponse.json({ error: 'Action wajib diisi (test/schools/school)' }, { status: 400 });
    }

    // ── Action: Test Connection ──
    if (action === 'test') {
      try {
        const result = await fetchFromDapodik(baseUrl, token, '', 5_000);
        if (result.status === 401) {
          return NextResponse.json({
            success: false,
            error: 'Token tidak valid. Pastikan token di config.yaml sesuai.',
          });
        }
        if (result.status === 200) {
          const total = result.data?.total ?? 0;
          return NextResponse.json({
            success: true,
            message: `Koneksi berhasil! Server aktif dengan ${total} data sekolah.`,
            serverUrl: baseUrl,
            totalSchools: total,
          });
        }
        return NextResponse.json({
          success: false,
          error: `Server merespons dengan status HTTP ${result.status}`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (msg.includes('abort') || msg.includes('timeout') || msg.includes('AbortError')) {
          return NextResponse.json({
            success: false,
            error: `Koneksi timeout ke ${baseUrl}. Pastikan API Dapodik berjalan.`,
          });
        }
        return NextResponse.json({
          success: false,
          error: `Gagal terhubung ke ${baseUrl}: ${msg}`,
        });
      }
    }

    // ── Action: Fetch All Schools ──
    if (action === 'schools') {
      try {
        const queryParams: string[] = [];
        if (bentuk) queryParams.push(`bentuk_pendidikan=${encodeURIComponent(bentuk)}`);

        const path = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
        const result = await fetchFromDapodik(baseUrl, token, path);

        if (result.status === 401) {
          return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
        }
        if (result.status !== 200) {
          return NextResponse.json({ error: 'Gagal mengambil data sekolah' }, { status: 502 });
        }

        const schools = Array.isArray(result.data?.data) ? result.data.data : [];
        const mapped = schools.map((s: Record<string, unknown>) => ({
          npsn: String(s.npsn || ''),
          nama: String(s.nama || ''),
          alamat: String(s.alamat || ''),
          kecamatan: String(s.kecamatan || ''),
          kabupaten: String(s.kabupaten || ''),
          provinsi: String(s.provinsi || ''),
          bentuk_pendidikan: String(s.bentuk_pendidikan || ''),
          akreditasi: String(s.akreditasi || ''),
        }));

        return NextResponse.json({
          success: true,
          schools: mapped,
          total: mapped.length,
          source: 'dapodik-local',
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: `Gagal mengambil data: ${msg}` }, { status: 502 });
      }
    }

    // ── Action: Fetch Single School by NPSN ──
    if (action === 'school') {
      if (!npsn || !/^\d{8}$/.test(String(npsn))) {
        return NextResponse.json({ error: 'NPSN harus 8 digit angka' }, { status: 400 });
      }

      try {
        const result = await fetchFromDapodik(baseUrl, token, `/${npsn}`);

        if (result.status === 401) {
          return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
        }
        if (result.status === 400) {
          return NextResponse.json({ error: `NPSN ${npsn} tidak ditemukan di database Dapodik lokal.` }, { status: 404 });
        }
        if (result.status !== 200) {
          return NextResponse.json({ error: 'Gagal mengambil data sekolah' }, { status: 502 });
        }

        const d = result.data;
        const schoolType = ['SD', 'SMP'].find(
          (t) => String(d.bentuk_pendidikan || '').toUpperCase().includes(t)
        ) || String(d.bentuk_pendidikan || '');

        return NextResponse.json({
          success: true,
          school: {
            npsn: String(d.npsn || npsn),
            nama: String(d.nama || ''),
            alamat: String(d.alamat || ''),
            kecamatan: String(d.kecamatan || d.desakelurahan || ''),
            kabupaten: String(d.kabupaten || d.kabkotanegara_ln || ''),
            provinsi: String(d.provinsi || d.propinsiluar_negeri_ln || ''),
            bentuk_pendidikan: String(d.bentuk_pendidikan || ''),
            akreditasi: String(d.akreditasi || ''),
            schoolType,
          },
          source: 'dapodik-local',
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: `Gagal mengambil data: ${msg}` }, { status: 502 });
      }
    }

    return NextResponse.json({ error: `Action "${action}" tidak dikenali` }, { status: 400 });
  } catch (error) {
    console.error('[Dapodik Connect Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
