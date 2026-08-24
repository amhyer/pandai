import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';
import { requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';

function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0].toLowerCase();
}

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
  const headers = parseLine(lines[0]); const rows = lines.slice(1).map(parseLine); return { headers, rows };
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    let schoolId = formData.get('schoolId') as string | null;
    if (!file || !type || !schoolId) { return NextResponse.json({ success: false, message: 'File, tipe, dan schoolId diperlukan' }, { status: 400 }); }

    // P2: Enforce school scope — non-SA must import to their own school
    const effectiveSchoolId = getSchoolFilter(auth) || schoolId;
    requireSchoolScope(auth, effectiveSchoolId);
    schoolId = effectiveSchoolId;
    if (!['siswa', 'guru'].includes(type)) { return NextResponse.json({ success: false, message: 'Tipe harus \"siswa\" atau \"guru\"' }, { status: 400 }); }

    const text = await file.text(); const { headers, rows } = parseCsv(text);
    if (rows.length === 0) { return NextResponse.json({ success: false, message: 'File CSV tidak memiliki data' }, { status: 400 }); }

    const errors: string[] = []; let imported = 0; let failed = 0;

    if (type === 'siswa') {
      const nisnIdx = headers.findIndex((h) => h.toLowerCase().includes('nisn'));
      const namaIdx = headers.findIndex((h) => h.toLowerCase().includes('nama'));
      const jkIdx = headers.findIndex((h) => h.toLowerCase().includes('jenis kelamin') || h.toLowerCase().includes('jk'));
      const kelasIdx = headers.findIndex((h) => h.toLowerCase().includes('kelas'));
      if (nisnIdx === -1 || namaIdx === -1) { return NextResponse.json({ success: false, message: 'Kolom NISN dan Nama wajib ada dalam file CSV', errors: [`Header ditemukan: ${headers.join(', ')}`] }, { status: 400 }); }
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]; const nisn = (row[nisnIdx] || '').trim(); const name = (row[namaIdx] || '').trim();
        if (!nisn || !name) { errors.push(`Baris ${i + 2}: NISN dan Nama wajib diisi`); failed++; continue; }
        const existing = await db.user.findUnique({ where: { nisn } });
        if (existing) { errors.push(`Baris ${i + 2}: NISN ${nisn} sudah terdaftar (${existing.name})`); failed++; continue; }
        let classId: string | undefined;
        if (kelasIdx !== -1 && row[kelasIdx]?.trim()) { const cls = await db.class.findFirst({ where: { name: row[kelasIdx].trim(), schoolId } }); if (cls) classId = cls.id; }
        const jk = jkIdx !== -1 ? row[jkIdx]?.trim() : undefined;
        await db.user.create({ data: { username: nisn, password: await hashPassword(nisn), name, role: 'SISWA', schoolId, classId, nisn, jk: jk === 'L' || jk === 'P' ? jk : undefined, isActive: true } });
        imported++;
      }
    } else {
      const nipIdx = headers.findIndex((h) => h.toLowerCase().includes('nip'));
      const namaIdx = headers.findIndex((h) => h.toLowerCase().includes('nama'));
      const jkIdx = headers.findIndex((h) => h.toLowerCase().includes('jenis kelamin') || h.toLowerCase().includes('jk'));
      const mapelIdx = headers.findIndex((h) => h.toLowerCase().includes('mata pelajaran') || h.toLowerCase().includes('mapel'));
      if (nipIdx === -1 || namaIdx === -1) { return NextResponse.json({ success: false, message: 'Kolom NIP dan Nama wajib ada dalam file CSV', errors: [`Header ditemukan: ${headers.join(', ')}`] }, { status: 400 }); }
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]; const nip = (row[nipIdx] || '').trim(); const name = (row[namaIdx] || '').trim();
        if (!nip || !name) { errors.push(`Baris ${i + 2}: NIP dan Nama wajib diisi`); failed++; continue; }
        const existing = await db.user.findUnique({ where: { nip } });
        if (existing) { errors.push(`Baris ${i + 2}: NIP ${nip} sudah terdaftar (${existing.name})`); failed++; continue; }
        const jk = jkIdx !== -1 ? row[jkIdx]?.trim() : undefined;
        const user = await db.user.create({ data: { username: nip, password: await hashPassword(nip), name, role: 'GURU', schoolId, nip, jk: jk === 'L' || jk === 'P' ? jk : undefined, isActive: true } });
        if (mapelIdx !== -1 && row[mapelIdx]?.trim()) {
          const subject = await db.subject.findFirst({ where: { name: row[mapelIdx].trim() } });
          if (subject) { await db.teacherAssignment.create({ data: { teacherId: user.id, subjectId: subject.id, schoolId } }); }
        }
        imported++;
      }
    }
    return NextResponse.json({ success: true, message: `Import ${type} selesai. ${imported} berhasil, ${failed} gagal.`, imported, failed, ...(errors.length > 0 && { errors }) });
  } catch (error: any) {
    if (error instanceof AuthError) { return NextResponse.json({ success: false, message: error.message }, { status: error.status }); }
    return NextResponse.json({ success: false, message: error.message || 'Gagal mengimpor data' }, { status: 500 });
  }
}
