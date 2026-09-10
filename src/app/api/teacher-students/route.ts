import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { AuthError, hashPassword, requireRole } from '@/lib/auth';
import { getTeacherClassIds, requireTeacherClass, studentListSelect } from '@/lib/teacher-scope';
import { generateTempPassword } from '@/lib/temp-password';
import { featureApiError } from '@/lib/feature-api-error';

const profile = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(150),
  jk: z.enum(['L', 'P', '']).default(''),
  phone: z.string().trim().max(30).default(''),
  namaOrtu: z.string().trim().max(150).default(''),
});
const createInput = profile.extend({
  classId: z.string().min(1),
  nisn: z.string().regex(/^\d{10}$/, 'NISN harus 10 digit; simpan sebagai teks agar nol di depan tetap ada'),
}).strict();
const editInput = profile.extend({ id: z.string().min(1) }).strict();
const claimInput = z.object({ action: z.literal('claim'), id: z.string().min(1), classId: z.string().min(1) }).strict();

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU']);
    if (!auth.schoolId) throw new AuthError('Akun belum terhubung ke sekolah', 403);
    const params = new URL(request.url).searchParams;
    const classId = params.get('classId');
    if (!classId) throw new AuthError('Pilih kelas terlebih dahulu', 400);
    await requireTeacherClass(auth, classId);
    const query = (params.get('q') || '').trim().slice(0, 100);
    const pool = params.get('pool') === 'unassigned';
    // The school pool is a deliberate, minimal exception to class visibility:
    // only search results for unassigned students, never another teacher's class.
    if (pool && query.length < 2) return NextResponse.json([]);
    const students = await db.user.findMany({
      where: {
        schoolId: auth.schoolId, role: 'SISWA', isActive: true, classId: pool ? null : classId,
        ...(query ? { OR: [{ name: { contains: query, mode: 'insensitive' as const } }, { nisn: { contains: query } }] } : {}),
      },
      select: pool ? { id: true, name: true, nisn: true } : studentListSelect,
      orderBy: { name: 'asc' },
      ...(pool ? { take: 20 } : {}),
    });
    return NextResponse.json(students);
  } catch (error) { return featureApiError(error); }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU']);
    const input = createInput.parse(await request.json());
    await requireTeacherClass(auth, input.classId);
    const temporaryPassword = generateTempPassword();
    const password = await hashPassword(temporaryPassword);
    const student = await db.$transaction(async (tx) => {
      const result = await tx.user.create({
        data: {
          ...input, username: input.nisn, password, role: 'SISWA', schoolId: auth.schoolId!,
          mustChangePassword: true, isActive: true,
        },
        select: studentListSelect,
      });
      await tx.activityLog.create({ data: {
        userId: auth.userId, schoolId: auth.schoolId, module: 'Pengguna',
        action: 'Menambah siswa', detail: `Siswa ${result.id} ditambahkan ke kelas ${input.classId}.`,
      } });
      return result;
    });
    return NextResponse.json({ student, temporaryPassword }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return featureApiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU']);
    if (!auth.schoolId) throw new AuthError('Akun belum terhubung ke sekolah', 403);
    const body = await request.json();
    const input = body?.action === 'claim' ? claimInput.parse(body) : editInput.parse(body);
    const classIds = await getTeacherClassIds(auth);
    const claiming = 'action' in input;
    if (claiming && !classIds.includes(input.classId)) throw new AuthError('Bukan kelas Anda', 403);
    const student = await db.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id: input.id, schoolId: auth.schoolId, role: 'SISWA', isActive: true,
          classId: claiming ? null : { in: classIds } },
        data: claiming ? { classId: input.classId } : {
          name: input.name, jk: input.jk, phone: input.phone, namaOrtu: input.namaOrtu,
        },
      });
      if (result.count !== 1) throw new AuthError(claiming
        ? 'Siswa tidak tersedia. Siswa mungkin sudah masuk kelas lain; muat ulang daftar.'
        : 'Siswa tidak ditemukan di kelas Anda', 409);
      await tx.activityLog.create({ data: {
        userId: auth.userId, schoolId: auth.schoolId, module: 'Pengguna',
        action: claiming ? 'Memasukkan siswa ke kelas' : 'Memperbarui siswa',
        detail: `Siswa ${input.id}${claiming ? ` dimasukkan ke kelas ${input.classId}` : ' diperbarui'}.`,
      } });
      return tx.user.findUnique({ where: { id: input.id }, select: studentListSelect });
    });
    return NextResponse.json({ student });
  } catch (error) { return featureApiError(error); }
}

// Remove class membership only. Academic history and the account are retained.
export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU']);
    const id = new URL(request.url).searchParams.get('id');
    if (!id || !auth.schoolId) throw new AuthError('Siswa dan sekolah diperlukan', 400);
    const classIds = await getTeacherClassIds(auth);
    await db.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id, schoolId: auth.schoolId, role: 'SISWA', classId: { in: classIds } },
        data: { classId: null },
      });
      if (result.count !== 1) throw new AuthError('Siswa tidak ditemukan di kelas Anda', 404);
      await tx.activityLog.create({ data: {
        userId: auth.userId, schoolId: auth.schoolId, module: 'Pengguna',
        action: 'Mengeluarkan siswa dari kelas', detail: `Siswa ${id}; akun dan riwayat belajar tetap disimpan.`,
      } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return featureApiError(error); }
}
