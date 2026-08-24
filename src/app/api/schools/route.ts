import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter } from '@/lib/scope';

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const schoolF = getSchoolFilter(auth);
    const where: Record<string, unknown> = { status: { not: 'deleted' } };
    if (schoolF) where.id = schoolF;
    const schools = await db.school.findMany({
      where,
      include: {
        _count: { select: { users: true, classes: true, questions: true } },
        subscriptions: { where: { status: 'active' }, orderBy: { startDate: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(schools);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Get schools error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data sekolah' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN']);
    const data = await request.json();
    const { name, code, address, phone, plan, maxStudents, expiresAt } = data;
    if (!name || !code) return NextResponse.json({ error: 'Nama dan kode wajib' }, { status: 400 });

    const existing = await db.school.findUnique({ where: { code } });
    if (existing) return NextResponse.json({ error: 'Kode sudah digunakan' }, { status: 409 });

    const school = await db.school.create({
      data: {
        name, code: code.toUpperCase(), address, phone,
        plan: plan || 'free', maxStudents: maxStudents || 50,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    await db.subscription.create({
      data: {
        schoolId: school.id, plan: school.plan,
        startDate: new Date(),
        endDate: expiresAt ? new Date(expiresAt) : null, amount: 0,
      },
    });

    return NextResponse.json(school);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Create school error:', error);
    return NextResponse.json({ error: 'Gagal membuat sekolah' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole(request, ['SUPER_ADMIN']);
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    const school = await db.school.update({
      where: { id },
      data: { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined },
    });
    return NextResponse.json(school);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal update sekolah' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole(request, ['SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    await db.school.update({ where: { id }, data: { status: 'deleted' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal hapus sekolah' }, { status: 500 });
  }
}
