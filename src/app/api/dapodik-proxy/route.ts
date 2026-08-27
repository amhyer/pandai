import { NextRequest, NextResponse } from 'next/server';

/**
 * Dapodik Lokal Proxy API
 * 
 * Forwards requests from browser to Dapodik Lokal Web Service,
 * bypassing CORS restrictions (server-to-server = no CORS).
 * 
 * Dapodik Lokal endpoints use /rest/ prefix:
 *   /rest/Sekolah          → Data Sekolah
 *   /rest/Ptk              → Data Guru/PTK
 *   /rest/PesertaDidik     → Data Siswa
 *   /rest/RombonganBelajar → Data Rombongan Belajar (Rombel)
 *   /rest/Pembelajaran     → Jadwal Mengajar
 *   /rest/WsAplikasi       → Data Aplikasi
 * 
 * Parameters use sekolah_id (UUID format), not NPSN.
 * Auth: Bearer token from Dapodik Web Service menu.
 * 
 * Usage: GET /api/dapodik-proxy?endpoint=Sekolah&server=http://localhost:5774&sekolah_id={UUID}&token={TOKEN}
 */

const ALLOWED_ENDPOINTS = [
  'Sekolah',
  'Ptk',
  'PesertaDidik',
  'RombonganBelajar',
  'Pembelajaran',
  'WsAplikasi',
  'MataPelajaran',
  'Prasarana',
  'TenagaAdministrasi',
  'SatuanPendidikan',
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint');
    const server = searchParams.get('server') || 'http://localhost:5774';
    const sekolah_id = searchParams.get('sekolah_id');
    const token = searchParams.get('token');
    const page = searchParams.get('page') || '1';
    const start = searchParams.get('start') || '0';
    const limit = searchParams.get('limit') || '100';

    // Validate required params
    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Parameter "endpoint" wajib diisi (contoh: Sekolah, Ptk, PesertaDidik)' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Parameter "token" wajib diisi. Token didapat dari menu Web Service di Dapodik Lokal.' },
        { status: 400 }
      );
    }

    // Validate endpoint
    if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
      return NextResponse.json(
        { success: false, error: `Endpoint "${endpoint}" tidak diizinkan. Yang valid: ${ALLOWED_ENDPOINTS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate server URL (only allow localhost/127.0.0.1)
    let parsedServer: URL;
    try {
      parsedServer = new URL(server);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Format URL server tidak valid' },
        { status: 400 }
      );
    }

    if (!['localhost', '127.0.0.1', '[::1]'].includes(parsedServer.hostname)) {
      return NextResponse.json(
        { success: false, error: 'Server hanya boleh localhost atau 127.0.0.1 (karena keamanan)' },
        { status: 400 }
      );
    }

    // Build Dapodik URL
    let dapodikUrl: string;
    const origin = parsedServer.origin;

    if (sekolah_id) {
      // With sekolah_id filter
      dapodikUrl = `${origin}/rest/${endpoint}?sekolah_id=${encodeURIComponent(sekolah_id)}&page=${page}&start=${start}&limit=${limit}`;
    } else {
      // Without sekolah_id (e.g., WsAplikasi)
      dapodikUrl = `${origin}/rest/${endpoint}?page=${page}&start=${start}&limit=${limit}`;
    }

    console.log(`[Dapodik Proxy] Fetching: ${dapodikUrl}`);

    // Forward request to Dapodik
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const resp = await fetch(dapodikUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseText = await resp.text();
      console.log(`[Dapodik Proxy] Response: ${resp.status}, length: ${responseText.length}`);

      // Try to parse as JSON
      let jsonData: unknown;
      try {
        jsonData = JSON.parse(responseText);
      } catch {
        return NextResponse.json({
          success: false,
          status: resp.status,
          isJson: false,
          rawText: responseText.substring(0, 5000),
          hint: 'Respons dari Dapodik bukan format JSON. Mungkin Web Service tidak aktif.',
        }, { status: resp.ok ? 200 : 502 });
      }

      return NextResponse.json({
        success: true,
        status: resp.status,
        endpoint: endpoint,
        data: jsonData,
        rawLength: responseText.length,
      });

    } catch (fetchError: unknown) {
      clearTimeout(timeout);
      throw fetchError;
    }

  } catch (error: unknown) {
    const err = error as Error;

    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('fetch failed')) {
      return NextResponse.json({
        success: false,
        error: `Tidak dapat terhubung ke Dapodik Lokal di ${request.nextUrl.searchParams.get('server') || 'localhost:5774'}.\n\nPastikan:\n1. Aplikasi Dapodik Lokal sedang berjalan\n2. Web Service aktif\n3. Token sudah dibuat di menu Web Service`,
        code: 'CONNECTION_REFUSED',
      }, { status: 502 });
    }

    if (err.name === 'AbortError') {
      return NextResponse.json({
        success: false,
        error: 'Timeout — Dapodik tidak merespons dalam 30 detik.',
        code: 'TIMEOUT',
      }, { status: 504 });
    }

    console.error('[Dapodik Proxy] Error:', err);
    return NextResponse.json({
      success: false,
      error: `Error proxy: ${err.message}`,
      code: 'PROXY_ERROR',
    }, { status: 500 });
  }
}
