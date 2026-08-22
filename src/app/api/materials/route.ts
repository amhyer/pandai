import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { detectExternalProvider, isValidUrl } from '@/lib/external-quiz';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope, getSchoolFilter } from '@/lib/scope';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, [
      'SUPER_ADMIN',
      'ADMIN_SCHOOL',
      'GURU',
      'KEPALA_SEKOLAH',
      'SISWA',
    ]);
    const { searchParams } = new URL(req.url);
    const schoolIdParam = searchParams.get('schoolId');
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const isExternal = searchParams.get('isExternal');

    const where: Record<string, unknown> = {};

    const schoolF = getSchoolFilter(auth);
    if (schoolF) {
      where.schoolId = schoolF;
    } else if (schoolIdParam) {
      where.schoolId = schoolIdParam;
    }

    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (isExternal === 'true') {
      where.externalUrl = { not: null };
    }

    if (auth.role === 'SISWA') {
      where.status = 'published';
      const me = await db.user.findUnique({
        where: { id: auth.userId },
        select: { classId: true },
      });
      if (me?.classId) {
        where.OR = [{ classId: me.classId }, { classId: null }];
      }
    }

    const materials = await db.material.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    const enriched = await Promise.all(
      materials.map(async (m) => {
        const [teacher, subject, cls] = await Promise.all([
          m.teacherId
            ? db.user.findUnique({ where: { id: m.teacherId }, select: { name: true } })
            : null,
          m.subjectId
            ? db.subject.findUnique({ where: { id: m.subjectId }, select: { name: true } })
            : null,
          m.classId
            ? db.class.findUnique({ where: { id: m.classId }, select: { name: true } })
            : null,
        ]);

        const enriched_m: Record<string, unknown> = { ...m, teacher, subject, class: cls };

        if (m.externalUrl && auth.role !== 'SISWA') {
          const scores = await db.externalQuizScore.findMany({
            where: { materialId: m.id },
            orderBy: { createdAt: 'desc' },
            take: 100,
          });
          enriched_m.scores = scores;
        }

        return enriched_m;
      }),
    );

    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/materials', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil materi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);
    const body = await req.json();
    const {
      title,
      description,
      content,
      subjectId,
      topicId,
      classId,
      schoolId,
      teacherId,
      type,
      status,
      dueDate,
      externalUrl,
      scoreEntryMode,
      learningObjective,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    }

    if (externalUrl && !isValidUrl(externalUrl)) {
      return NextResponse.json({ error: 'URL tidak valid' }, { status: 400 });
    }

    const effectiveSchoolId =
      auth.role === 'SUPER_ADMIN' ? schoolId || auth.schoolId : auth.schoolId;
    if (!effectiveSchoolId) {
      return NextResponse.json({ error: 'schoolId wajib' }, { status: 400 });
    }
    if (schoolId) requireSchoolScope(auth, schoolId);

    const externalProvider = externalUrl ? detectExternalProvider(externalUrl) : null;

    const material = await db.material.create({
      data: {
        title,
        description: description || null,
        content: content || null,
        subjectId: subjectId || null,
        topicId: topicId || null,
        classId: classId || null,
        schoolId: effectiveSchoolId,
        teacherId: teacherId || auth.userId || null,
        type: type || 'materi',
        status: status || 'published',
        dueDate: dueDate || null,
        externalUrl: externalUrl || null,
        externalProvider,
        scoreEntryMode: externalUrl ? scoreEntryMode || 'SELF_REPORTED' : null,
        learningObjective: learningObjective || null,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/materials', method: 'POST' });
    return NextResponse.json({ error: 'Gagal membuat materi' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);
    const body = await req.json();
    const {
      id,
      title,
      description,
      content,
      type,
      status,
      dueDate,
      externalUrl,
      scoreEntryMode,
      learningObjective,
    } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const existing = await db.material.findUnique({
      where: { id },
      select: { schoolId: true },
    });
    if (!existing) return NextResponse.json({ error: 'Materi tidak ditemukan' }, { status: 404 });
    if (existing.schoolId) requireSchoolScope(auth, existing.schoolId);

    if (externalUrl !== undefined && externalUrl && !isValidUrl(externalUrl)) {
      return NextResponse.json({ error: 'URL tidak valid' }, { status: 400 });
    }

    const externalProvider =
      externalUrl !== undefined && externalUrl ? detectExternalProvider(externalUrl) : undefined;

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
        ...(learningObjective !== undefined && {
          learningObjective: learningObjective || null,
        }),
      },
    });

    return NextResponse.json(material);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/materials', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal mengupdate materi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const existing = await db.material.findUnique({
      where: { id },
      select: { schoolId: true },
    });
    if (!existing) return NextResponse.json({ error: 'Materi tidak ditemukan' }, { status: 404 });
    if (existing.schoolId) requireSchoolScope(auth, existing.schoolId);

    await db.externalQuizScore.deleteMany({ where: { materialId: id } });
    await db.material.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/materials', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal menghapus materi' }, { status: 500 });
  }
}
