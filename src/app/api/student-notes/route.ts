import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { AuthError, requireRole } from '@/lib/auth';
import { getAccessibleStudentIds, requireStudentScope } from '@/lib/scope';
import { getTeacherClassIds } from '@/lib/teacher-scope';
import { featureApiError } from '@/lib/feature-api-error';

const fields = z.object({
  category: z.enum(['apresiasi', 'perhatian', 'umum']),
  content: z.string().trim().min(1, 'Catatan wajib diisi').max(3000, 'Catatan maksimal 3.000 karakter'),
  date: z.iso.date('Tanggal tidak valid'),
});
const createInput = fields.extend({ studentId: z.string().min(1, 'Pilih siswa') }).strict();
const updateInput = fields.extend({ id: z.string().min(1) }).strict();
const noteSelect = {
  id: true, studentId: true, authorId: true, category: true, content: true, date: true, createdAt: true,
  student: { select: { id: true, name: true, nisn: true } },
  author: { select: { id: true, name: true } },
  class: { select: { id: true, name: true } },
} as const;

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU', 'ORANG_TUA', 'KEPALA_SEKOLAH', 'ADMIN_SCHOOL']);
    if (!auth.schoolId) throw new AuthError('Akun belum terhubung ke sekolah', 403);
    const params = new URL(request.url).searchParams;
    const studentId = params.get('studentId');
    const studentIds = await getAccessibleStudentIds(auth);
    if (studentId && !studentIds.includes(studentId)) throw new AuthError('Akses siswa ditolak', 403);
    if (params.get('options') === 'students') {
      return NextResponse.json(await db.user.findMany({
        where: { id: { in: studentIds }, schoolId: auth.schoolId, role: 'SISWA', isActive: true },
        select: { id: true, name: true, nisn: true, class: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }));
    }
    const category = params.get('category');
    if (category && !['apresiasi', 'perhatian', 'umum'].includes(category)) throw new AuthError('Kategori tidak valid', 400);
    const page = Math.max(1, Math.min(10000, Number(params.get('page')) || 1));
    const where = {
      schoolId: auth.schoolId, studentId: studentId || { in: studentIds },
      ...(auth.role === 'GURU' ? { classId: { in: await getTeacherClassIds(auth) } } : {}),
      ...(category ? { category } : {}),
    };
    const [data, total] = await Promise.all([
      db.studentNote.findMany({ where, select: noteSelect, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 25, skip: (Math.floor(page) - 1) * 25 }),
      db.studentNote.count({ where }),
    ]);
    return NextResponse.json({ data, total });
  } catch (error) { return featureApiError(error); }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU']);
    const input = createInput.parse(await request.json());
    await requireStudentScope(auth, input.studentId);
    const classIds = await getTeacherClassIds(auth);
    const note = await db.$transaction(async (tx) => {
      const student = await tx.user.findFirst({
        where: { id: input.studentId, role: 'SISWA', isActive: true, schoolId: auth.schoolId, classId: { in: classIds } },
        select: { classId: true },
      });
      if (!student?.classId) throw new AuthError('Siswa tidak berada di kelas Anda', 403);
      const result = await tx.studentNote.create({
        data: { ...input, authorId: auth.userId, schoolId: auth.schoolId!, classId: student.classId },
        select: noteSelect,
      });
      await tx.activityLog.create({ data: {
        userId: auth.userId, schoolId: auth.schoolId, module: 'Catatan Siswa',
        action: 'Menambah catatan siswa', detail: `Catatan ${result.id}, kategori ${input.category}.`,
      } });
      return result;
    });
    return NextResponse.json(note, { status: 201 });
  } catch (error) { return featureApiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU']);
    if (!auth.schoolId) throw new AuthError('Sekolah tidak ditemukan', 403);
    const { id, ...data } = updateInput.parse(await request.json());
    const note = await db.studentNote.findFirst({ where: { id, authorId: auth.userId, schoolId: auth.schoolId! } });
    if (!note) throw new AuthError('Catatan tidak ditemukan atau bukan buatan Anda', 404);
    await requireStudentScope(auth, note.studentId);
    const classIds = await getTeacherClassIds(auth);
    if (!note.classId || !classIds.includes(note.classId)) throw new AuthError('Catatan bukan dari kelas Anda', 403);
    await db.$transaction(async (tx) => {
      await tx.studentNote.update({ where: { id }, data });
      await tx.activityLog.create({ data: {
        userId: auth.userId, schoolId: auth.schoolId, module: 'Catatan Siswa',
        action: 'Memperbarui catatan siswa', detail: `Catatan ${id}.`,
      } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return featureApiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU']);
    const id = new URL(request.url).searchParams.get('id');
    if (!id || !auth.schoolId) throw new AuthError('ID catatan diperlukan', 400);
    const note = await db.studentNote.findFirst({ where: { id, authorId: auth.userId, schoolId: auth.schoolId } });
    if (!note) throw new AuthError('Catatan tidak ditemukan atau bukan buatan Anda', 404);
    await requireStudentScope(auth, note.studentId);
    const classIds = await getTeacherClassIds(auth);
    if (!note.classId || !classIds.includes(note.classId)) throw new AuthError('Catatan bukan dari kelas Anda', 403);
    await db.$transaction(async (tx) => {
      await tx.studentNote.delete({ where: { id } });
      await tx.activityLog.create({ data: {
        userId: auth.userId, schoolId: auth.schoolId, module: 'Catatan Siswa',
        action: 'Menghapus catatan siswa', detail: `Catatan ${id}.`,
      } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return featureApiError(error); }
}
