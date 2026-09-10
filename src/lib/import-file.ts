// Shared by the import preview and API so both read exactly the same data.
export interface ImportData {
  headers: string[];
  rows: string[][];
}

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 200;

function extractData(data: string[][]): ImportData {
  const firstCell = data[0]?.[0]?.toLowerCase() || '';
  const isDapodik = firstCell.includes('daftar') || firstCell.includes('peserta didik');
  const headerIndex = isDapodik && data.length > 5 ? 4 : 0;
  const dataIndex = headerIndex === 4 ? 6 : 1;
  return {
    headers: (data[headerIndex] || []).map((value) => value.trim()),
    rows: data.slice(dataIndex).filter((row) => row.some((cell) => cell.trim() !== '')),
  };
}

export function parseImportCsv(text: string): ImportData {
  const input = text.replace(/^\uFEFF/, '');
  // Pick one delimiter from the actual header (row 5 for Dapodik), ignoring
  // quoted separators. Metadata titles may not contain any separators at all.
  let quoted = false;
  let commas = 0;
  let semicolons = 0;
  let lineIndex = 0;
  const dapodik = /^(?:"?)(?:daftar|peserta didik)/i.test(input.trimStart());
  const headerIndex = dapodik ? 4 : 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (ch === '\n' || ch === '\r') {
        if (lineIndex === headerIndex) break;
        lineIndex++;
        if (ch === '\r' && input[i + 1] === '\n') i++;
      }
      if (lineIndex === headerIndex) {
        if (ch === ',') commas++;
        if (ch === ';') semicolons++;
      }
    }
  }
  const delimiter = semicolons > commas ? ';' : ',';
  const data: string[][] = [];
  let row: string[] = [];
  let cell = '';
  quoted = false;
  const finishRow = () => {
    row.push(cell.trim());
    data.push(row);
    row = [];
    cell = '';
  };
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && ch === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (!quoted && (ch === '\n' || ch === '\r')) {
      finishRow();
      if (ch === '\r' && input[i + 1] === '\n') i++;
    } else {
      cell += ch;
    }
  }
  if (quoted) throw new Error('Tanda kutip pada file CSV tidak lengkap.');
  if (cell || row.length) finishRow();
  return extractData(data);
}

export async function parseImportFile(file: File): Promise<ImportData> {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
    throw new Error('Hanya file CSV atau Excel (.xlsx/.xls) yang diperbolehkan.');
  }
  if (file.size > MAX_IMPORT_BYTES) throw new Error('Ukuran file maksimal 2 MB.');
  let parsed: ImportData;
  if (/\.csv$/i.test(file.name)) {
    parsed = parseImportCsv(await file.text());
  } else {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('File Excel tidak memiliki lembar data.');
    // Use formatted text to retain leading zeroes in NISN/telephone cells.
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1, raw: false, defval: '', blankrows: true,
    });
    parsed = extractData(data.map((row) => row.map((cell) => String(cell ?? ''))));
  }
  if (!parsed.headers.some(Boolean) || parsed.rows.length === 0) {
    throw new Error('File tidak memiliki data. Isi data siswa/guru di bawah judul kolom.');
  }
  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`Maksimal ${MAX_IMPORT_ROWS} baris per import. Pisahkan data menjadi beberapa file.`);
  }
  return parsed;
}
