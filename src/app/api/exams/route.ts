import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';

// GET exam packages and sessions
export async function GET(request: Request) {
  try {
    await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']);
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    if (type === 'session') {
      const sessions = await db.examSession.findMany({
        where: { ...(schoolId ? { schoolId } : {}), ...(status ? { status } : {}) },
        include: {
          examPackage: true,
          assignments: { include: { class: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return NextResponse.json(sessions);
    }

    const packages = await db.examPackage.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        ...(status ? { status } : {}),
        OR: schoolId ? [{ schoolId }, { schoolId: null }] : undefined,
      },
      include: {
        _count: { select: { examItems: true, examSessions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(packages);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/exams', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil data ujian' }, { status: 500 });
  }
}

// POST create exam package or session
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const data = await request.json();
    const { action, ...payload } = data;

    if (action === 'create-session') {
      const { examPackageId, title, schoolId, classIds, startDate, endDate, duration, shuffleQuestions, createdBy } = payload;
      const session = await db.examSession.create({
        data: {
          examPackageId, title, schoolId,
          startDate: new Date(startDate), endDate: new Date(endDate),
          duration: duration || 120, shuffleQuestions: shuffleQuestions || false,
          status: 'scheduled', createdBy: createdBy || auth.userId,
        },
      });

      if (classIds && Array.isArray(classIds)) {
        for (const classId of classIds) {
          await db.examAssignment.create({
            data: { examSessionId: session.id, schoolId: schoolId!, classId },
          });
        }
      }

      return NextResponse.json(session);
    }

    const { title, description, schoolId, duration, totalQuestions, createdBy } = payload;
    const pkg = await db.examPackage.create({
      data: {
        title, description,
        schoolId: schoolId || null,
        duration: duration || 120,
        totalQuestions: totalQuestions || 0,
        status: 'draft', createdBy: createdBy || auth.userId,
      },
    });

    return NextResponse.json(pkg);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/exams', method: 'POST' });
    console.error('Create exam error:', error);
    return NextResponse.json({ error: 'Gagal membuat ujian' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    
    if (data.status) {
      await db.examSession.update({ where: { id }, data: { status: data.status } });
    }
    const updated = await db.examPackage.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/exams', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal update ujian' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    
    if (type === 'session') {
      await db.examSession.delete({ where: { id } });
    } else {
      await db.examPackage.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/exams', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal hapus ujian' }, { status: 500 });
  }
}
