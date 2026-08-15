import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const grade = searchParams.get('grade');

    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (grade) where.grade = parseInt(grade);

    const classes = await db.class.findMany({
      where,
      include: {
        _count: { select: { users: true } },
        WaliKelas: { select: { id: true, name: true, nip: true } },
      },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(classes);
  } catch (error) {
    logError({ error, route: '/api/classes', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil data kelas' }, { status: 500 });
  }
}

// PUT /api/classes — Update class (e.g. assign wali kelas)
export async function PUT(request: Request) {
  try {
    const { id, waliKelasId, name, grade, academicYear } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    const data: any = {};
    if (waliKelasId !== undefined) data.waliKelasId = waliKelasId || null;
    if (name !== undefined) data.name = name;
    if (grade !== undefined) data.grade = Number(grade);
    if (academicYear !== undefined) data.academicYear = academicYear;

    const cls = await db.class.update({
      where: { id },
      data,
      include: {
        _count: { select: { users: true } },
        WaliKelas: { select: { id: true, name: true, nip: true } },
      },
    });
    return NextResponse.json(cls);
  } catch (error) {
    logError({ error, route: '/api/classes', method: 'PUT' });
    return NextResponse.json({ error: 'Gagal memperbarui kelas' }, { status: 500 });
  }
}
