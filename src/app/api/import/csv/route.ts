import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';

// Helper: extract first name from full name
function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0].toLowerCase();
}

// Parse CSV text into rows (handles quoted fields)
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',' || ch === ';') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

// POST /api/import/csv — FormData: file, type (siswa/guru), schoolId
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    const schoolId = formData.get('schoolId') as string | null;

    if (!file || !type || !schoolId) {
      return NextResponse.json({ success: false, message: 'File, tipe, dan schoolId diperlukan' }, { status: 400 });
    }

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

    if (type === 'siswa') {
      // Expected headers: NISN, Nama, Jenis Kelamin, Kelas
      const nisnIdx = headers.findIndex((h) => h.toLowerCase().includes('nisn'));
      const namaIdx = headers.findIndex((h) => h.toLowerCase().includes('nama'));
      const jkIdx = headers.findIndex((h) => h.toLowerCase().includes('jenis kelamin') || h.toLowerCase().includes('jk'));
      const kelasIdx = headers.findIndex((h) => h.toLowerCase().includes('kelas'));

      if (nisnIdx === -1 || namaIdx === -1) {
        return NextResponse.json({
          success: false,
          message: 'Kolom NISN dan Nama wajib ada dalam file CSV',
          errors: [`Header ditemukan: ${headers.join(', ')}`],
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

        // Check if NISN already exists
        const existing = await db.user.findUnique({ where: { nisn } });
        if (existing) {
          errors.push(`Baris ${i + 2}: NISN ${nisn} sudah terdaftar (${existing.name})`);
          failed++;
          continue;
        }

        // Find class by name
        let classId: string | undefined;
        if (kelasIdx !== -1 && row[kelasIdx]?.trim()) {
          const className = row[kelasIdx].trim();
          const cls = await db.class.findFirst({
            where: { name: className, schoolId },
          });
          if (cls) classId = cls.id;
        }

        const jk = jkIdx !== -1 ? row[jkIdx]?.trim() : undefined;

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
            isActive: true,
          },
        });
        imported++;
      }
    } else {
      // GURU — Expected: NIP, Nama, Jenis Kelamin, Mata Pelajaran
      const nipIdx = headers.findIndex((h) => h.toLowerCase().includes('nip'));
      const namaIdx = headers.findIndex((h) => h.toLowerCase().includes('nama'));
      const jkIdx = headers.findIndex((h) => h.toLowerCase().includes('jenis kelamin') || h.toLowerCase().includes('jk'));
      const mapelIdx = headers.findIndex((h) => h.toLowerCase().includes('mata pelajaran') || h.toLowerCase().includes('mapel'));

      if (nipIdx === -1 || namaIdx === -1) {
        return NextResponse.json({
          success: false,
          message: 'Kolom NIP dan Nama wajib ada dalam file CSV',
          errors: [`Header ditemukan: ${headers.join(', ')}`],
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

        // Check if NIP already exists
        const existing = await db.user.findUnique({ where: { nip } });
        if (existing) {
          errors.push(`Baris ${i + 2}: NIP ${nip} sudah terdaftar (${existing.name})`);
          failed++;
          continue;
        }

        const jk = jkIdx !== -1 ? row[jkIdx]?.trim() : undefined;

        const user = await db.user.create({
          data: {
            username: nip,
            password: await hashPassword(nip),
            name,
            role: 'GURU',
            schoolId,
            nip,
            jk: jk === 'L' || jk === 'P' ? jk : undefined,
            isActive: true,
          },
        });

        // Optionally create teacher assignment if subject is specified
        if (mapelIdx !== -1 && row[mapelIdx]?.trim()) {
          const subjectName = row[mapelIdx].trim();
          const subject = await db.subject.findFirst({
            where: { name: subjectName },
          });
          if (subject) {
            await db.teacherAssignment.create({
              data: {
                teacherId: user.id,
                subjectId: subject.id,
                schoolId,
              },
            });
          }
        }

        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import ${type} selesai. ${imported} berhasil, ${failed} gagal.`,
      imported,
      failed,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || 'Gagal mengimpor data',
    }, { status: 500 });
  }
}
