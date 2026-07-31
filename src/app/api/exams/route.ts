import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET exam packages and sessions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const type = searchParams.get('type'); // 'package' or 'session'
    const status = searchParams.get('status');

    if (type === 'session') {
      const sessions = await db.examSession.findMany({
        where: { ...(schoolId ? { schoolId } : {}), ...(status ? { status } : {}) },
        include: {
          examPackage: true,
          assignments: { include: { class: true } },
        },
        orderBy: { createdAt: 'desc' },
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
    });

    return NextResponse.json(packages);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data ujian' }, { status: 500 });
  }
}

// POST create exam package or session
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { action, ...payload } = data;

    if (action === 'create-session') {
      const { examPackageId, title, schoolId, classIds, startDate, endDate, duration, shuffleQuestions, createdBy } = payload;
      const session = await db.examSession.create({
        data: {
          examPackageId, title, schoolId,
          startDate: new Date(startDate), endDate: new Date(endDate),
          duration: duration || 120, shuffleQuestions: shuffleQuestions || false,
          status: 'scheduled', createdBy,
        },
      });

      // Create assignments for each class
      if (classIds && Array.isArray(classIds)) {
        for (const classId of classIds) {
          await db.examAssignment.create({
            data: { examSessionId: session.id, schoolId: schoolId!, classId },
          });
        }
      }

      return NextResponse.json(session);
    }

    // Create package
    const { title, description, schoolId, duration, totalQuestions, createdBy } = payload;
    const pkg = await db.examPackage.create({
      data: {
        title, description,
        schoolId: schoolId || null,
        duration: duration || 120,
        totalQuestions: totalQuestions || 0,
        status: 'draft', createdBy,
      },
    });

    return NextResponse.json(pkg);
  } catch (error) {
    console.error('Create exam error:', error);
    return NextResponse.json({ error: 'Gagal membuat ujian' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    
    if (data.status) {
      await db.examSession.update({ where: { id }, data: { status: data.status } });
    }
    const updated = await db.examPackage.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal update ujian' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
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
    return NextResponse.json({ error: 'Gagal hapus ujian' }, { status: 500 });
  }
}
