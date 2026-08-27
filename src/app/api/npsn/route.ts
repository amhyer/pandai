import { NextResponse } from 'next/server';

/**
 * ═══════════════════════════════════════════════════════════════
 * NPSN API — Advanced School Lookup
 * Endpoint: GET /api/npsn?...
 *
 * Uses: https://sekolah.devapi.id/sekolah
 *
 * Supported parameters:
 *   npsn              - Exact NPSN lookup (8 digits)
 *   nama              - School name search (min 3 chars, case-insensitive)
 *   bentuk_pendidikan - Filter by type: SD, MI, SMP, MTS, SMA, MA, TK, etc
 *   akreditasi        - Filter by accreditation: A, B, C
 *   kode_wilayah      - Filter by Kemendagri region code
 *   limit             - Max results (default: 10, max: 100)
 *
 * Rate limit: 60 requests/min (cache HIT = no deduction)
 * ═══════════════════════════════════════════════════════════════
 */

const API_BASE = 'https://sekolah.devapi.id/sekolah';
const API_TIMEOUT_MS = 10_000;

/** Bentuk pendidikan yang didukung sistem PANDAI (SD = Kelas 1-6, SMP = Kelas 7-9) */
const ALLOWED_BENTUK = ['SD', 'MI', 'SMP', 'MTS'];

function bentukToSchoolType(bentuk: string): 'SD' | 'SMP' | null {
  const upper = bentuk.toUpperCase().trim();
  if (['SD', 'MI'].includes(upper)) return 'SD';
  if (['SMP', 'MTS'].includes(upper)) return 'SMP';
  return null;
}

// ─── API Types ────────────────────────────────────────────────

interface ApiSchool {
  npsn: string;
  nama: string;
  bentukPendidikan: string;
  jalurPendidikan: string;
  jenjangPendidikan: string;
  kementerianPembina: string;
  statusSatuanPendidikan: string;
  akreditasi: string;
  jenisPendidikan: string;
  alamat: {
    jalan?: string;
    nama_dusun?: string;
    nama_desa?: string;
    nama_kecamatan?: string;
    nama_kabupaten?: string;
    nama_provinsi?: string;
    kode_provinsi?: number;
    kode_kabupaten?: number;
    kode_kecamatan?: number;
    kode_wilayah?: number;
  };
  kontak: {
    nomor_telepon?: string;
    email?: string;
    website?: string;
  };
  sarana_prasarana?: {
    luas_tanah_milik?: string;
    sumber_listrik?: string;
    akses_internet?: string;
  };
  lokasi?: {
    koordinat?: [number, number];
    lintang?: number;
    bujur?: number;
  };
}

/** Full school detail for NPSN lookup */
interface NpsnDetail {
  npsn: string;
  nama: string;
  bentukPendidikan: string;
  schoolType: 'SD' | 'SMP' | null;
  jalurPendidikan: string;
  jenjangPendidikan: string;
  status: string;
  akreditasi: string;
  alamat: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kodeWilayah: number;
  telepon: string;
  email: string;
  website: string;
  supported: boolean;
  /** Reason if not supported */
  unsupportedReason?: string;
}

/** Summary for list/search results */
interface NpsnSummary {
  npsn: string;
  nama: string;
  bentukPendidikan: string;
  schoolType: 'SD' | 'SMP' | null;
  status: string;
  akreditasi: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kodeWilayah: number;
  telepon: string;
  email: string;
}

// ─── Fetch Helper ─────────────────────────────────────────────

async function fetchFromApi(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.warn(`[NPSN-API] HTTP ${res.status} for ${url}`);
      return null;
    }
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) {
      return null;
    }
    return json.data as ApiSchool[];
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn(`[NPSN-API] Timeout (${API_TIMEOUT_MS}ms) for ${url}`);
    } else {
      console.warn(`[NPSN-API] Error:`, err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Mappers ─────────────────────────────────────────────────

function mapToDetail(s: ApiSchool): NpsnDetail {
  const isSupported = ALLOWED_BENTUK.includes(s.bentukPendidikan?.toUpperCase().trim());
  return {
    npsn: s.npsn,
    nama: s.nama,
    bentukPendidikan: s.bentukPendidikan,
    schoolType: bentukToSchoolType(s.bentukPendidikan),
    jalurPendidikan: s.jalurPendidikan || '',
    jenjangPendidikan: s.jenjangPendidikan || '',
    status: s.statusSatuanPendidikan,
    akreditasi: s.akreditasi || '',
    alamat: [
      s.alamat?.jalan || '',
      s.alamat?.nama_desa ? `Desa ${s.alamat.nama_desa}` : '',
      s.alamat?.nama_dusun ? `Dusun ${s.alamat.nama_dusun}` : '',
    ].filter(Boolean).join(', '),
    desa: s.alamat?.nama_desa || '',
    kecamatan: s.alamat?.nama_kecamatan || '',
    kabupaten: s.alamat?.nama_kabupaten || '',
    provinsi: s.alamat?.nama_provinsi || '',
    kodeWilayah: s.alamat?.kode_wilayah || 0,
    telepon: s.kontak?.nomor_telepon || '',
    email: s.kontak?.email || '',
    website: s.kontak?.website || '',
    supported: isSupported,
    unsupportedReason: isSupported ? undefined : `Sistem PANDAI hanya mendukung SD/MI/SMP/MTs. Sekolah ini adalah ${s.bentukPendidikan}`,
  };
}

function mapToSummary(s: ApiSchool): NpsnSummary {
  return {
    npsn: s.npsn,
    nama: s.nama,
    bentukPendidikan: s.bentukPendidikan,
    schoolType: bentukToSchoolType(s.bentukPendidikan),
    status: s.statusSatuanPendidikan,
    akreditasi: s.akreditasi || '',
    kecamatan: s.alamat?.nama_kecamatan || '',
    kabupaten: s.alamat?.nama_kabupaten || '',
    provinsi: s.alamat?.nama_provinsi || '',
    kodeWilayah: s.alamat?.kode_wilayah || 0,
    telepon: s.kontak?.nomor_telepon || '',
    email: s.kontak?.email || '',
  };
}

// ─── GET Handler ──────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const npsn = searchParams.get('npsn');
    const nama = searchParams.get('nama');
    const bentuk_pendidikan = searchParams.get('bentuk_pendidikan');
    const akreditasi = searchParams.get('akreditasi');
    const kode_wilayah = searchParams.get('kode_wilayah');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    // ── NPSN exact lookup ────────────────────────────────────
    if (npsn && npsn.trim()) {
      const trimmed = npsn.trim();
      if (!/^\d{8}$/.test(trimmed)) {
        return NextResponse.json({ error: 'NPSN harus 8 digit angka' }, { status: 400 });
      }

      const url = `${API_BASE}?npsn=${trimmed}`;
      const data = await fetchFromApi(url);
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Sekolah dengan NPSN tersebut tidak ditemukan' }, { status: 404 });
      }

      const detail = mapToDetail(data[0]);
      return NextResponse.json(detail);
    }

    // ── Name / Advanced search ────────────────────────────────
    if (nama && nama.trim()) {
      const trimmed = nama.trim();
      if (trimmed.length < 3) {
        return NextResponse.json({ error: 'Nama sekolah minimal 3 karakter' }, { status: 400 });
      }

      // Build query params
      const params = new URLSearchParams();
      params.set('nama', trimmed);
      params.set('limit', String(limit));

      // Optional filters from API
      if (bentuk_pendidikan) params.set('bentuk_pendidikan', bentuk_pendidikan);
      if (akreditasi) params.set('akreditasi', akreditasi);
      if (kode_wilayah) params.set('kode_wilayah', kode_wilayah);

      const url = `${API_BASE}?${params.toString()}`;
      const data = await fetchFromApi(url);

      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 });
      }

      // If no bentuk_pendidikan filter, filter client-side for SD/SMP only
      let results = data;
      if (!bentuk_pendidikan) {
        results = data.filter((s: ApiSchool) =>
          ALLOWED_BENTUK.includes(s.bentukPendidikan?.toUpperCase().trim())
        );
      }

      return NextResponse.json({
        data: results.map(mapToSummary),
        total: results.length,
        limit,
      });
    }

    return NextResponse.json(
      { error: 'Parameter npsn atau nama wajib diisi. Opsional: bentuk_pendidikan, akreditasi, kode_wilayah, limit' },
      { status: 400 }
    );
  } catch (error) {
    console.error('NPSN API error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data sekolah' }, { status: 500 });
  }
}
