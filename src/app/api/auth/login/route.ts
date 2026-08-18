import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, rehashIfNeeded, createSession, createSessionCookie } from '@/lib/auth';
import { logError } from '@/lib/error-log';
import { ratelimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limit: 5 attempts per 60 seconds per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan login. Coba lagi dalam 60 detik.' }, { status: 429 });
    }

    const { username, password } = await request.json();

    const identifier = (username || '').trim();
    if (!identifier || !password) {
      return NextResponse.json({ error: 'Username/email dan password wajib diisi' }, { status: 400 });
    }

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

    // Re-hash legacy SHA-256 passwords to bcrypt after successful login
    await rehashIfNeeded(user.id, password, user.password);

    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create JWT session token
    const token = await createSession({
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });

    const response = NextResponse.json({
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
      schoolType: (user.school?.schoolType as string) || null,
      classId: user.classId,
      className: user.class?.name,
      isActive: user.isActive,
    });

    // Set httpOnly cookie with JWT
    const cookie = createSessionCookie(token);
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });

    return response;
  } catch (error: any) {
    logError({ error, route: '/api/auth/login', method: 'POST' });
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
