import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { logError } from '@/lib/error-log';

// ─── GET: List student grades ───
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const componentId = searchParams.get('componentId');
    const subjectId = searchParams.get('subjectId');
    const classId = searchParams.get('classId');
    const term = searchParams.get('term');

    const where: Record<string, unknown> = {};

    // Role-based filtering
    if (auth.role === 'SISWA') {
      where.studentId = auth.userId;
      where.schoolId = auth.schoolId;
    } else if (auth.role === 'ORANG_TUA') {
      const children = await db.user.findMany({
        where: { parentId: auth.userId, schoolId: auth.schoolId },
        select: { id: true },
      });
      if (children.length === 0) return NextResponse.json([]);
      where.studentId = { in: children.map(c => c.id) };
      where.schoolId = auth.schoolId;
    } else {
      if (auth.role !== 'SUPER_ADMIN' && auth.schoolId) where.schoolId = auth.schoolId;
      if (studentId) where.studentId = studentId;
    }

    if (componentId) where.componentId = componentId;
    if (subjectId) where.subjectId = subjectId;
    if (classId) where.classId = classId;
    if (term) where.term = term;

    const grades = await db.studentGrade.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, nisn: true } },
        component: { select: { id: true, name: true, weight: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    return NextResponse.json(grades);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/student-grades', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil nilai' }, { status: 500 });
  }
}

// ─── POST: Create or upsert student grade (GURU, ADMIN) ───
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH', 'SUPER_ADMIN']);
    const body = await request.json();
    const { studentId, componentId, score, maxScore, source, sourceId, date, note, classId, subjectId, term } = body;

    if (!studentId || !componentId || score === undefined) {
      return NextResponse.json({ error: 'studentId, componentId, dan score wajib diisi' }, { status: 400 });
    }

    if (score < 0 || score > (maxScore || 100)) {
      return NextResponse.json({ error: `Score harus 0-${maxScore || 100}` }, { status: 400 });
    }

    // Verify component exists and in same school
    const component = await db.gradeComponent.findUnique({ where: { id: componentId } });
    if (!component) return NextResponse.json({ error: 'Komponen tidak ditemukan' }, { status: 404 });

    const targetSchoolId = auth.role === 'SUPER_ADMIN' ? component.schoolId : auth.schoolId;
    if (auth.role !== 'SUPER_ADMIN' && component.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak — komponen dari sekolah lain' }, { status: 403 });
    }

    const sourceType = source || 'MANUAL';
    const effectiveTerm = term || component.term;
    const effectiveSubjectId = subjectId || component.subjectId;
    const effectiveClassId = classId || component.classId;

    // Build unique key for upsert
    const upsertKey = sourceId
      ? { studentId_componentId_source_sourceId: { studentId, componentId, source: sourceType, sourceId } }
      : { studentId_componentId_source_sourceId: { studentId, componentId, source: sourceType, sourceId: `manual_${auth.userId}_${componentId}` } };

    const grade = await db.studentGrade.upsert({
      where: upsertKey,
      create: {
        studentId,
        schoolId: targetSchoolId,
        classId: effectiveClassId || null,
        componentId,
        subjectId: effectiveSubjectId || null,
        score: parseFloat(score),
        maxScore: maxScore ? parseFloat(maxScore) : 100,
        source: sourceType,
        sourceId: sourceId || null,
        gradedBy: auth.userId,
        term: effectiveTerm,
        date: date || null,
        note: note || null,
      },
      update: {
        score: parseFloat(score),
        maxScore: maxScore ? parseFloat(maxScore) : 100,
        gradedBy: auth.userId,
        date: date || undefined,
        note: note !== undefined ? note : undefined,
      },
      include: {
        student: { select: { id: true, name: true } },
        component: { select: { id: true, name: true, weight: true } },
      },
    });

    return NextResponse.json(grade);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/student-grades', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menyimpan nilai' }, { status: 500 });
  }
}

// ─── PATCH: Update a student grade ───
export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH', 'SUPER_ADMIN']);
    const { id, score, note, date } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const existing = await db.studentGrade.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Nilai tidak ditemukan' }, { status: 404 });
    if (auth.role !== 'SUPER_ADMIN' && existing.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (score !== undefined) {
      if (score < 0 || score > existing.maxScore) {
        return NextResponse.json({ error: `Score harus 0-${existing.maxScore}` }, { status: 400 });
      }
      data.score = parseFloat(score);
    }
    if (note !== undefined) data.note = note;
    if (date !== undefined) data.date = date;

    const updated = await db.studentGrade.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/student-grades', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal update nilai' }, { status: 500 });
  }
}

// ─── DELETE: Remove a student grade (MANUAL only, auto-pulled grades need source removal) ───
export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const existing = await db.studentGrade.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Nilai tidak ditemukan' }, { status: 404 });
    if (auth.role !== 'SUPER_ADMIN' && existing.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    await db.studentGrade.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/student-grades', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal hapus nilai' }, { status: 500 });
  }
}
