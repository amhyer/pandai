import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const { email, password, name, role, schoolCode } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, dan nama wajib diisi' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }

    // If role requires a school, find it
    let schoolId: string | undefined;
    if (role !== 'SUPER_ADMIN' && schoolCode) {
      const school = await db.school.findUnique({ where: { code: schoolCode } });
      if (!school) {
        return NextResponse.json({ error: 'Kode sekolah tidak ditemukan' }, { status: 404 });
      }
      schoolId = school.id;
    }

    const hashedPassword = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: role || 'SISWA',
        schoolId,
      },
      include: { school: true },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      schoolName: user.school?.name,
      isActive: user.isActive,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
