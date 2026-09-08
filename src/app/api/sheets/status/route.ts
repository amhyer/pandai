import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';
import { decryptText } from '@/lib/encryption';
import { createSheetsClient } from '@/lib/google-sheets/client';

/**
 * Hitung waktu hingga sync berikutnya berdasarkan scheduleFrequency.
 */
function nextSyncAt(frequency: string, lastSyncAt: Date | null): string | null {
  if (frequency === 'none' || !lastSyncAt) return null;
  const hours = frequency === 'hourly' ? 1 : 24;
  return new Date(lastSyncAt.getTime() + hours * 3_600_000).toISOString();
}

// ===== GET /api/sheets/status =====
// Status koneksi + info sheet dari Google (bila terhubung).
export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');

    const schoolId = auth.role === 'SUPER_ADMIN' ? schoolIdParam || auth.schoolId : auth.schoolId;
    if (!schoolId) {
      return NextResponse.json({ connected: false, config: null });
    }

    const config = await db.googleSheetsConfig.findFirst({
      where: { schoolId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!config) {
      return NextResponse.json({ connected: false, config: null });
    }

    const base = {
      schoolId,
      spreadsheetId: config.spreadsheetId,
      sheetName: config.sheetName,
      mode: config.mode,
      status: config.status,
      lastSyncAt: config.lastSyncAt,
      lastSyncRows: config.lastSyncRows,
      lastError: config.lastError,
      scheduleFrequency: config.scheduleFrequency,
      nextSyncAt: nextSyncAt(config.scheduleFrequency, config.lastSyncAt),
      hasTokens: Boolean(config.encryptedAccessToken),
    };

    // Jika terhubung & ada spreadsheetId, ambil metadata sheet dari Google
    if (config.status === 'connected' && config.spreadsheetId && config.encryptedAccessToken) {
      try {
        const accessToken = decryptText(config.encryptedAccessToken);
        const client = createSheetsClient({
          accessToken,
          refreshToken: config.encryptedRefreshToken ? safeDecrypt(config.encryptedRefreshToken) : null,
        });
        const meta = await client.getSpreadsheet(config.spreadsheetId);
        return NextResponse.json({ connected: true, config: base, sheetMeta: meta });
      } catch {
        return NextResponse.json({ connected: true, config: base, sheetMeta: null, metaError: 'Gagal membaca metadata sheet' });
      }
    }

    return NextResponse.json({ connected: config.status === 'connected', config: base, sheetMeta: null });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/sheets/status', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil status Google Sheets' }, { status: 500 });
  }
}

function safeDecrypt(payload: string): string | null {
  try {
    return decryptText(payload);
  } catch {
    return null;
  }
}
