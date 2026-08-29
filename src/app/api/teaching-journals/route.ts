import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']);
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const month = searchParams.get('month');

    const where: Record<string, unknown> = {};
    // Enforce school scope
    const effectiveSchoolId = getSchoolFilter(auth);
    if (effectiveSchoolId) {
      where.schoolId = effectiveSchoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (month) { where.date = { startsWith: month } as any; }

    const journals = await db.teachingJournal.findMany({ where, orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 200 });

    // Batch-fetch related entities to avoid N+1 queries
    const teacherIds = [...new Set(journals.map((j) => j.teacherId).filter((id): id is string => !!id))];
    const classIds = [...new Set(journals.map((j) => j.classId).filter((id): id is string => !!id))];
    const subjectIds = [...new Set(journals.map((j) => j.subjectId).filter((id): id is string => !!id))];

    const [teachers, classes, subjects] = await Promise.all([
      teacherIds.length > 0 ? db.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true } }) : [],
      classIds.length > 0 ? db.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } }) : [],
      subjectIds.length > 0 ? db.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } }) : [],
    ]);

    const teacherMap = new Map(teachers.map((t) => [t.id, t] as [string, typeof t]));
    const classMap = new Map(classes.map((c) => [c.id, c] as [string, typeof c]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s] as [string, typeof s]));

    const enriched = journals.map((j) => ({
      ...j,
      teacher: j.teacherId ? teacherMap.get(j.teacherId) ?? null : null,
      class: j.classId ? classMap.get(j.classId) ?? null : null,
      subject: j.subjectId ? subjectMap.get(j.subjectId) ?? null : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    return NextResponse.json({ error: 'Gagal mengambil jurnal mengajar' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);
    const body = await req.json();
    const { teacherId, classId, subjectId, schoolId, date, topic, activities, notes } = body;
    if (!teacherId || !date || !topic) { return NextResponse.json({ error: 'Guru, tanggal, dan topik wajib diisi' }, { status: 400 }); }

    const effectiveSchoolId = schoolId || auth.schoolId || null;
    if (effectiveSchoolId && auth.role !== 'SUPER_ADMIN') {
      requireSchoolScope(auth, effectiveSchoolId);
    }

    const journal = await db.teachingJournal.create({
      data: { teacherId, classId: classId || null, subjectId: subjectId || null, schoolId: effectiveSchoolId, date, topic, activities: activities || null, notes: notes || null },
    });
    return NextResponse.json(journal, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    return NextResponse.json({ error: 'Gagal membuat jurnal mengajar' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);
    const body = await req.json();
    const { id, topic, activities, notes } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    // Verify school scope
    if (auth.role !== 'SUPER_ADMIN') {
      const existing = await db.teachingJournal.findUnique({ where: { id }, select: { schoolId: true } });
      if (existing?.schoolId) requireSchoolScope(auth, existing.schoolId);
    }

    const journal = await db.teachingJournal.update({
      where: { id },
      data: { ...(topic && { topic }), ...(activities !== undefined && { activities }), ...(notes !== undefined && { notes }) },
    });
    return NextResponse.json(journal);
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    return NextResponse.json({ error: 'Gagal mengupdate jurnal' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    // Verify school scope
    if (auth.role !== 'SUPER_ADMIN') {
      const existing = await db.teachingJournal.findUnique({ where: { id }, select: { schoolId: true } });
      if (existing?.schoolId) requireSchoolScope(auth, existing.schoolId);
    }

    await db.teachingJournal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    return NextResponse.json({ error: 'Gagal menghapus jurnal' }, { status: 500 });
  }
}
