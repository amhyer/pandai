import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
      include: { _count: { select: { users: true } } },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(classes);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data kelas' }, { status: 500 });
  }
}
