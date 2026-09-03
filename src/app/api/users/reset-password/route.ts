import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, hashPassword, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

// POST /api/users/reset-password — SUPERVISOR reset a user's password
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { id, newPassword } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID pengguna diperlukan' }, { status: 400 });
    }

    const password = String(newPassword || '');
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 });
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json({ error: 'Password harus mengandung huruf dan angka' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, schoolId: true },
    });
    if (!existingUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    if (auth.role !== 'SUPER_ADMIN') {
      if (!existingUser.schoolId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
      requireSchoolScope(auth, existingUser.schoolId);
    }

    await db.user.update({
      where: { id },
      data: { password: await hashPassword(password), mustChangePassword: true },
    });

    return NextResponse.json({
      success: true,
      message: `Password pengguna "${existingUser.name}" berhasil direset.`,
      // Never return the raw password in the API response.
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Gagal reset password' }, { status: 500 });
  }
}
