import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';
import { decryptText } from '@/lib/encryption';
import { createSheetsClient } from '@/lib/google-sheets/client';
import { buildScoreRows, buildStudentRows, SheetsNotConfiguredError } from '@/lib/google-sheets/sync';

/**
 * Push dataset tertentu ke sheet (tambah baris, tanpa menghapus data lama).
 * Dipakai untuk push data parsial, mis. hanya kelas tertentu atau satu mapel.
 */

// ===== POST /api/sheets/push =====
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const schoolId = auth.role === 'SUPER_ADMIN' ? null : auth.schoolId;

    const body = (await request.json().catch(() => ({}))) as {
      type?: 'SISWA' | 'NILAI';
      schoolId?: string;
      classId?: string;
      subjectId?: string;
    };

    const targetSchoolId = auth.role === 'SUPER_ADMIN' ? body.schoolId || schoolId : schoolId;
    if (!targetSchoolId) {
      return NextResponse.json({ error: 'Tidak ada sekolah tujuan' }, { status: 400 });
    }

    const type = body.type ?? 'NILAI';
    const config = await db.googleSheetsConfig.findFirst({ where: { schoolId: targetSchoolId } });
    if (!config || config.status !== 'connected' || !config.spreadsheetId) {
      throw new SheetsNotConfiguredError();
    }
    if (!config.encryptedAccessToken) throw new SheetsNotConfiguredError();

    const accessToken = decryptText(config.encryptedAccessToken);
    const client = createSheetsClient({
      accessToken,
      refreshToken: config.encryptedRefreshToken ? safeDecrypt(config.encryptedRefreshToken) : null,
    });

    // Bangun baris (filter opsional: kelas / mapel)
    let values: (string | number)[][] = [];
    if (type === 'SISWA') {
      const rows = await buildStudentRows(targetSchoolId);
      values = rows
        .filter((r) => !body.classId || r.Kelas === body.classId)
        .map((r) => [r.NISN, r.Nama, r.JK, r.Kelas, r['No. HP Ortu'], r['Nama Ortu/Wali']]);
    } else {
      const rows = await buildScoreRows(targetSchoolId);
      values = rows
        .filter((r) => (!body.classId || r.Kelas === body.classId) && (!body.subjectId || r.Mapel === body.subjectId))
        .map((r) => [r.NISN, r.Nama, r.Kelas, r.Mapel, r.Nilai, r.Ketepatan, r['Prediksi TKA'], r.Tanggal, r.Keterangan]);
    }

    // Append (tambah di bawah data yang ada)
    const append = await client.appendValues(config.spreadsheetId, `'${type}'!A1`, values);

    await db.googleSheetsConfig
      .update({ where: { id: config.id }, data: { lastSyncAt: new Date(), lastSyncRows: values.length, lastError: null } })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      type,
      rows: values.length,
      range: append.updates?.updatedRange,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logError({ error, route: '/api/sheets/push', method: 'POST' });
    return NextResponse.json({ error: 'Gagal push data ke Google Sheets' }, { status: 500 });
  }
}

function safeDecrypt(payload: string): string | null {
  try {
    return decryptText(payload);
  } catch {
    return null;
  }
}
