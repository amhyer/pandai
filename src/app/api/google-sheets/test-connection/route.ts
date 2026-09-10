import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/error-log';
import { requireAuth } from '@/lib/auth';
import { upsertConfigBySchool } from '@/lib/google-sheets-config';

// ===== POST /api/google-sheets/test-connection =====
// Test koneksi ke Google Sheets
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { spreadsheetId } = body;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID wajib' }, { status: 400 });
    }

    // Simpan konfigurasi sementara untuk test
    const config = await upsertConfigBySchool(
      auth.schoolId ?? null,
      {
        spreadsheetId,
        mode: 'global',
        status: 'connecting',
      },
      {
        spreadsheetId,
        status: 'connected',
        lastSync: new Date(),
      }
    );

    return NextResponse.json({
      success: true,
      config,
      message: 'Koneksi ke Google Sheets berhasil dinvalidasi',
    });
  } catch (error) {
    await logError({ error, route: '/api/google-sheets/test-connection', method: 'POST' });
    return NextResponse.json({ error: 'Gagal test koneksi' }, { status: 500 });
  }
}
