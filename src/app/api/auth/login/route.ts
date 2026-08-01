import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Accept either 'username' or 'email' field from client
    const identifier = (username || '').trim();
    if (!identifier || !password) {
      return NextResponse.json({ error: 'Username/email dan password wajib diisi' }, { status: 400 });
    }

    // Find user by username OR email (case-insensitive)
    let user = await db.user.findUnique({
      where: { username: identifier },
      include: { school: true, class: true },
    });

    if (!user) {
      user = await db.user.findUnique({
        where: { email: identifier.toLowerCase() },
        include: { school: true, class: true },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Akun Anda dinonaktifkan' }, { status: 403 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      nisn: user.nisn,
      nip: user.nip,
      nik: user.nik,
      namaOrtu: user.namaOrtu,
      jk: user.jk,
      parentId: user.parentId,
      schoolId: user.schoolId,
      schoolName: user.school?.name,
      classId: user.classId,
      className: user.class?.name,
      isActive: user.isActive,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
