/**
 * Mapping kolom sheet Google Sheets.
 * Header baris 1 di sheet harus SAMPAI URUTAN ini agar data terbaca benar
 * saat import balik (fitur lanjutan). Lihat docs/GOOGLE_SHEETS_SYNC_SETUP.md.
 */

import type { ScoreSheetRow, StudentSheetRow } from './types';

export const SISWA_COLUMNS = ['NISN', 'Nama', 'JK', 'Kelas', 'No. HP Ortu', 'Nama Ortu/Wali'] as const;
export const NILAI_COLUMNS = ['NISN', 'Nama', 'Kelas', 'Mapel', 'Nilai', 'Ketepatan', 'Prediksi TKA', 'Tanggal', 'Keterangan'] as const;

export function toStudentRowValues(rows: StudentSheetRow[]): (string | number)[][] {
  return rows.map((r) => [r.NISN, r.Nama, r.JK, r.Kelas, r['No. HP Ortu'], r['Nama Ortu/Wali']]);
}

export function toScoreRowValues(rows: ScoreSheetRow[]): (string | number)[][] {
  return rows.map((r) => [
    r.NISN,
    r.Nama,
    r.Kelas,
    r.Mapel,
    r.Nilai,
    r.Ketepatan,
    r['Prediksi TKA'],
    r.Tanggal,
    r.Keterangan,
  ]);
}

/** Nama sheet yang didukung untuk sync. */
export const SUPPORTED_SHEETS = ['SISWA', 'NILAI'] as const;
export type SupportedSheet = (typeof SUPPORTED_SHEETS)[number];

export function isSupportedSheet(name: string): name is SupportedSheet {
  return (SUPPORTED_SHEETS as readonly string[]).includes(name);
}
