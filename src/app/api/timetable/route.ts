import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']);
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');

    const where: any = {};
    // Enforce school scope
    const effectiveSchoolId = getSchoolFilter(auth);
    if (effectiveSchoolId) {
      where.schoolId = effectiveSchoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }
    if (classId) where.classId = classId;

    const entries = await db.timetable.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, code: true, type: true } },
        teacher: { select: { id: true, name: true, nip: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ day: 'asc' }, { slotNumber: 'asc' }],
    });

    const flat = entries.map((e) => ({
      id: e.id, day: e.day, slotNumber: e.slotNumber, subjectId: e.subjectId,
      subjectName: e.subject.name, subjectCode: e.subject.code, subjectType: e.subject.type,
      teacherId: e.teacherId, teacherName: e.teacher.name, classId: e.classId,
      className: e.class.name, schoolId: e.schoolId,
    }));

    return NextResponse.json(flat);
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    return NextResponse.json({ error: 'Gagal mengambil data jadwal' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const data = await request.json();
    const { day, slotNumber, subjectId, teacherId, classId, schoolId } = data;
    if (!day || !slotNumber || !subjectId || !teacherId || !classId || !schoolId) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
    }
    // Enforce school scope
    if (auth.role !== 'SUPER_ADMIN') {
      requireSchoolScope(auth, schoolId);
    }
    const existing = await db.timetable.findFirst({ where: { day, slotNumber: Number(slotNumber), classId, schoolId } });
    if (existing) { return NextResponse.json({ error: 'Slot pada hari dan kelas ini sudah terisi' }, { status: 409 }); }

    const entry = await db.timetable.create({
      data: { day, slotNumber: Number(slotNumber), subjectId, teacherId, classId, schoolId },
      include: { subject: { select: { id: true, name: true, code: true, type: true } }, teacher: { select: { id: true, name: true, nip: true } }, class: { select: { id: true, name: true } } },
    });
    return NextResponse.json({
      id: entry.id, day: entry.day, slotNumber: entry.slotNumber, subjectId: entry.subjectId,
      subjectName: entry.subject.name, subjectCode: entry.subject.code, subjectType: entry.subject.type,
      teacherId: entry.teacherId, teacherName: entry.teacher.name, classId: entry.classId,
      className: entry.class.name, schoolId: entry.schoolId,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Slot sudah terisi' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menambahkan jadwal' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    // Verify school scope
    if (auth.role !== 'SUPER_ADMIN') {
      const existing = await db.timetable.findUnique({ where: { id }, select: { schoolId: true } });
      if (existing?.schoolId) requireSchoolScope(auth, existing.schoolId);
    }

    const entry = await db.timetable.update({
      where: { id },
      data: { ...(data.day && { day: data.day }), ...(data.slotNumber && { slotNumber: Number(data.slotNumber) }), ...(data.subjectId && { subjectId: data.subjectId }), ...(data.teacherId && { teacherId: data.teacherId }) },
    });
    return NextResponse.json(entry);
  } catch (error: unknown) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    return NextResponse.json({ error: 'Gagal memperbarui jadwal' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    // Verify school scope
    if (auth.role !== 'SUPER_ADMIN') {
      const existing = await db.timetable.findUnique({ where: { id }, select: { schoolId: true } });
      if (existing?.schoolId) requireSchoolScope(auth, existing.schoolId);
    }

    await db.timetable.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    return NextResponse.json({ error: 'Gagal menghapus jadwal' }, { status: 500 });
  }
}
