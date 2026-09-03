import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth';
import type { NpsnSchool } from '@/lib/npsn-database';

const LOCAL_API_TIMEOUT_MS = 8_000;
const NPSN_REGEX = /^\d{8}$/;
const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const ALLOWED_PORTS = new Set(['5774', '8881']);

/** Allowed school types for PANDAI */
const ALLOWED_TYPES = ['SD', 'SMP'];

/**
 * POST /api/schools/lookup-local
 *
 * Body: { serverUrl: string, token: string, npsn: string }
 *
 * Proxies a request to the operator's local Dapodik API
 * running on their laptop (devmaarifnu/dapodik-api).
 *
 * Expected local API response:
 * {
 *   nama: "SD Negeri ...",
 *   npsn: "40313912",
 *   alamat: "Jl. ...",
 *   desakelurahan: "...",
 *   kecamatankota_ln: "...",
 *   kabkotanegara_ln: "...",
 *   propinsiluar_negeri_ln: "...",
 *   bentuk_pendidikan: "SD"
 * }
 */
export async function POST(request: Request) {
  try {
    await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const body = await request.json();
    const { serverUrl, token, npsn } = body;

    if (!serverUrl || !token || !npsn) {
      return NextResponse.json(
        { error: 'URL server, token, dan NPSN wajib diisi' },
        { status: 400 }
      );
    }

    const trimmedNpsn = String(npsn).trim();
    if (!NPSN_REGEX.test(trimmedNpsn)) {
      return NextResponse.json(
        { error: 'NPSN harus 8 digit angka' },
        { status: 400 }
      );
    }

    // Normalize server URL (remove trailing slash)
    let baseUrl = serverUrl.trim().replace(/\/+$/, '');
    // Ensure it starts with http:// or https://
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }

    // SSRF protection: only local Dapodik services on configured ports.
    let parsedBase: URL;
    try {
      parsedBase = new URL(baseUrl);
    } catch {
      return NextResponse.json({ error: 'Format URL server tidak valid' }, { status: 400 });
    }
    if (!ALLOWED_HOSTS.has(parsedBase.hostname) || !ALLOWED_PORTS.has(parsedBase.port)) {
      return NextResponse.json(
        { error: 'Server hanya boleh localhost/127.0.0.1 pada port 5774 atau 8881' },
        { status: 403 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOCAL_API_TIMEOUT_MS);

    try {
      // Build the local Dapodik API URL
      // dapodik-api route: {base_url}/pusatdata/pendidikan/{npsn}
      // Path configurable via config.yaml app.path (default: /pusatdata/pendidikan)
      const apiUrl = `${baseUrl}/pusatdata/pendidikan/${trimmedNpsn}`;

      console.log(`[LocalDapodik] Connecting to ${apiUrl} ...`);

      const res = await fetch(apiUrl, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        const status = res.status;
        let errorDetail = '';
        try {
          const errBody = await res.json();
          errorDetail = errBody.message || errBody.error || '';
        } catch { /* ignore */ }

        if (status === 401) {
          return NextResponse.json(
            { error: 'Token tidak valid atau salah. Pastikan token sesuai dengan config.yaml di laptop.' },
            { status: 400 }
          );
        }
        if (status === 400) {
          return NextResponse.json(
            { error: `NPSN ${trimmedNpsn} tidak ditemukan di database Dapodik lokal. Pastikan data sudah disinkronkan.` },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: `Gagal terhubung ke API Dapodik lokal (HTTP ${status}). ${errorDetail}` },
          { status: 502 }
        );
      }

      const data = await res.json();

      // Check for error response format
      if (data.code && Number(data.code) >= 400) {
        return NextResponse.json(
          { error: data.message || 'Data sekolah tidak ditemukan di database Dapodik lokal' },
          { status: 404 }
        );
      }

      // Map Dapodik local API response to our format
      const schoolName = String(data.nama || '');
      const bentuk = String(data.bentuk_pendidikan || '');

      // Detect school type from bentuk_pendidikan field
      const schoolType = ALLOWED_TYPES.find(
        (t) => bentuk.toUpperCase().includes(t)
      ) || '';

      // Also accept school types like "MI", "MTs"
      const extraTypes: Record<string, string> = { 'MI': 'SD', 'MTs': 'SMP', 'SDLB': 'SD', 'SMPLB': 'SMP' };
      const resolvedType = schoolType || extraTypes[bentuk.toUpperCase()] || '';

      if (!resolvedType || !ALLOWED_TYPES.includes(resolvedType)) {
        return NextResponse.json(
          {
            error: `Sekolah "${schoolName}" (${bentuk}) bukan SD/SMP. PANDAI hanya untuk sekolah dasar dan menengah pertama.`,
            unsupportedType: bentuk,
          },
          { status: 400 }
        );
      }

      if (!schoolName) {
        return NextResponse.json(
          { error: 'Data sekolah kosong dari API Dapodik lokal' },
          { status: 500 }
        );
      }

      const school: NpsnSchool & { source: string; sourceDetail: string } = {
        npsn: String(data.npsn || trimmedNpsn),
        name: schoolName,
        address: String(data.alamat || ''),
        province: String(data.provinsi || data.propinsiluar_negeri_ln || '').replace(/^PROV\.\s*/i, ''),
        city: String(data.kabupaten || data.kabkotanegara_ln || '').replace(/^(KAB\.|KOTA)\s*/i, ''),
        district: String(data.kecamatan || data.desakelurahan || data.kecamatankota_ln || '').replace(/^KEC\.\s*/i, ''),
        principalName: '',
        accreditation: String(data.akreditasi || ''),
        schoolType: resolvedType,
        established: '',
        curriculum: '',
        phone: String(data.telepon || ''),
        email: String(data.email || ''),
        emailDomain: '',
        source: 'dapodik-local',
        sourceDetail: `Data dari Dapodik lokal (${baseUrl})`,
      };

      console.log(`[LocalDapodik] Found: ${school.name} (${schoolType}) from ${baseUrl}`);
      return NextResponse.json([school]);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return NextResponse.json(
          { error: `Koneksi ke ${baseUrl} timeout. Pastikan API Dapodik berjalan dan dapat diakses dari jaringan ini.` },
          { status: 504 }
        );
      }
      return NextResponse.json(
        {
          error: `Gagal terhubung ke ${baseUrl}. Pastikan:\n1. API Dapodik sudah berjalan di laptop\n2. Port benar (default: 8881)\n3. Laptop dan perangkat ini dalam jaringan yang sama\n4. Firewall tidak memblokir koneksi`,
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Local Dapodik lookup error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
