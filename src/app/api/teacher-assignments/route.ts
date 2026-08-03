import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/teacher-assignments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;

    const assignments = await db.teacherAssignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with teacher/class/subject names
    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const [teacher, cls, subject] = await Promise.all([
          a.teacherId ? db.user.findUnique({ where: { id: a.teacherId }, select: { id: true, name: true, nip: true } }) : null,
          a.classId ? db.class.findUnique({ where: { id: a.classId }, select: { id: true, name: true, grade: true } }) : null,
          a.subjectId ? db.subject.findUnique({ where: { id: a.subjectId }, select: { id: true, name: true } }) : null,
        ]);
        return { ...a, teacher, class: cls, subject };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('GET /api/teacher-assignments error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data penugasan' }, { status: 500 });
  }
}

// POST /api/teacher-assignments
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teacherId, subjectId, classId, schoolId, academicYear, semester } = body;

    if (!teacherId || !schoolId) {
      return NextResponse.json({ error: 'Guru dan sekolah wajib diisi' }, { status: 400 });
    }

    const assignment = await db.teacherAssignment.create({
      data: {
        teacherId,
        subjectId: subjectId || null,
        classId: classId || null,
        schoolId,
        academicYear: academicYear || '2024/2025',
        semester: semester || 'Ganjil',
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('POST /api/teacher-assignments error:', error);
    return NextResponse.json({ error: 'Gagal membuat penugasan' }, { status: 500 });
  }
}

// PATCH /api/teacher-assignments
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, subjectId, classId, academicYear, semester } = body;

    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const assignment = await db.teacherAssignment.update({
      where: { id },
      data: {
        ...(subjectId !== undefined && { subjectId }),
        ...(classId !== undefined && { classId }),
        ...(academicYear && { academicYear }),
        ...(semester && { semester }),
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('PATCH /api/teacher-assignments error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate penugasan' }, { status: 500 });
  }
}

// DELETE /api/teacher-assignments
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    await db.teacherAssignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/teacher-assignments error:', error);
    return NextResponse.json({ error: 'Gagal menghapus penugasan' }, { status: 500 });
  }
}
