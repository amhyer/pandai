import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const role = searchParams.get('role');
    const classId = searchParams.get('classId');

    const where: any = { isActive: true };
    if (schoolId) where.schoolId = schoolId;
    if (role) where.role = role;
    if (classId) where.classId = classId;

    const users = await db.user.findMany({
      where,
      include: { school: true, class: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { email, password, name, role, schoolId, classId, phone } = data;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, nama wajib' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });

    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        password: await hashPassword(password),
        name, role: role || 'SISWA',
        schoolId, classId, phone,
      },
      include: { school: true, class: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Gagal membuat pengguna' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    if (data.password) data.password = await hashPassword(data.password);
    const user = await db.user.update({ where: { id }, data });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal update pengguna' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    await db.user.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal hapus pengguna' }, { status: 500 });
  }
}
