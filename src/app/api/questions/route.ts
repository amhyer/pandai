import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope, getSchoolFilter } from '@/lib/scope';

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, [
      'SUPER_ADMIN',
      'ADMIN_SCHOOL',
      'GURU',
      'KEPALA_SEKOLAH',
      'SISWA',
    ]);
    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');
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

    const where: Record<string, unknown> = {};

    // School isolation: private questions of other schools never leak
    const schoolF = getSchoolFilter(auth);
    if (global) {
      // Global bank only (schoolId null)
      where.schoolId = null;
    } else if (schoolF) {
      // Own school private + global NALAR
      where.OR = [{ schoolId: schoolF }, { schoolId: null }];
    } else if (schoolIdParam) {
      // SUPER_ADMIN optional filter
      where.OR = [{ schoolId: schoolIdParam }, { schoolId: null }];
    }

    if (subjectId) where.subjectId = subjectId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (createdBy) where.createdBy = createdBy;
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where.content = { contains: search };
    }

    // SISWA: only published, no answer key
    if (auth.role === 'SISWA') {
      where.status = 'published';
    }

    const questions = await db.question.findMany({
      where,
      include: {
        subject: true,
        topic: true,
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

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
    const {
      subjectId,
      topicId,
      schoolId,
      type,
      content,
      options,
      answer,
      explanation,
      cognitiveLevel,
      difficulty,
      createdBy,
    } = data;

    // Force school for non-super; allow null only for SUPER_ADMIN global bank
    let effectiveSchoolId: string | null;
    if (auth.role === 'SUPER_ADMIN') {
      effectiveSchoolId = schoolId !== undefined ? schoolId : auth.schoolId || null;
    } else {
      effectiveSchoolId = auth.schoolId;
      if (!effectiveSchoolId) {
        return NextResponse.json({ error: 'schoolId wajib' }, { status: 400 });
      }
      if (schoolId) requireSchoolScope(auth, schoolId);
    }

    const question = await db.question.create({
      data: {
        subjectId,
        topicId: topicId || null,
        schoolId: effectiveSchoolId,
        type: type || 'pg',
        content,
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

    const existing = await db.question.findUnique({
      where: { id },
      select: { schoolId: true },
    });
    if (!existing) return NextResponse.json({ error: 'Soal tidak ditemukan' }, { status: 404 });

    // Global (null) questions: SUPER_ADMIN only to edit
    if (existing.schoolId == null && auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Soal global hanya bisa diubah Super Admin' }, { status: 403 });
    }
    if (existing.schoolId) requireSchoolScope(auth, existing.schoolId);

    if (data.options) data.options = JSON.stringify(data.options);
    // Never allow moving schoolId cross-tenant via body
    delete data.schoolId;

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

    const existing = await db.question.findUnique({
      where: { id },
      select: { schoolId: true },
    });
    if (!existing) return NextResponse.json({ error: 'Soal tidak ditemukan' }, { status: 404 });

    if (existing.schoolId == null && auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Soal global hanya bisa dihapus Super Admin' }, { status: 403 });
    }
    if (existing.schoolId) requireSchoolScope(auth, existing.schoolId);

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
