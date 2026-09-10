import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { logAccess } from '@/lib/audit-log';
import { upsertConfigBySchool } from '@/lib/google-sheets-config';

// ===== GET /api/google-sheets/setup =====
// Menampilkan konfigurasi Google Sheets saat ini
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);

    const config = await db.googleSheetsConfig.findFirst({
      where: auth.role === 'SUPER_ADMIN' ? {} : { schoolId: auth.schoolId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    return NextResponse.json({
      config: config || null,
      userSchoolId: auth.schoolId,
      role: auth.role,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/google-sheets/setup', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil konfigurasi Google Sheets' }, { status: 500 });
  }
}

// ===== POST /api/google-sheets/setup =====
// Mengkonfigurasi Google Sheets (simpan konfigurasi)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const body = await req.json();
    const { schoolId, spreadsheetId, mode, status } = body;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID wajib diisi' }, { status: 400 });
    }

    if (mode !== 'global' && mode !== 'per_class') {
      return NextResponse.json({ error: 'Mode tidak valid. Gunakan "global" atau "per_class"' }, { status: 400 });
    }

    const effectiveSchoolId = auth.role === 'SUPER_ADMIN' ? schoolId : auth.schoolId;

    const config = await upsertConfigBySchool(
      effectiveSchoolId ?? null,
      {
        spreadsheetId,
        mode: mode || 'global',
        status: status || 'pending',
      },
      {
        spreadsheetId,
        mode: mode || 'global',
        status: status || 'pending',
      }
    );

    // Log aktivitas
    try {
      await logAccess(auth, {
        action: 'CREATE',
        resourceType: 'google-sheets-config',
        targetUserId: effectiveSchoolId,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      config,
      message: 'Konfigurasi Google Sheets berhasil disimpan',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/google-sheets/setup', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menyimpan konfigurasi Google Sheets' }, { status: 500 });
  }
}
