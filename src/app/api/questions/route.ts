import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH', 'SISWA']);
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const subjectId = searchParams.get('subjectId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const global = searchParams.get('global') === 'true';

    const createdBy = searchParams.get('createdBy');
    const search = searchParams.get('search');
    const difficulty = searchParams.get('difficulty');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (global) {
      where.schoolId = null;
    } else {
      // Enforce school scope
      const effectiveSchoolId = getSchoolFilter(auth);
      if (effectiveSchoolId) {
        where.OR = [{ schoolId: effectiveSchoolId }, { schoolId: null }];
      } else if (schoolId) {
        where.OR = [{ schoolId }, { schoolId: null }];
      }
    }
    if (subjectId) where.subjectId = subjectId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (createdBy) where.createdBy = createdBy;
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where.content = { contains: search };
    }

    const questions = await db.question.findMany({
      where,
      include: { subject: true, topic: true, creator: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    // Security: strip answer key from SISWA responses
    if (auth.role === 'SISWA') {
      const sanitized = questions.map(({ answer, explanation, ...rest }) => rest);
      return NextResponse.json(sanitized);
    }

    return NextResponse.json(questions);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/questions', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil soal' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const data = await request.json();
    const { subjectId, topicId, schoolId, type, content, options, answer, explanation, cognitiveLevel, difficulty, createdBy } = data;

    // Enforce school scope for school-specific questions
    const effectiveSchoolId = schoolId || null;
    if (effectiveSchoolId && auth.role !== 'SUPER_ADMIN') {
      requireSchoolScope(auth, effectiveSchoolId);
    }

    const question = await db.question.create({
      data: {
        subjectId, topicId: topicId || null,
        schoolId: effectiveSchoolId,
        type: type || 'pg', content,
        options: options ? JSON.stringify(options) : null,
        answer: answer || null,
        explanation: explanation || null,
        cognitiveLevel: cognitiveLevel || 'C3',
        difficulty: difficulty || 'sedang',
        createdBy: createdBy || auth.userId,
        status: 'published',
      },
    });

    return NextResponse.json(question);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/questions', method: 'POST' });
    return NextResponse.json({ error: 'Gagal membuat soal' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    // Verify school scope
    if (auth.role !== 'SUPER_ADMIN') {
      const existing = await db.question.findUnique({ where: { id }, select: { schoolId: true } });
      if (existing?.schoolId) requireSchoolScope(auth, existing.schoolId);
    }

    if (data.options) data.options = JSON.stringify(data.options);
    const question = await db.question.update({ where: { id }, data });
    return NextResponse.json(question);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/questions', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal update soal' }, { status: 500 });
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
      const existing = await db.question.findUnique({ where: { id }, select: { schoolId: true } });
      if (existing?.schoolId) requireSchoolScope(auth, existing.schoolId);
    }

    await db.question.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/questions', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal hapus soal' }, { status: 500 });
  }
}
