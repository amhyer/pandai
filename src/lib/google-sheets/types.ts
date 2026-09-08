/**
 * Tipe-tipe untuk integrasi Google Sheets.
 */

export const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export type SheetsSyncStatus = 'pending' | 'connected' | 'error' | 'disconnected';
export type SheetsSyncMode = 'all' | 'per_class';
export type SheetsSyncFrequency = 'none' | 'hourly' | 'daily';

/** Baris data siswa yang akan di-push ke sheet "SISWA". */
export interface StudentSheetRow {
  NISN: string;
  Nama: string;
  JK: string;
  Kelas: string;
  'No. HP Ortu': string;
  'Nama Ortu/Wali': string;
}

/** Baris data nilai yang akan di-push ke sheet "NILAI". */
export interface ScoreSheetRow {
  NISN: string;
  Nama: string;
  Kelas: string;
  Mapel: string;
  Nilai: number;
  Ketepatan: string;
  'Prediksi TKA': string;
  Tanggal: string;
  Keterangan: string;
}

export interface SheetsSyncResult {
  ok: boolean;
  spreadsheetId: string;
  sheetName: string;
  rows: number;
  range?: string;
  error?: string;
}

export interface SheetsSheetMeta {
  spreadsheetId: string;
  title: string;
  sheets: { title: string; index: number; rowCount: number; colCount: number }[];
}
