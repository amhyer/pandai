import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';
import { requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };
  function parseLine(line: string): string[] {
    const result: string[] = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) { if (ch === '"') { if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = false; } } else { current += ch; } }
      else { if (ch === '"') { inQuotes = true; } else if (ch === ',' || ch === ';') { result.push(current.trim()); current = ''; } else { current += ch; } }
    }
    result.push(current.trim()); return result;
  }
  
  // Deteksi format Dapodik (header di baris ke-5, data mulai baris ke-7)
  const firstLine = lines[0]?.toLowerCase() || '';
  const isDapodik = firstLine.includes('daftar') || firstLine.includes('peserta didik');
  
  let headerIdx = 0;
  let dataStartIdx = 1;
  
  if (isDapodik && lines.length > 6) {
    headerIdx = 4; // Row 5 (0-indexed = 4)
    dataStartIdx = 6; // Row 7 (0-indexed = 6)
  }
  
  const headers = parseLine(lines[headerIdx]);
  const rows = lines.slice(dataStartIdx)
    .filter((line) => line.trim() !== '')
    .map(parseLine);
  return { headers, rows };
}

// Auto-create class if not exists
async function ensureClassExists(className: string, schoolId: string): Promise<string | null> {
  if (!className || !schoolId) return null;
  
  // Cari kelas yang sudah ada
  const existing = await db.class.findFirst({
    where: { name: className.trim(), schoolId },
  });
  
  if (existing) return existing.id;
  
  // Buat kelas baru
  // Ekstrak grade dari nama kelas (misal: "1A" → 1, "XII IPA" → 12)
  const gradeMatch = /^(\d{1,2})/.exec(className.trim());
  const romanMatch = /^(X|XI|XII|IX|VIII|VII|VI|V|IV|III|II|I)/i.exec(className.trim());
  
  let grade = 10; // default
  if (gradeMatch) {
    grade = parseInt(gradeMatch[1], 10);
  } else if (romanMatch) {
    const romanToGrade: Record<string, number> = {
      'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
      'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12,
    };
    grade = romanToGrade[romanMatch[1].toUpperCase()] || 10;
  }
  
  // Tentukan academic year (tahun ajaran saat ini)
  const now = new Date();
  const currentYear = now.getFullYear();
  const academicYear = `${currentYear}/${currentYear + 1}`;
  
  const newClass = await db.class.create({
    data: {
      name: className.trim(),
      grade,
      academicYear,
      schoolId,
    },
  });
  
  return newClass.id;
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    let schoolId = formData.get('schoolId') as string | null;
    const fieldMappingStr = formData.get('fieldMapping') as string | null;
    
    if (!file || !type || !schoolId) {
      return NextResponse.json({ success: false, message: 'File, tipe, dan schoolId diperlukan' }, { status: 400 });
    }

    // Parse field mapping
    let fieldMapping: Record<string, string> = {};
    if (fieldMappingStr) {
      try {
        fieldMapping = JSON.parse(fieldMappingStr);
      } catch {
        return NextResponse.json({ success: false, message: 'Field mapping tidak valid' }, { status: 400 });
      }
    }

    // Enforce school scope
    const effectiveSchoolId = getSchoolFilter(auth) || schoolId;
    requireSchoolScope(auth, effectiveSchoolId);
    schoolId = effectiveSchoolId;
    
    if (!['siswa', 'guru'].includes(type)) {
      return NextResponse.json({ success: false, message: 'Tipe harus "siswa" atau "guru"' }, { status: 400 });
    }

    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'File CSV tidak memiliki data' }, { status: 400 });
    }

    const errors: string[] = [];
    let imported = 0;
    let failed = 0;
    let classesCreated = 0;

    // Helper untuk mendapatkan index kolom berdasarkan mapping
    const getColIdx = (fieldKey: string): number => {
      const mappedHeader = fieldMapping[fieldKey];
      if (!mappedHeader || mappedHeader === '__skip__') return -1;
      return headers.findIndex((h) => h.toLowerCase().trim() === mappedHeader.toLowerCase().trim());
    };

    if (type === 'siswa') {
      const nisnIdx = getColIdx('nisn');
      const namaIdx = getColIdx('name');
      const jkIdx = getColIdx('jk');
      const kelasIdx = getColIdx('kelas');
      const phoneIdx = getColIdx('phone');
      const namaOrtuIdx = getColIdx('namaOrtu');
      const emailIdx = getColIdx('email');

      // Validasi field wajib
      if (nisnIdx === -1 || namaIdx === -1) {
        return NextResponse.json({
          success: false,
          message: 'Kolom NISN dan Nama wajib di-mapping',
          errors: [`Mapping saat ini: ${JSON.stringify(fieldMapping)}`],
        }, { status: 400 });
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const nisn = (row[nisnIdx] || '').trim();
        const name = (row[namaIdx] || '').trim();
        
        if (!nisn || !name) {
          errors.push(`Baris ${i + 2}: NISN dan Nama wajib diisi`);
          failed++;
          continue;
        }

        // Cek duplikat
        const existing = await db.user.findUnique({ where: { nisn } });
        if (existing) {
          errors.push(`Baris ${i + 2}: NISN ${nisn} sudah terdaftar (${existing.name})`);
          failed++;
          continue;
        }

        // Handle kelas (auto-create jika belum ada)
        let classId: string | undefined;
        if (kelasIdx !== -1 && row[kelasIdx]?.trim()) {
          const className = row[kelasIdx].trim();
          const newClassId = await ensureClassExists(className, schoolId);
          if (newClassId) {
            classId = newClassId;
            // Cek apakah ini kelas baru
            const classExists = await db.class.findFirst({
              where: { name: className, schoolId },
            });
            if (classExists && classExists.createdAt > new Date(Date.now() - 1000)) {
              classesCreated++;
            }
          }
        }

        // Handle field opsional
        const jk = jkIdx !== -1 ? row[jkIdx]?.trim() : undefined;
        const phone = phoneIdx !== -1 ? row[phoneIdx]?.trim() : undefined;
        const namaOrtu = namaOrtuIdx !== -1 ? row[namaOrtuIdx]?.trim() : undefined;
        const email = emailIdx !== -1 ? row[emailIdx]?.trim() : undefined;

        // Buat user
        await db.user.create({
          data: {
            username: nisn,
            password: await hashPassword(nisn),
            name,
            role: 'SISWA',
            schoolId,
            classId,
            nisn,
            jk: jk === 'L' || jk === 'P' ? jk : undefined,
            phone: phone || undefined,
            namaOrtu: namaOrtu || undefined,
            email: email || undefined,
            isActive: true,
          },
        });
        imported++;
      }
    } else {
      // Import Guru
      const nipIdx = getColIdx('nip');
      const namaIdx = getColIdx('name');
      const jkIdx = getColIdx('jk');
      const mapelIdx = getColIdx('mataPelajaran');
      const phoneIdx = getColIdx('phone');
      const emailIdx = getColIdx('email');
      const nikIdx = getColIdx('nik');

      // Validasi field wajib
      if (nipIdx === -1 || namaIdx === -1) {
        return NextResponse.json({
          success: false,
          message: 'Kolom NIP dan Nama wajib di-mapping',
          errors: [`Mapping saat ini: ${JSON.stringify(fieldMapping)}`],
        }, { status: 400 });
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const nip = (row[nipIdx] || '').trim();
        const name = (row[namaIdx] || '').trim();
        
        if (!nip || !name) {
          errors.push(`Baris ${i + 2}: NIP dan Nama wajib diisi`);
          failed++;
          continue;
        }

        // Cek duplikat
        const existing = await db.user.findUnique({ where: { nip } });
        if (existing) {
          errors.push(`Baris ${i + 2}: NIP ${nip} sudah terdaftar (${existing.name})`);
          failed++;
          continue;
        }

        // Handle field opsional
        const jk = jkIdx !== -1 ? row[jkIdx]?.trim() : undefined;
        const phone = phoneIdx !== -1 ? row[phoneIdx]?.trim() : undefined;
        const email = emailIdx !== -1 ? row[emailIdx]?.trim() : undefined;
        const nik = nikIdx !== -1 ? row[nikIdx]?.trim() : undefined;

        // Buat user
        const user = await db.user.create({
          data: {
            username: nip,
            password: await hashPassword(nip),
            name,
            role: 'GURU',
            schoolId,
            nip,
            jk: jk === 'L' || jk === 'P' ? jk : undefined,
            phone: phone || undefined,
            email: email || undefined,
            nik: nik || undefined,
            isActive: true,
          },
        });

        // Handle mata pelajaran
        if (mapelIdx !== -1 && row[mapelIdx]?.trim()) {
          const subject = await db.subject.findFirst({ where: { name: row[mapelIdx].trim() } });
          if (subject) {
            await db.teacherAssignment.create({
              data: { teacherId: user.id, subjectId: subject.id, schoolId },
            });
          }
        }
        imported++;
      }
    }

    // Buat pesan sukses
    let message = `Import ${type} selesai. ${imported} berhasil, ${failed} gagal.`;
    if (classesCreated > 0) {
      message += ` ${classesCreated} kelas baru dibuat.`;
    }

    return NextResponse.json({
      success: true,
      message,
      imported,
      failed,
      classesCreated,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    console.error('Import error:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengimpor data' }, { status: 500 });
  }
}
