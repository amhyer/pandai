import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logError } from '@/lib/error-log';

/**
 * Roles allowed for self-service registration (no login required).
 * GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN must be created via
 * the protected POST /api/users endpoint (requires SUPER_ADMIN or ADMIN_SCHOOL).
 */
const ALLOWED_SELF_REGISTER_ROLES = ['SISWA', 'ORANG_TUA'];

export async function POST(request: Request) {
  try {
    const { email, password, name, role, schoolCode } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, dan nama wajib diisi' }, { status: 400 });
    }

    // P2: Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 });
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json({ error: 'Password harus mengandung huruf dan angka' }, { status: 400 });
    }

    // ── Role whitelist enforcement ──
    const requestedRole = (role || 'SISWA').toUpperCase();
    if (!ALLOWED_SELF_REGISTER_ROLES.includes(requestedRole)) {
      return NextResponse.json(
        { error: 'Role tidak diizinkan untuk pendaftaran mandiri' },
        { status: 403 }
      );
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }

    // ── schoolCode: roles that participate in a school must provide it ──
    if ((requestedRole === 'SISWA' || requestedRole === 'ORANG_TUA') && !schoolCode?.trim()) {
      return NextResponse.json({ error: 'Kode sekolah wajib diisi' }, { status: 400 });
    }

    let schoolId: string | undefined;
    if (schoolCode) {
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
        role: requestedRole,
        schoolId,
        isActive: true,
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
  } catch (error: unknown) {
    logError({ error, route: '/api/auth/register', method: 'POST' });
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
