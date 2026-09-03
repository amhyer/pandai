import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/constants';
import { requireAuth, AuthError } from '@/lib/auth';

// POST /api/auth/change-password — Change own password (authenticated)
// Requires { oldPassword, newPassword }
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
    }

    // Find user from session
    const user = await db.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Verify old password
    const isValid = await verifyPassword(oldPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Password lama salah' }, { status: 401 });
    }

    // Update password
    await db.user.update({
      where: { id: auth.userId },
      data: { password: await hashPassword(newPassword) },
    });

    return NextResponse.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Gagal mengubah password' }, { status: 500 });
  }
}
