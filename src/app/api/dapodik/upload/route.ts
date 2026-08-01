import { NextResponse } from 'next/server';

// DAPODIK desktop stores data in local SQLite.
// Common table names in various DAPODIK versions:
// - "sekolah" / "ref_sekolah" / "mst_sekolah" (school profile)
// - "peserta_didik" (students)
// - "ptk" (teachers/staff)
// - "bentuk_pendidikan" (school types reference)
// Column mappings vary by version.

interface DapodikSchoolData {
  npsn: string;
  name: string;
  address: string;
  province: string;
  city: string;
  district: string;
  village: string;
  postalCode: string;
  principalName: string;
  nuptkPrincipal: string;
  accreditation: string;
  schoolType: string;
  established: string;
  curriculum: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  status: string;
  source: string;
  sourceDetail: string;
}

// =====================================================
// 1. Parse SQLite database (DAPODIK desktop .db file)
// =====================================================
async function parseSqliteDatabase(buffer: ArrayBuffer): Promise<DapodikSchoolData | null> {
  const BetterSqlite3 = await import('better-sqlite3');
  const tmpPath = `/tmp/dapodik_upload_${Date.now()}.db`;

  try {
    // Write buffer to temp file
    const fs = await import('fs');
    fs.writeFileSync(tmpPath, Buffer.from(buffer));

    const db = new (BetterSqlite3.default || BetterSqlite3)(tmpPath, { readonly: true, fileMustExist: false });

    // Step 1: Find the school table
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const tableNames = tables.map(t => t.name.toLowerCase());

    // Try known DAPODIK school table names
    const schoolTableCandidates = [
      'sekolah', 'mst_sekolah', 'ref_sekolah', 'profil_sekolah',
      'data_sekolah', 'tb_sekolah', 'school', 'schools',
    ];
    let schoolTable = schoolTableCandidates.find(t => tableNames.includes(t));

    // Fallback: find table with npsn column
    if (!schoolTable) {
      for (const t of tableNames) {
        try {
          const cols = db.prepare(`PRAGMA table_info("${t}")`).all() as { name: string }[];
          const colNames = cols.map(c => c.name.toLowerCase());
          if (colNames.includes('npsn') || colNames.includes('npsn_smk') || colNames.includes('no_npsn')) {
            schoolTable = t;
            break;
          }
        } catch { /* skip */ }
      }
    }

    if (!schoolTable) {
      console.log('[DAPODIK Upload] No school table found in DB. Tables:', tableNames.join(', '));
      return null;
    }

    console.log(`[DAPODIK Upload] Found school table: "${schoolTable}"`);

    // Step 2: Read columns
    const columns = db.prepare(`PRAGMA table_info("${schoolTable}")`).all() as { name: string }[];
    const colNames = columns.map(c => c.name.toLowerCase());

    // Step 3: Query first row (single school per database)
    const rows = db.prepare(`SELECT * FROM "${schoolTable}" LIMIT 5`).all() as Record<string, unknown>[];
    if (!rows || rows.length === 0) {
      console.log('[DAPODIK Upload] School table is empty');
      return null;
    }

    const row = rows[0];

    // Helper: get value by trying multiple column name variations
    const get = (candidates: string[]): string => {
      for (const c of candidates) {
        const val = row[c];
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
      // Try case-insensitive
      for (const c of candidates) {
        const found = colNames.find(cn => cn === c.toLowerCase());
        if (found) {
          const val = row[found] ?? Object.entries(row).find(([k]) => k.toLowerCase() === found)?.[1];
          if (val !== null && val !== undefined && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
      }
      return '';
    };

    // Also try to find columns by iterating object keys
    const getByPattern = (patterns: RegExp): string => {
      for (const [key, val] of Object.entries(row)) {
        if (patterns.test(key.toLowerCase()) && val !== null && val !== undefined && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
      return '';
    };

    // Also try to get via the column list (case-insensitive lookup)
    const getCI = (candidates: string[]): string => {
      for (const c of candidates) {
        const match = colNames.find(cn => cn === c.toLowerCase());
        if (match) {
          // Find original column name (case-sensitive)
          const origCol = columns.find(col => col.name.toLowerCase() === c.toLowerCase());
          if (origCol && row[origCol.name] !== null && row[origCol.name] !== undefined) {
            const val = String(row[origCol.name]).trim();
            if (val !== '') return val;
          }
        }
      }
      return getByPattern(new RegExp(candidates.join('|'), 'i'));
    };

    const school: DapodikSchoolData = {
      npsn: getCI(['npsn', 'npsn_smk', 'no_npsn', 'npsn_n', 'kode_npsn']),
      name: getCI(['nama', 'nama_sp', 'nama_sekolah', 'nm_sekolah', 'sekolah', 'nama_sp_asli', 'nm_lemb']),
      address: getCI(['alamat', 'alamat_jln', 'jalan', 'alamat_lemb', 'jln']),
      province: getCI(['propinsi', 'provinsi', 'nm_prop', 'provinsi_id', 'kode_propinsi']),
      city: getCI(['kabupaten_kota', 'kabupaten', 'kab_kota', 'kota', 'nm_kab', 'nm_kab_kota']),
      district: getCI(['kecamatan', 'kec', 'nm_kec', 'nm_kecamatan']),
      village: getCI(['desa_kelurahan', 'kelurahan', 'desa', 'nm_kel', 'nm_desa']),
      postalCode: getCI(['kode_pos', 'kodepos', 'postal_code']),
      principalName: getCI(['kepala_sekolah', 'nama_kepsek', 'nm_kepala_sekolah', 'nm_kepala']),
      nuptkPrincipal: getCI(['nuptk_kepala', 'nuptk_ks', 'nip_kepala']),
      accreditation: getCI(['akreditasi', 'akred', 'no_akreditasi', 'status_akreditasi']),
      schoolType: getCI(['bentuk_pendidikan', 'jenjang', 'tingkat', 'bentuk', 'jenis']),
      established: getCI(['tahun_berdiri', 'tgl_sk_pendirian', 'tahun_pendirian', 'thn_berdiri']),
      curriculum: getCI(['kurikulum', 'nm_kurikulum', 'kurikulum_id']),
      phone: getCI(['telepon', 'telp', 'no_telp', 'no_tel', 'nmr_telp', 'telepon_sekolah']),
      fax: getCI(['fax', 'no_fax', 'faximile']),
      email: getCI(['email', 'email_sekolah', 'alamat_email']),
      website: getCI(['website', 'web', 'url']),
      status: getCI(['status', 'status_sekolah']),
      source: 'dapodik-file',
      sourceDetail: `SQLite table: "${schoolTable}" (${rows.length} rows scanned)`,
    };

    // Also check for related tables (bentuk_pendidikan, etc.)
    if (!school.schoolType && school.npsn) {
      try {
        const bentukCandidates = ['bentuk_pendidikan', 'ref_bentuk_pendidikan', 'bentuk'];
        for (const bt of bentukCandidates) {
          if (tableNames.includes(bt)) {
            // Skip — we don't know the join structure
          }
        }
      } catch { /* skip */ }
    }

    // Validate minimum required fields
    if (!school.npsn && !school.name) {
      console.log('[DAPODIK Upload] Could not extract NPSN or name from row');
      return null;
    }

    console.log(`[DAPODIK Upload] Extracted school: ${school.name} (NPSN: ${school.npsn})`);
    db.close();
    return school;
  } catch (err) {
    console.error('[DAPODIK Upload] SQLite parse error:', err);
    return null;
  } finally {
    // Cleanup temp file
    try {
      const fs = await import('fs');
      fs.unlinkSync(tmpPath);
    } catch { /* ignore */ }
  }
}

// =====================================================
// 2. Parse Excel/CSV file (DAPODIK export)
// =====================================================
async function parseExcelOrCsv(buffer: ArrayBuffer, filename: string): Promise<DapodikSchoolData | null> {
  try {
    const XLSX = await import('xlsx');

    // Parse buffer to workbook
    const wb = XLSX.read(buffer, { type: 'array' });

    // Find the sheet with school data
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    if (!data || data.length === 0) {
      console.log('[DAPODIK Upload] No data in Excel/CSV file');
      return null;
    }

    const row = data[0];

    // Helper: find value by header patterns
    const get = (patterns: string[]): string => {
      for (const [key, val] of Object.entries(row)) {
        const keyLower = key.toLowerCase().replace(/[_\s.-]+/g, '');
        for (const p of patterns) {
          const pLower = p.replace(/[_\s.-]+/g, '');
          if (keyLower.includes(pLower) && val !== null && val !== undefined && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
      }
      return '';
    };

    const school: DapodikSchoolData = {
      npsn: get(['npsn', 'nomor_pokok_sekolah', 'no_npsn', 'npsn_smk']),
      name: get(['nama', 'nama_sekolah', 'nama_sp', 'nm_sekolah', 'sekolah']),
      address: get(['alamat', 'alamat_jalan', 'jalan']),
      province: get(['propinsi', 'provinsi']),
      city: get(['kabupaten_kota', 'kabupaten', 'kab_kota', 'kota']),
      district: get(['kecamatan', 'kec']),
      village: get(['desa_kelurahan', 'kelurahan', 'desa']),
      postalCode: get(['kode_pos']),
      principalName: get(['kepala_sekolah', 'nama_kepala', 'kepsek']),
      nuptkPrincipal: get(['nuptk_kepala', 'nuptk']),
      accreditation: get(['akreditasi', 'akred']),
      schoolType: get(['bentuk_pendidikan', 'jenjang', 'bentuk', 'jenis']),
      established: get(['tahun_berdiri', 'tahun_pendirian', 'thn_berdiri']),
      curriculum: get(['kurikulum']),
      phone: get(['telepon', 'telp', 'no_telp']),
      fax: get(['fax', 'no_fax']),
      email: get(['email', 'email_sekolah']),
      website: get(['website', 'web']),
      status: get(['status', 'status_sekolah']),
      source: 'dapodik-file',
      sourceDetail: `Excel/CSV sheet: "${sheetName}" (${data.length} rows)`,
    };

    if (!school.npsn && !school.name) {
      console.log('[DAPODIK Upload] No NPSN/name in Excel data. Headers:', Object.keys(row).join(', '));
      return null;
    }

    console.log(`[DAPODIK Upload] Excel extracted: ${school.name} (NPSN: ${school.npsn})`);
    return school;
  } catch (err) {
    console.error('[DAPODIK Upload] Excel/CSV parse error:', err);
    return null;
  }
}

// =====================================================
// 3. Main upload handler
// =====================================================
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    const maxSize = 50 * 1024 * 1024; // 50MB max (DAPODIK DB can be large)

    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File terlalu besar (maksimal 50MB)' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    console.log(`[DAPODIK Upload] File: ${file.name}, Size: ${(file.size / 1024).toFixed(1)}KB`);

    let schoolData: DapodikSchoolData | null = null;

    // Detect file type and parse accordingly
    if (filename.endsWith('.db') || filename.endsWith('.sqlite') || filename.endsWith('.sqlite3') || filename.endsWith('.db3')) {
      // SQLite database file (DAPODIK desktop database)
      schoolData = await parseSqliteDatabase(buffer);
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
      // Excel or CSV export
      schoolData = await parseExcelOrCsv(buffer, filename);
    } else {
      // Try SQLite first, then Excel
      schoolData = await parseSqliteDatabase(buffer);
      if (!schoolData) {
        schoolData = await parseExcelOrCsv(buffer, filename);
      }
    }

    if (!schoolData) {
      return NextResponse.json(
        { error: 'Gagal membaca data sekolah dari file. Pastikan file adalah database DAPODIK (.db) atau ekspor Excel/CSV.' },
        { status: 422 },
      );
    }

    // Return in the same format as /api/schools/lookup
    return NextResponse.json({
      ...schoolData,
      emailDomain: schoolData.email || '',
      source: schoolData.source,
    });
  } catch (error) {
    console.error('[DAPODIK Upload] Error:', error);
    return NextResponse.json({ error: 'Gagal memproses file. Coba lagi.' }, { status: 500 });
  }
}
