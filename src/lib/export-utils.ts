// CSV / XLSX export utility
// - `buildCsv` & `sanitizeFilename` aman dipakai di server (API route) dan client.
// - `downloadCSV` / `downloadXLSX` untuk unduhan langsung dari browser.

/** Escape satu sel CSV (RFC 4180). */
function csvCell(value: unknown): string {
  let val = String(value ?? '');
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    val = '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

/**
 * Bangun string CSV dari baris data.
 * `columns` = header label (opsional; default = kunci objek pertama).
 */
export function buildCsv(
  data: Record<string, unknown>[],
  columns?: string[],
  keyMap?: Record<string, (row: Record<string, unknown>) => unknown>
): string {
  if (!data.length) return '';
  const keys = columns || Object.keys(data[0]);
  const lines = [
    keys.map(csvCell).join(','),
    ...data.map((row) =>
      keys
        .map((k) => {
          const mapper = keyMap?.[k];
          return csvCell(mapper ? mapper(row) : row[k]);
        })
        .join(',')
    ),
  ];
  return lines.join('\n');
}

/** Buat Blob CSV (dengan BOM agar Excel membaca UTF-8). */
export function csvBlob(csv: string): Blob {
  return new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
}

/** Sanitasi nama file (tanpa path/char yang dilarang). */
export function sanitizeFilename(name: string, ext = 'csv'): string {
  const base = name
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80)
    .trim() || 'export';
  return `${base}.${ext.replace(/^\./, '')}`;
}

/** Unduh CSV dari browser (pola lama — dipertahankan untuk kompatibilitas). */
export function downloadCSV(data: Record<string, any>[], filename: string, columns?: string[]) {
  if (!data.length) { return; }
  const csv = buildCsv(data, columns);
  const blob = csvBlob(csv);
  window.open(URL.createObjectURL(blob));
}

/** Unduh XLSX (.xlsx) dari browser memakai library `xlsx`. */
export function downloadXLSX(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Data'
): void {
  if (!data.length) return;
  // xlsx di-import secara dinamis agar tidak membebani bundle default
  const XLSXPromise = import('xlsx');
  XLSXPromise.then((XLSX) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    XLSX.writeFile(wb, sanitizeFilename(filename, 'xlsx'));
  });
}
