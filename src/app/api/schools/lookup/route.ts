import { NextResponse } from 'next/server';
import { lookupSchool, type NpsnSchool } from '@/lib/npsn-database';

const DAPODIK_TIMEOUT_MS = 5_000;
const MAX_RESULTS = 10;
const NPSN_REGEX = /^\d{8}$/;

/**
 * Attempt to fetch school data from the live DAPODIK API.
 * Returns null on any failure (WAF block, timeout, parse error, etc.)
 */
async function fetchFromDapodik(npsn: string): Promise<(NpsnSchool & { source: string }) | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DAPODIK_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://dapo.kemendikdasmen.go.id/api/detail-sekolah?npsn=${npsn}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      },
    );

    if (!res.ok) {
      console.warn(`[DAPODIK] HTTP ${res.status} for NPSN ${npsn}`);
      return null;
    }

    const data = await res.json();

    // The DAPODIK API may return data in different shapes;
    // try to map whatever fields are available.
    const school: NpsnSchool & { source: string } = {
      npsn: String(data.npsn ?? data.NPSN ?? npsn),
      name: String(data.nama_sekolah ?? data.namaSekolah ?? data.sekolah ?? data.name ?? ''),
      address: String(data.alamat ?? data.address ?? ''),
      province: String(data.propinsi ?? data.provinsi ?? data.province ?? ''),
      city: String(data.kabupaten_kota ?? data.kabupatenKota ?? data.kota ?? data.city ?? ''),
      district: String(data.kecamatan ?? data.district ?? ''),
      principalName: String(data.kepala_sekolah ?? data.kepalaSekolah ?? data.principalName ?? ''),
      accreditation: String(data.akreditasi ?? data.accreditation ?? ''),
      schoolType: String(data.bentuk_pendidikan ?? data.bentukPendidikan ?? data.jenjang ?? data.schoolType ?? ''),
      established: String(data.tahun_berdiri ?? data.tahunBerdiri ?? data.established ?? ''),
      curriculum: String(data.kurikulum ?? data.curriculum ?? ''),
      phone: String(data.telepon ?? data.no_telp ?? data.phone ?? ''),
      email: String(data.email ?? data.email_sekolah ?? data.emailSekolah ?? ''),
      emailDomain: String(data.email ?? data.emailDomain ?? ''),
      source: 'dapodik-live',
    };

    // Validate that we got at least a school name
    if (!school.name) {
      console.warn(`[DAPODIK] Empty school name for NPSN ${npsn}`);
      return null;
    }

    console.log(`[DAPODIK] Successfully fetched NPSN ${npsn}: ${school.name}`);
    return school;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn(`[DAPODIK] Timeout (${DAPODIK_TIMEOUT_MS}ms) for NPSN ${npsn}`);
    } else {
      console.warn(`[DAPODIK] Error fetching NPSN ${npsn}:`, err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || !q.trim()) {
      return NextResponse.json({ error: 'Parameter q wajib diisi' }, { status: 400 });
    }

    const trimmed = q.trim();

    // --- NPSN exact lookup path (8 digits) ---
    if (NPSN_REGEX.test(trimmed)) {
      // Try DAPODIK live API first
      const liveResult = await fetchFromDapodik(trimmed);
      if (liveResult) {
        return NextResponse.json([liveResult]);
      }

      // Fallback to local database
      console.log(`[Lookup] DAPODIK failed/unavailable for NPSN ${trimmed}, falling back to local DB`);
      const localResults = lookupSchool(trimmed);
      return NextResponse.json(localResults.slice(0, MAX_RESULTS));
    }

    // --- Name / partial search path (non-NPSN queries) ---
    // Always use local database for name searches (DAPODIK search API is behind WAF)
    const results = lookupSchool(trimmed);
    return NextResponse.json(results.slice(0, MAX_RESULTS));
  } catch (error) {
    console.error('School lookup error:', error);
    return NextResponse.json({ error: 'Gagal mencari data sekolah' }, { status: 500 });
  }
}
