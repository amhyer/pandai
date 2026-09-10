// node --import tsx --test tests/import-file.test.ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, parseImportCsv, parseImportFile } from '../src/lib/import-file';

function excelFile(bookType: 'xlsx' | 'xls', dapodik = false) {
  const rows = [['NISN', 'Nama Lengkap', 'Kelas'], ['0012345678', 'Siti Aminah', '1A']];
  if (dapodik) rows.unshift(['Daftar Peserta Didik'], ['SD Contoh'], [], ['Tanggal']);
  if (dapodik) rows.splice(5, 0, []);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Siswa');
  return new File([XLSX.write(book, { type: 'buffer', bookType })], `siswa.${bookType}`);
}

describe('shared import parser', () => {
  test('CSV preserves BOM, zero-prefixed identifiers, quoted commas, escaped quotes and newlines', () => {
    const parsed = parseImportCsv('\uFEFFNISN,Nama Lengkap,Catatan\r\n0012345678,"Siti, Aminah","Baris satu\nBaris ""dua"""\r\n\r\n');
    assert.deepEqual(parsed, {
      headers: ['NISN', 'Nama Lengkap', 'Catatan'],
      rows: [['0012345678', 'Siti, Aminah', 'Baris satu\nBaris "dua"']],
    });
  });

  test('semicolon CSV does not split commas within names', () => {
    assert.deepEqual(parseImportCsv('NISN;Nama\n0012345678;Siti, Aminah').rows, [['0012345678', 'Siti, Aminah']]);
    assert.deepEqual(parseImportCsv('NISN,Nama\n0012345678,Siti; Aminah').rows, [['0012345678', 'Siti; Aminah']]);
  });

  test('CSV Dapodik keeps blank metadata/subheader rows when locating the header', () => {
    assert.deepEqual(parseImportCsv('Daftar Peserta Didik,,\nSD Contoh,,\n\nTanggal,,\nNISN,Nama,Kelas\n,,\n0012345678,Siti,1A').rows,
      [['0012345678', 'Siti', '1A']]);
  });

  test('detects semicolon Dapodik CSV from the header, not the title', () => {
    assert.deepEqual(parseImportCsv('Daftar Peserta Didik\nSD Contoh\n\nTanggal\nNISN;Nama;Kelas\n;;\n0012345678;Siti, Aminah;1A').rows,
      [['0012345678', 'Siti, Aminah', '1A']]);
  });

  for (const type of ['xlsx', 'xls'] as const) {
    test(`reads real binary ${type} uploads with the same output as CSV`, async () => {
      assert.deepEqual(await parseImportFile(excelFile(type)), parseImportCsv('NISN,Nama Lengkap,Kelas\n0012345678,Siti Aminah,1A'));
    });
    test(`reads Dapodik ${type} headers after metadata and a blank row`, async () => {
      assert.deepEqual(await parseImportFile(excelFile(type, true)), await parseImportFile(excelFile(type)));
    });
  }

  test('preserves numeric NISN cells with an Excel leading-zero number format', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([['NISN', 'Nama'], [12345678, 'Siti']]);
    sheet.A2.z = '0000000000';
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Data');
    const file = new File([XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })], 'SISWA.XLSX');
    assert.equal((await parseImportFile(file)).rows[0][0], '0012345678');
  });

  test('rejects unsupported, empty, header-only, oversized and excessive-row files', async () => {
    await assert.rejects(parseImportFile(new File(['abc'], 'siswa.pdf')), /CSV atau Excel/);
    await assert.rejects(parseImportFile(new File([''], 'siswa.csv')), /tidak memiliki data/);
    await assert.rejects(parseImportFile(new File(['NISN,Nama\n'], 'siswa.csv')), /tidak memiliki data/);
    await assert.rejects(parseImportFile(new File([' '.repeat(MAX_IMPORT_BYTES + 1)], 'siswa.csv')), /2 MB/);
    await assert.rejects(parseImportFile(new File(['NISN,Nama\n' + '0012345678,Siti\n'.repeat(MAX_IMPORT_ROWS + 1)], 'siswa.csv')), /Maksimal/);
  });

  test('rejects incomplete CSV quoting instead of importing corrupted data', () => {
    assert.throws(() => parseImportCsv('NISN,Nama\n0012345678,"Siti'), /Tanda kutip/);
  });
});
