import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, hashPassword, verifyPassword, AuthError } from '@/lib/auth';

// POST /api/auth/change-password — Change own password (authenticated)
// The userId is always derived from the session, never from the request body.
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Password lama dan baru wajib diisi' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 });
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return NextResponse.json({ error: 'Password harus mengandung huruf dan angka' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, password: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const isValid = await verifyPassword(oldPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Password lama salah' }, { status: 401 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(newPassword), mustChangePassword: false },
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
