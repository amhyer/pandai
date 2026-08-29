import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';

/** Build an error JSON response for AuthError / { status, message } shaped errors. */
function errorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    const message = (error as { message?: unknown }).message;
    if (typeof status === 'number') {
      return NextResponse.json({ error: typeof message === 'string' ? message : 'Terjadi kesalahan' }, { status });
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');

    // P1-02: Enforce school scope on GET
    const schoolF = getSchoolFilter(auth);
    const effectiveSchoolId = schoolF || (schoolId && auth.role === 'SUPER_ADMIN' ? schoolId : null);

    const where: Record<string, unknown> = {};
    if (effectiveSchoolId) where.schoolId = effectiveSchoolId;
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;

    const assignments = await db.teacherAssignment.findMany({ where, orderBy: { createdAt: 'desc' } });

    const enriched = await Promise.all(assignments.map(async (a) => {
      const [teacher, cls, subject] = await Promise.all([
        a.teacherId ? db.user.findUnique({ where: { id: a.teacherId }, select: { id: true, name: true, nip: true } }) : null,
        a.classId ? db.class.findUnique({ where: { id: a.classId }, select: { id: true, name: true, grade: true } }) : null,
        a.subjectId ? db.subject.findUnique({ where: { id: a.subjectId }, select: { id: true, name: true } }) : null,
      ]);
      return { ...a, teacher, class: cls, subject };
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    const res = errorResponse(error);
    if (res) return res;
    console.error('GET /api/teacher-assignments error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data penugasan' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const body = await req.json();
    const { teacherId, subjectId, classId, schoolId: bodySchoolId, academicYear, semester } = body;
    if (!teacherId) { return NextResponse.json({ error: 'Guru wajib diisi' }, { status: 400 }); }

    // P1-02: Use auth schoolId, verify scope if client provides one
    const schoolId = getSchoolFilter(auth) || bodySchoolId;
    if (!schoolId) { return NextResponse.json({ error: 'Sekolah wajib diisi' }, { status: 400 }); }
    if (bodySchoolId) requireSchoolScope(auth, bodySchoolId);

    const assignment = await db.teacherAssignment.create({
      data: { teacherId, subjectId: subjectId || null, classId: classId || null, schoolId, academicYear: academicYear || '2024/2025', semester: semester || 'Ganjil' },
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    const res = errorResponse(error);
    if (res) return res;
    console.error('POST /api/teacher-assignments error:', error);
    return NextResponse.json({ error: 'Gagal membuat penugasan' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const body = await req.json();
    const { id, subjectId, classId, academicYear, semester } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    // P1-02: Verify school scope before update
    const existing = await db.teacherAssignment.findUnique({ where: { id }, select: { schoolId: true } });
    if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
    if (existing.schoolId) { try { requireSchoolScope(auth, existing.schoolId); } catch { throw new AuthError('Akses ditolak', 403); } }

    const assignment = await db.teacherAssignment.update({
      where: { id },
      data: { ...(subjectId !== undefined && { subjectId }), ...(classId !== undefined && { classId }), ...(academicYear && { academicYear }), ...(semester && { semester }) },
    });
    return NextResponse.json(assignment);
  } catch (error) {
    const res = errorResponse(error);
    if (res) return res;
    console.error('PATCH /api/teacher-assignments error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate penugasan' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    // P1-02: Verify school scope before delete
    const existing = await db.teacherAssignment.findUnique({ where: { id }, select: { schoolId: true } });
    if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
    if (existing.schoolId) { try { requireSchoolScope(auth, existing.schoolId); } catch { throw new AuthError('Akses ditolak', 403); } }

    await db.teacherAssignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const res = errorResponse(error);
    if (res) return res;
    console.error('DELETE /api/teacher-assignments error:', error);
    return NextResponse.json({ error: 'Gagal menghapus penugasan' }, { status: 500 });
  }
}
