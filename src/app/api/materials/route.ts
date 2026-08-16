import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { detectExternalProvider, isValidUrl } from '@/lib/external-quiz';
import { logError } from '@/lib/error-log';

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
    const isExternal = searchParams.get('isExternal'); // 'true' to filter only external quizzes

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (isExternal === 'true') {
      where.externalUrl = { not: null };
    }

    const materials = await db.material.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    // Enrich with teacher/subject/class names and external quiz scores
    const enriched = await Promise.all(
      materials.map(async (m) => {
        const [teacher, subject, cls] = await Promise.all([
          m.teacherId ? db.user.findUnique({ where: { id: m.teacherId }, select: { name: true } }) : null,
          m.subjectId ? db.subject.findUnique({ where: { id: m.subjectId }, select: { name: true } }) : null,
          m.classId ? db.class.findUnique({ where: { id: m.classId }, select: { name: true } }) : null,
        ]);

        const enriched_m: Record<string, unknown> = { ...m, teacher, subject, class: cls };

        // If external quiz, fetch scores
        if (m.externalUrl) {
          const scores = await db.externalQuizScore.findMany({
            where: { materialId: m.id },
            orderBy: { createdAt: 'desc' },
            take: 100,
          });
          (enriched_m as Record<string, unknown>).scores = scores;
        }

        return enriched_m;
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    await logError({ error, route: '/api/materials', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil materi' }, { status: 500 });
  }
}

// POST /api/materials
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, content, subjectId, topicId, classId, schoolId, teacherId, type, status, dueDate, externalUrl, scoreEntryMode } = body;

    if (!title) {
      return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    }

    // Validate external URL if provided
    if (externalUrl && !isValidUrl(externalUrl)) {
      return NextResponse.json({ error: 'URL tidak valid' }, { status: 400 });
    }

    // Auto-detect provider from URL
    const externalProvider = externalUrl ? detectExternalProvider(externalUrl) : null;

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
        externalUrl: externalUrl || null,
        externalProvider,
        scoreEntryMode: externalUrl ? (scoreEntryMode || 'SELF_REPORTED') : null,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    await logError({ error, route: '/api/materials', method: 'POST' });
    return NextResponse.json({ error: 'Gagal membuat materi' }, { status: 500 });
  }
}

// PATCH /api/materials
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, description, content, type, status, dueDate, externalUrl, scoreEntryMode } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    // Validate external URL if being updated
    if (externalUrl !== undefined && externalUrl && !isValidUrl(externalUrl)) {
      return NextResponse.json({ error: 'URL tidak valid' }, { status: 400 });
    }

    // Re-detect provider if URL changed
    const externalProvider = externalUrl !== undefined && externalUrl ? detectExternalProvider(externalUrl) : undefined;

    const material = await db.material.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(type && { type }),
        ...(status && { status }),
        ...(dueDate !== undefined && { dueDate }),
        ...(externalUrl !== undefined && { externalUrl: externalUrl || null }),
        ...(externalProvider !== undefined && { externalProvider: externalProvider || null }),
        ...(scoreEntryMode !== undefined && { scoreEntryMode }),
      },
    });

    return NextResponse.json(material);
  } catch (error) {
    await logError({ error, route: '/api/materials', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal mengupdate materi' }, { status: 500 });
  }
}

// DELETE /api/materials
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    // Also delete related external quiz scores
    await db.externalQuizScore.deleteMany({ where: { materialId: id } });

    await db.material.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    await logError({ error, route: '/api/materials', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal menghapus materi' }, { status: 500 });
  }
}
