import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';
import { logError } from '@/lib/error-log';

// POST /api/auth/reset-password — Reset password with token
export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token dan password baru wajib diisi' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    // Find user with valid reset token
    const user = await db.user.findFirst({
      where: {
        sessionToken: token,
        sessionExpiresAt: { gt: new Date() },
        isActive: true,
      },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Token tidak valid atau sudah kedaluwarsa' }, { status: 400 });
    }

    // Update password and clear reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(newPassword),
        sessionToken: null,
        sessionExpiresAt: null,
      },
    });

    return NextResponse.json({ message: 'Password berhasil direset. Silakan login dengan password baru.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Gagal mereset password' }, { status: 500 });
  }
}
