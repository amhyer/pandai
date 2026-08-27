import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════
// API Proxy untuk Dapodik Lokal WebService
// Mengambil data langsung dari Dapodik Lokal (PDIP) yang berjalan
// di komputer operator sekolah.
//
// Endpoints Dapodik Lokal:
//   http://localhost:5774/WebService/getSekolah?npsn=...
//   http://localhost:5774/WebService/getGtk?npsn=...
//   http://localhost:5774/WebService/getPesertaDidik?npsn=...
//   http://localhost:5774/WebService/getRombonganBelajar?npsn=...
// ═══════════════════════════════════════════════════════════════════════

const DAPODIK_LOCAL_BASE = 'http://localhost:5774/WebService';

interface ProxyRequest {
  npsn: string;
  token: string;
  endpoint: 'getSekolah' | 'getGtk' | 'getPesertaDidik' | 'getRombonganBelajar';
}

export async function POST(request: Request) {
  try {
    const body: ProxyRequest = await request.json();
    const { npsn, token, endpoint } = body;

    // ── Validation ──
    if (!npsn || !token || !endpoint) {
      return NextResponse.json(
        { error: 'NPSN, Token Dapodik, dan endpoint wajib diisi.' },
        { status: 400 }
      );
    }

    const validEndpoints = ['getSekolah', 'getGtk', 'getPesertaDidik', 'getRombonganBelajar'];
    if (!validEndpoints.includes(endpoint)) {
      return NextResponse.json(
        { error: `Endpoint tidak valid. Pilihan: ${validEndpoints.join(', ')}` },
        { status: 400 }
      );
    }

    // ── Build Dapodik Lokal URL ──
    const url = `${DAPODIK_LOCAL_BASE}/${endpoint}?npsn=${encodeURIComponent(npsn)}`;

    // ── Fetch from Dapodik Lokal ──
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeout);

      const errMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';

      if (errMsg.includes('abort') || errMsg.includes('timeout')) {
        return NextResponse.json({
          success: false,
          error: 'Timeout menghubungi Dapodik Lokal.',
          detail: 'Pastikan Dapodik Lokal berjalan dan dapat diakses. Biasanya di http://localhost:5774',
        }, { status: 504 });
      }

      if (errMsg.includes('ECONNREFUSED') || errMsg.includes('connect')) {
        return NextResponse.json({
          success: false,
          error: 'Tidak terhubung dengan Dapodik Lokal.',
          detail: 'Pastikan aplikasi Dapodik Lokal (PDIP/Dapodik Terpadu) sudah berjalan di komputer Anda. Periksa apakah layanan WebService aktif di port 5774.',
        }, { status: 503 });
      }

      return NextResponse.json({
        success: false,
        error: 'Gagal menghubungi Dapodik Lokal.',
        detail: errMsg,
      }, { status: 502 });
    }

    clearTimeout(timeout);

    // ── Check response ──
    if (response.status === 403) {
      return NextResponse.json({
        success: false,
        error: 'Token Dapodik tidak berfungsi.',
        detail: 'Ingat tekan tombol "Simpan" di halaman WebService Dapodik Lokal setelah memasukkan API Key.',
      }, { status: 403 });
    }

    if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Token Dapodik tidak valid atau sudah expired.',
        detail: 'Buka Dapodik Lokal → Pengaturan → WebService → Buat token baru.',
      }, { status: 401 });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json({
        success: false,
        error: `Dapodik Lokal mengembalikan error: HTTP ${response.status}`,
        detail: errorText,
      }, { status: response.status });
    }

    // ── Parse JSON response ──
    const data = await response.json().catch(() => null);

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Respons dari Dapodik Lokal bukan format JSON yang valid.',
        detail: 'Pastikan WebService Dapodik Lokal sudah dikonfigurasi dengan benar.',
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      endpoint,
      npsn,
      totalRecords: Array.isArray(data) ? data.length : 0,
      data,
    });

  } catch (error: unknown) {
    console.error('[Dapodik Proxy Error]', error);
    const msg = error instanceof Error ? error.message : 'Terjadi kesalahan tidak terduga.';
    return NextResponse.json(
      { error: `Gagal mengambil data dari Dapodik Lokal: ${msg}` },
      { status: 500 }
    );
  }
}
