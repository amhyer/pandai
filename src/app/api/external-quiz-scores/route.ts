import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { requireStudentScope, getSchoolFilter } from '@/lib/scope';
import { logAccess } from '@/lib/audit-log';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'SISWA']);
    try { await logAccess(auth, { action: 'READ', resourceType: 'external-quiz-scores' }); } catch {}

    if (auth.role === 'KEPALA_SEKOLAH') {
      return NextResponse.json({ error: 'Kepala Sekolah hanya dapat mengakses data agregat.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get('materialId');
    const studentId = searchParams.get('studentId');
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');

    const where: Record<string, unknown> = {};

    // IDOR fix: SISWA can only see own scores
    if (auth.role === 'SISWA') {
      if (studentId && studentId !== auth.userId) {
        throw new AuthError('Tidak diizinkan mengakses data siswa lain', 403);
      }
      where.studentId = auth.userId;
      if (auth.schoolId) where.schoolId = auth.schoolId;
    } else {
      // GURU, ADMIN_SCHOOL, SUPER_ADMIN
      const schoolF = getSchoolFilter(auth);
      if (schoolF) where.schoolId = schoolF;
      else if (schoolId) where.schoolId = schoolId;
      if (studentId) {
        await requireStudentScope(auth, studentId);
        where.studentId = studentId;
      }
      if (classId) where.classId = classId;
    }
    if (materialId) where.materialId = materialId;

    const scores = await db.externalQuizScore.findMany({ where, orderBy: [{ createdAt: 'desc' }], take: 200 });
    const enriched = await Promise.all(scores.map(async (s) => {
      const [student, material] = await Promise.all([
        db.user.findUnique({ where: { id: s.studentId }, select: { id: true, name: true, nisn: true } }),
        db.material.findUnique({ where: { id: s.materialId }, select: { id: true, title: true, externalProvider: true } }),
      ]);
      return { ...s, student, material };
    }));
    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    await logError({ error, route: '/api/external-quiz-scores', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil nilai kuis eksternal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { materialId, studentId, schoolId, classId, score, note, entryMode } = body;
    try { await logAccess(auth, { action: 'CREATE', resourceType: 'external-quiz-scores', targetUserId: studentId }); } catch {}

    if (!materialId || !studentId || score === undefined) {
      return NextResponse.json({ error: 'Data wajib belum lengkap (materialId, studentId, score)' }, { status: 400 });
    }
    if (score < 0 || score > 100) { return NextResponse.json({ error: 'Score harus antara 0-100' }, { status: 400 }); }

    if (entryMode === 'SELF_REPORTED') {
      if (auth.role !== 'SISWA') { return NextResponse.json({ error: 'Hanya siswa yang dapat melaporkan nilai sendiri' }, { status: 403 }); }
      if (studentId !== auth.userId) { return NextResponse.json({ error: 'Tidak dapat melaporkan nilai untuk siswa lain' }, { status: 403 }); }
    } else if (entryMode === 'TEACHER_ENTERED') {
      if (auth.role !== 'GURU' && auth.role !== 'ADMIN_SCHOOL') { return NextResponse.json({ error: 'Hanya guru yang dapat menginput nilai siswa' }, { status: 403 }); }
    }

    const existing = await db.externalQuizScore.findFirst({ where: { materialId, studentId } });
    let result;
    if (existing) {
      result = await db.externalQuizScore.update({ where: { id: existing.id }, data: { score, note: note || null, enteredBy: auth.userId } });
    } else {
      result = await db.externalQuizScore.create({ data: { materialId, studentId, schoolId: schoolId || null, classId: classId || null, score, note: note || null, enteredBy: auth.userId, entryMode: entryMode || 'SELF_REPORTED' } });
    }
    return NextResponse.json(result, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    await logError({ error, route: '/api/external-quiz-scores', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menyimpan nilai kuis eksternal' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['GURU', 'ADMIN_SCHOOL']);
    const body = await req.json();
    const { id, score, note } = body;
    try { await logAccess(auth, { action: 'UPDATE', resourceType: 'external-quiz-scores' }); } catch {}
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });
    if (score !== undefined && (score < 0 || score > 100)) { return NextResponse.json({ error: 'Score harus antara 0-100' }, { status: 400 }); }

    // IDOR fix: verify the score record belongs to the same school
    const existing = await db.externalQuizScore.findUnique({ where: { id }, select: { schoolId: true } });
    if (!existing) return NextResponse.json({ error: 'Nilai tidak ditemukan' }, { status: 404 });
    if (existing.schoolId) {
      const schoolF = getSchoolFilter(auth);
      if (schoolF && existing.schoolId !== schoolF) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    const result = await db.externalQuizScore.update({ where: { id }, data: { ...(score !== undefined && { score }), ...(note !== undefined && { note }) } });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    await logError({ error, route: '/api/external-quiz-scores', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal mengupdate nilai' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    try { await logAccess(auth, { action: 'DELETE', resourceType: 'external-quiz-scores' }); } catch {}
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    // IDOR fix: verify the score record belongs to the same school
    const existing = await db.externalQuizScore.findUnique({ where: { id }, select: { schoolId: true } });
    if (!existing) return NextResponse.json({ error: 'Nilai tidak ditemukan' }, { status: 404 });
    if (existing.schoolId) {
      const schoolF = getSchoolFilter(auth);
      if (schoolF && existing.schoolId !== schoolF) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    await db.externalQuizScore.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    await logError({ error, route: '/api/external-quiz-scores', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal menghapus nilai' }, { status: 500 });
  }
}
