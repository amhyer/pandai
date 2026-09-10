import { requireTeacherClass } from '@/lib/teacher-scope';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { parseImportFile, type ImportData } from '@/lib/import-file';
import { hashPassword } from '@/lib/constants';
import { requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';

// Large imports hash one password per row; allow enough time on Vercel.
export const maxDuration = 300;

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
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    let schoolId = formData.get('schoolId') as string | null;
    const fieldMappingStr = formData.get('fieldMapping');
    const targetClassId = formData.get('classId');
    
    if (!(file instanceof File) || typeof type !== 'string' || typeof schoolId !== 'string' || !schoolId.trim()) {
      return NextResponse.json({ success: false, message: 'File, tipe, dan schoolId diperlukan' }, { status: 400 });
    }

    // Parse field mapping
    let fieldMapping: Record<string, string> = {};
    if (fieldMappingStr) {
      try {
        if (typeof fieldMappingStr !== 'string') throw new Error('Invalid mapping');
        const parsed: unknown = JSON.parse(fieldMappingStr);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
            Object.values(parsed).some((value) => typeof value !== 'string')) {
          throw new Error('Invalid mapping');
        }
        fieldMapping = parsed as Record<string, string>;
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

    if (auth.role === 'GURU') {
      if (type !== 'siswa' || typeof targetClassId !== 'string' || !targetClassId) {
        throw new AuthError('Guru hanya dapat mengimpor siswa ke kelas yang ditugaskan', 403);
      }
      await requireTeacherClass(auth, targetClassId);
    }

    // A class ID supplied by the browser must belong to the effective school.
    // Never fall back to auto-creating a class for an invalid target.
    if (targetClassId !== null) {
      if (type !== 'siswa' || typeof targetClassId !== 'string' || !targetClassId.trim()) {
        return NextResponse.json({ success: false, message: 'Kelas tujuan hanya berlaku untuk import siswa dan wajib valid' }, { status: 400 });
      }
      const targetClass = await db.class.findFirst({
        where: { id: targetClassId, schoolId },
        select: { id: true },
      });
      if (!targetClass) {
        return NextResponse.json({ success: false, message: 'Kelas tujuan tidak ditemukan di sekolah Anda' }, { status: 404 });
      }
    }

    let parsed: ImportData;
    try {
      parsed = await parseImportFile(file);
    } catch (error) {
      return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'File tidak dapat dibaca' }, { status: 400 });
    }
    const { headers, rows } = parsed;
    const mappedHeaders = Object.entries(fieldMapping)
      .filter(([key, value]) => value && value !== '__skip__' && !(targetClassId && key === 'kelas'))
      .map(([, value]) => value.toLowerCase().trim());
    const normalizedHeaders = headers.map((header) => header.toLowerCase().trim());
    if (new Set(mappedHeaders).size !== mappedHeaders.length ||
        mappedHeaders.some((header) => normalizedHeaders.filter((value) => value === header).length !== 1)) {
      return NextResponse.json({ success: false, message: 'Mapping kolom tidak valid atau ambigu. Gunakan judul kolom yang unik.' }, { status: 400 });
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
          errors.push(`Data ke-${i + 1}: NISN dan Nama wajib diisi`);
          failed++;
          continue;
        }

        // Cek duplikat
        const existing = await db.user.findUnique({ where: { nisn } });
        if (existing) {
          errors.push(`Data ke-${i + 1}: NISN ${nisn} sudah terdaftar; dilewati tanpa mengubah data atau kelas siswa.`);
          failed++;
          continue;
        }

        // Handle kelas (auto-create jika belum ada)
        let classId: string | undefined = typeof targetClassId === 'string' ? targetClassId : undefined;
        if (!classId && kelasIdx !== -1 && row[kelasIdx]?.trim()) {
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

        // Report unique conflicts per row, including username/email collisions and
        // concurrent imports, instead of hiding earlier successful rows with a 500.
        try {
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
              mustChangePassword: true,
            },
          });
          imported++;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            errors.push(`Data ke-${i + 1}: NISN, username, atau email sudah terdaftar; data dilewati.`);
            failed++;
            continue;
          }
          throw error;
        }
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
          errors.push(`Data ke-${i + 1}: NIP dan Nama wajib diisi`);
          failed++;
          continue;
        }

        // Cek duplikat
        const existing = await db.user.findUnique({ where: { nip } });
        if (existing) {
          errors.push(`Data ke-${i + 1}: NIP ${nip} sudah terdaftar`);
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

    if (imported > 0) {
      // Logging must not turn an already completed import into a failed request.
      await db.activityLog.create({ data: {
        schoolId, userId: auth.userId, module: 'Pengguna', action: 'Import data',
        detail: `${imported} ${type} diimpor${targetClassId ? ` ke kelas ${targetClassId}` : ''}; ${failed} dilewati/gagal.`,
      } }).catch(() => {});
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
