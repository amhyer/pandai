import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/constants';

// POST /api/auth/change-password — Change own password (authenticated)
// Requires { userId, oldPassword, newPassword }
export async function POST(request: Request) {
  try {
    const { userId, oldPassword, newPassword } = await request.json();

    if (!userId || !oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (newPassword.length < 3) {
      return NextResponse.json({ error: 'Password baru minimal 3 karakter' }, { status: 400 });
    }

    // Find user
    const user = await db.user.findUnique({ where: { id: userId } });
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
      where: { id: userId },
      data: { password: await hashPassword(newPassword) },
    });

    return NextResponse.json({ message: 'Password berhasil diubah' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Gagal mengubah password' }, { status: 500 });
  }
}
