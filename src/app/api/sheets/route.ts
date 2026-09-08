import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';
import { isSupportedSheet } from '@/lib/google-sheets/mapping';
import type { SheetsSyncFrequency, SheetsSyncMode } from '@/lib/google-sheets/types';

/** Ringkas config tanpa menampakan token (bahkan terenkripsi). */
function toPublicConfig(c: {
  id: string;
  schoolId: string;
  spreadsheetId: string | null;
  sheetName: string;
  mode: string;
  status: string;
  lastSyncAt: Date | null;
  lastSyncRows: number | null;
  lastError: string | null;
  scheduleFrequency: string;
  encryptedAccessToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    schoolId: c.schoolId,
    spreadsheetId: c.spreadsheetId,
    sheetName: c.sheetName,
    mode: c.mode,
    status: c.status,
    lastSyncAt: c.lastSyncAt,
    lastSyncRows: c.lastSyncRows,
    lastError: c.lastError,
    scheduleFrequency: c.scheduleFrequency,
    hasTokens: Boolean(c.encryptedAccessToken),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// ===== GET /api/sheets =====
// Konfigurasi Google Sheets untuk sekolah user (SUPER_ADMIN: ?schoolId= opsional)
export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');

    if (!auth.schoolId && auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Akun tidak terikat sekolah' }, { status: 400 });
    }
    const targetSchoolId = auth.role === 'SUPER_ADMIN' ? schoolIdParam || null : auth.schoolId;
    if (!targetSchoolId) {
      return NextResponse.json({ config: null, connected: false });
    }

    const config = await db.googleSheetsConfig.findFirst({
      where: { schoolId: targetSchoolId },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      config: config ? toPublicConfig(config) : null,
      connected: config?.status === 'connected',
      schoolId: targetSchoolId,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/sheets', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil konfigurasi Google Sheets' }, { status: 500 });
  }
}

// ===== POST /api/sheets =====
// Simpan/update konfigurasi: spreadsheetId, sheetName, mode, scheduleFrequency
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const schoolId = auth.role === 'SUPER_ADMIN' ? null : auth.schoolId;
    if (!schoolId) return NextResponse.json({ error: 'Akun tidak terikat sekolah' }, { status: 400 });

    const body = await request.json();
    const { spreadsheetId, sheetName, mode, scheduleFrequency } = body as {
      spreadsheetId?: string;
      sheetName?: string;
      mode?: SheetsSyncMode;
      scheduleFrequency?: SheetsSyncFrequency;
    };

    if (!spreadsheetId || typeof spreadsheetId !== 'string') {
      return NextResponse.json({ error: 'Spreadsheet ID wajib diisi' }, { status: 400 });
    }
    const trimmedId = spreadsheetId.trim();
    if (!/^[\w-]{10,}$/.test(trimmedId)) {
      return NextResponse.json({ error: 'Spreadsheet ID tidak valid' }, { status: 400 });
    }
    const effSheetName = (sheetName ?? 'NILAI').trim().toUpperCase();
    if (!isSupportedSheet(effSheetName)) {
      return NextResponse.json({ error: 'Sheet harus "SISWA" atau "NILAI"' }, { status: 400 });
    }
    const effMode: SheetsSyncMode = mode === 'per_class' ? 'per_class' : 'all';
    const effFrequency: SheetsSyncFrequency =
      scheduleFrequency === 'hourly' || scheduleFrequency === 'daily' ? scheduleFrequency : 'none';

    const existing = await db.googleSheetsConfig.findFirst({ where: { schoolId } });

    const config = existing
      ? await db.googleSheetsConfig.update({
          where: { id: existing.id },
          data: {
            spreadsheetId: trimmedId,
            sheetName: effSheetName,
            mode: effMode,
            scheduleFrequency: effFrequency,
            // Ganti spreadsheet => status kembali pending sampai OAuth ulang
            ...(existing.spreadsheetId !== trimmedId ? { status: 'pending' as const } : {}),
          },
        })
      : await db.googleSheetsConfig.create({
          data: {
            schoolId,
            spreadsheetId: trimmedId,
            sheetName: effSheetName,
            mode: effMode,
            scheduleFrequency: effFrequency,
            status: 'pending',
          },
        });

    return NextResponse.json({ success: true, config: toPublicConfig(config) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/sheets', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menyimpan konfigurasi Google Sheets' }, { status: 500 });
  }
}
