import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';

const VALID_CATEGORIES = ['umum', 'apresiasi', 'perbaikan', 'perhatian'];

/** Term berjalan berdasarkan tanggal (Juli-Des = Ganjil, Jan-Jun = Genap). */
export function currentTerm(d = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const pair = m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  return `${pair}-${m >= 7 ? 'Ganjil' : 'Genap'}`;
}

// ===== GET /api/guru-catatan =====
// - GURU: catatan yang penulisannya miliknya (opsional ?classId=)
// - SISWA: catatan tentang dirinya
// - ORANG_TUA: ?studentId= anaknya (diverifikasi relasi)
// - KEPALA_SEKOLAH / ADMIN_SCHOOL: ?classId= (scope sekolah)
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');
    const term = searchParams.get('term');
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};

    switch (auth.role) {
      case 'GURU':
        where.teacherId = auth.userId;
        if (classId) where.classId = classId;
        break;
      case 'SISWA':
        where.studentId = auth.userId;
        break;
      case 'ORANG_TUA': {
        if (!studentId) return NextResponse.json({ error: 'studentId diperlukan' }, { status: 400 });
        const child = await db.user.findFirst({
          where: { id: studentId, parentId: auth.userId, role: 'SISWA' },
          select: { id: true },
        });
        if (!child) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        where.studentId = studentId;
        break;
      }
      case 'KEPALA_SEKOLAH':
      case 'ADMIN_SCHOOL':
      case 'SUPER_ADMIN':
        // Non-super-admin terikat sekolahnya; super admin tanpa sekolahId = semua
        if (auth.schoolId) where.schoolId = auth.schoolId;
        if (classId) where.classId = classId;
        if (studentId) where.studentId = studentId;
        break;
      default:
        return NextResponse.json({ error: 'Role tidak diizinkan' }, { status: 403 });
    }

    if (term) where.term = term;
    if (category) where.category = category;

    const items = await db.guruCatatan.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, nisn: true, class: { select: { id: true, name: true } } } },
        teacher: { select: { id: true, name: true, nip: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });

    return NextResponse.json(items);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/guru-catatan', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil catatan' }, { status: 500 });
  }
}

// ===== POST /api/guru-catatan =====
// GURU membuat catatan untuk siswa di sekolahnya.
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU', 'ADMIN_SCHOOL']);
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Akun tidak terikat sekolah' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      studentId?: string;
      subjectId?: string | null;
      term?: string;
      date?: string;
      category?: string;
      content?: string;
    };

    const { studentId, content } = body;
    if (!studentId) return NextResponse.json({ error: 'studentId diperlukan' }, { status: 400 });
    if (!content || !content.trim()) return NextResponse.json({ error: 'Isi catatan diperlukan' }, { status: 400 });
    if (content.trim().length > 2000) {
      return NextResponse.json({ error: 'Catatan maksimal 2000 karakter' }, { status: 400 });
    }
    const category = body.category && VALID_CATEGORIES.includes(body.category) ? body.category : 'umum';
    const term = body.term || currentTerm();
    const date = body.date || new Date().toISOString().slice(0, 10);

    // Siswa harus ada & di sekolah yang sama
    const student = await db.user.findFirst({
      where: { id: studentId, role: 'SISWA', schoolId: auth.schoolId },
      select: { id: true, classId: true },
    });
    if (!student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan di sekolah ini' }, { status: 404 });
    }

    const catatan = await db.guruCatatan.create({
      data: {
        studentId,
        classId: student.classId,
        schoolId: auth.schoolId,
        teacherId: auth.userId,
        subjectId: body.subjectId || null,
        term,
        date,
        category,
        content: content.trim(),
      },
      include: {
        student: { select: { id: true, name: true, class: { select: { name: true } } } },
        teacher: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: catatan }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/guru-catatan', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menyimpan catatan' }, { status: 500 });
  }
}
