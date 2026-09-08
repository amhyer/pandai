/**
 * Sinkronisasi data PANDAI -> Google Sheets.
 *
 * Dua dataset:
 *  - SISWA : daftar siswa (NISN, nama, kelas, ortu)
 *  - NILAI : nilai tryout/attempt per siswa per mapel (terakhir per siswa+mapel)
 *
 * Setiap sync menimpa sheet target (clear + tulis header + baris) agar sheet
 * selalu mencerminkan kondisi DB saat ini (idempoten).
 */

import { db } from '@/lib/db';
import { decryptText } from '@/lib/encryption';
import { createSheetsClient, SheetsApiError } from './client';
import { NILAI_COLUMNS, SISWA_COLUMNS, toScoreRowValues, toStudentRowValues } from './mapping';
import type { ScoreSheetRow, SheetsSyncResult, StudentSheetRow } from './types';
import type { SheetsTokens } from './oauth';

export class SheetsNotConfiguredError extends Error {
  constructor() {
    super('Google Sheets belum terhubung. Hubungkan dulu melalui Pengaturan Aplikasi.');
    this.name = 'SheetsNotConfiguredError';
  }
}

interface ResolvedConfig {
  id: string;
  schoolId: string;
  spreadsheetId: string;
  sheetName: string;
  accessToken: string;
  refreshToken: string | null;
}

/** Muat config sekolah, verifikasi terhubung, dan dekripsi token. */
async function resolveConfig(schoolId: string): Promise<ResolvedConfig> {
  const config = await db.googleSheetsConfig.findFirst({
    where: { schoolId },
    orderBy: { updatedAt: 'desc' },
  });
  if (!config) throw new SheetsNotConfiguredError();
  if (config.status !== 'connected') {
    throw new SheetsNotConfiguredError();
  }
  if (!config.encryptedAccessToken) throw new SheetsNotConfiguredError();

  let accessToken: string;
  try {
    accessToken = decryptText(config.encryptedAccessToken);
  } catch {
    // Token korup/rotasi secret — tandai error agar admin tahu
    await db.googleSheetsConfig.update({
      where: { id: config.id },
      data: { status: 'error', lastError: 'Token tersimpan tidak valid (AES_SECRET berubah?)' },
    }).catch(() => {});
    throw new SheetsNotConfiguredError();
  }

  return {
    id: config.id,
    schoolId: config.schoolId,
    spreadsheetId: config.spreadsheetId,
    sheetName: config.sheetName,
    accessToken,
    refreshToken: config.encryptedRefreshToken ? safeDecrypt(config.encryptedRefreshToken) : null,
  };
}

function safeDecrypt(payload: string): string | null {
  try {
    return decryptText(payload);
  } catch {
    return null;
  }
}

/** Ambil baris data siswa sekolah. */
export async function buildStudentRows(schoolId: string): Promise<StudentSheetRow[]> {
  const students = await db.user.findMany({
    where: { role: 'SISWA', schoolId, isActive: true },
    include: { class: { select: { name: true } }, parent: { select: { name: true, phone: true } } },
    orderBy: { name: 'asc' },
  });

  return students.map((s) => ({
    NISN: s.nisn ?? '',
    Nama: s.name,
    JK: s.jk ?? '',
    Kelas: s.class?.name ?? '',
    'No. HP Ortu': s.parent?.phone ?? '',
    'Nama Ortu/Wali': s.parent?.name ?? '',
  }));
}

/** Ambil baris nilai: attempt terakhir per siswa per mapel (non-remedial). */
export async function buildScoreRows(schoolId: string): Promise<ScoreSheetRow[]> {
  const attempts = await db.studentAttempt.findMany({
    where: { schoolId, isRemedial: false, status: { in: ['submitted', 'graded'] } },
    include: {
      user: { select: { nisn: true, name: true, class: { select: { name: true } } } },
      examPackage: {
        include: { subject: { select: { name: true } } },
      },
    },
    orderBy: { submittedAt: 'asc' },
  });

  // Ambil attempt TERAKHIR per (userId+subjectId)
  const latest = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) {
    const subjectId = a.examPackage?.subjectId;
    if (!subjectId) continue;
    const key = `${a.userId}::${subjectId}`;
    const prev = latest.get(key);
    if (!prev || (a.submittedAt ?? a.createdAt) >= (prev.submittedAt ?? prev.createdAt)) {
      latest.set(key, a);
    }
  }

  return Array.from(latest.values()).map((a) => {
    const correct = a.totalCorrect ?? 0;
    const total = (a.totalCorrect ?? 0) + (a.totalWrong ?? 0) + (a.totalUnanswered ?? 0);
    const ketepatan = total > 0 ? `${Math.round((correct / total) * 100)}%` : '-';
    return {
      NISN: a.user?.nisn ?? '',
      Nama: a.user?.name ?? '',
      Kelas: a.user?.class?.name ?? '',
      Mapel: a.examPackage?.subject?.name ?? 'TKA',
      Nilai: Math.round(a.score ?? 0),
      Ketepatan: ketepatan,
      'Prediksi TKA': a.tkaPrediction != null ? String(Math.round(a.tkaPrediction)) : '-',
      Tanggal: (a.submittedAt ?? a.createdAt).toISOString().slice(0, 10),
      Keterangan: a.learningObjective || '',
    };
  });
}

async function persistTokenUpdate(configId: string, tokens: SheetsTokens): Promise<void> {
  const { encryptText } = await import('@/lib/encryption');
  const data: Record<string, unknown> = {
    encryptedAccessToken: encryptText(tokens.access_token),
    accessTokenExpiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
  };
  if (tokens.refresh_token) {
    data.encryptedRefreshToken = encryptText(tokens.refresh_token);
  }
  await db.googleSheetsConfig.update({ where: { id: configId }, data }).catch(() => {});
}

/**
 * Jalankan sync ke sheet target.
 * @param sheet 'SISWA' | 'NILAI'
 */
export async function runSync(schoolId: string, sheet: 'SISWA' | 'NILAI'): Promise<SheetsSyncResult> {
  const config = await resolveConfig(schoolId);

  const client = createSheetsClient({
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
    onTokenRefreshed: (tokens) => persistTokenUpdate(config.id, tokens),
  });

  try {
    const rows = sheet === 'SISWA' ? await buildStudentRows(schoolId) : await buildScoreRows(schoolId);
    const columns = sheet === 'SISWA' ? SISWA_COLUMNS : NILAI_COLUMNS;
    const values =
      sheet === 'SISWA' ? toStudentRowValues(rows as StudentSheetRow[]) : toScoreRowValues(rows as ScoreSheetRow[]);

    const range = `'${sheet}'!A1`;

    // Idempoten: clear sheet lalu tulis ulang penuh
    await client.clearRange(config.spreadsheetId, `'${sheet}'!A1:Z100000`);
    const append = await client.appendValues(config.spreadsheetId, `'${sheet}'!A1`, [
      [...columns],
      ...values,
    ]);

    const updatedRows = values.length;
    await db.googleSheetsConfig
      .update({
        where: { id: config.id },
        data: {
          status: 'connected',
          lastSyncAt: new Date(),
          lastSyncRows: updatedRows,
          lastError: null,
        },
      })
      .catch(() => {});

    return {
      ok: true,
      spreadsheetId: config.spreadsheetId,
      sheetName: sheet,
      rows: updatedRows,
      range: append.updates?.updatedRange ?? range,
    };
  } catch (err) {
    const message = err instanceof SheetsApiError ? err.message : err instanceof Error ? err.message : 'Gagal sync';
    await db.googleSheetsConfig
      .update({
        where: { id: config.id },
        data: { status: 'error', lastError: message },
      })
      .catch(() => {});
    return {
      ok: false,
      spreadsheetId: config.spreadsheetId,
      sheetName: sheet,
      rows: 0,
      error: message,
    };
  }
}
