import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/users/[id]/reset-password — ADMIN_SCHOOL resets a user's password
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const authed = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { id } = await params;

    const body = await request.json();
    const newPassword = String(body.newPassword ?? '');

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password minimal 8 karakter dan harus mengandung huruf & angka' },
        { status: 400 }
      );
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password harus mengandung huruf dan angka' },
        { status: 400 }
      );
    }

    // Find the target user
    const targetUser = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, schoolId: true, role: true, isActive: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Tenancy enforcement: normal admin can only reset users in their own school.
    if (authed.role !== 'SUPER_ADMIN') {
      if (!targetUser.schoolId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
      requireSchoolScope(authed, targetUser.schoolId);
    }

    // Hash and update the password
    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id: targetUser.id },
      data: { password: hashedPassword, mustChangePassword: true },
    });

    return NextResponse.json({
      success: true,
      message: `Password untuk ${targetUser.name} berhasil direset. Pengguna wajib mengganti password saat login berikutnya.`,
      // Never return the raw password in the API response.
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Gagal mereset password' }, { status: 500 });
  }
}
