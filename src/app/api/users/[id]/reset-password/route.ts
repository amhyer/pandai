import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';
import { requireRole, AuthError } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/users/[id]/reset-password — ADMIN_SCHOOL resets a user's password
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { id } = await params;
    const body = await request.json();
    const newPassword = body.newPassword;

    if (!newPassword) {
      return NextResponse.json({ error: 'Password baru wajib diisi' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    // Find the target user
    const targetUser = await db.user.findUnique({
      where: { id },
      include: { school: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // IDOR check: ADMIN_SCHOOL can only reset users in their own school
    if (auth.role !== 'SUPER_ADMIN' && targetUser.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Tidak diizinkan mereset password pengguna sekolah lain' }, { status: 403 });
    }

    // Cannot reset SUPER_ADMIN password
    if (targetUser.role === 'SUPER_ADMIN' && auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Tidak diizinkan mereset password Super Admin' }, { status: 403 });
    }

    // Hash and update the password
    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: `Password untuk ${targetUser.name} berhasil direset`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Gagal mereset password' }, { status: 500 });
  }
}
