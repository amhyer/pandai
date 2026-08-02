import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/materials
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const type = searchParams.get('type'); // materi, tugas, quiz
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (type) where.type = type;
    if (status) where.status = status;

    const materials = await db.material.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    // Enrich with teacher/subject/class names
    const enriched = await Promise.all(
      materials.map(async (m) => {
        const [teacher, subject, cls] = await Promise.all([
          m.teacherId ? db.user.findUnique({ where: { id: m.teacherId }, select: { name: true } }) : null,
          m.subjectId ? db.subject.findUnique({ where: { id: m.subjectId }, select: { name: true } }) : null,
          m.classId ? db.class.findUnique({ where: { id: m.classId }, select: { name: true } }) : null,
        ]);
        return { ...m, teacher, subject, class: cls };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('GET /api/materials error:', error);
    return NextResponse.json({ error: 'Gagal mengambil materi' }, { status: 500 });
  }
}

// POST /api/materials
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, content, subjectId, topicId, classId, schoolId, teacherId, type, status, dueDate } = body;

    if (!title) {
      return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    }

    const material = await db.material.create({
      data: {
        title,
        description: description || null,
        content: content || null,
        subjectId: subjectId || null,
        topicId: topicId || null,
        classId: classId || null,
        schoolId: schoolId || null,
        teacherId: teacherId || null,
        type: type || 'materi',
        status: status || 'published',
        dueDate: dueDate || null,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error('POST /api/materials error:', error);
    return NextResponse.json({ error: 'Gagal membuat materi' }, { status: 500 });
  }
}

// PATCH /api/materials
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, description, content, type, status, dueDate } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const material = await db.material.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(type && { type }),
        ...(status && { status }),
        ...(dueDate !== undefined && { dueDate }),
      },
    });

    return NextResponse.json(material);
  } catch (error) {
    console.error('PATCH /api/materials error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate materi' }, { status: 500 });
  }
}

// DELETE /api/materials
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    await db.material.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/materials error:', error);
    return NextResponse.json({ error: 'Gagal menghapus materi' }, { status: 500 });
  }
}
