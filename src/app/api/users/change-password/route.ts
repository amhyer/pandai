import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { verifyPassword, hashPassword } from '@/lib/constants';

/**
 * POST /api/users/change-password
 * Body: { currentPassword, newPassword }
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'Password lama dan password baru wajib diisi.' },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: 'Password baru minimal 6 karakter.' },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Pengguna tidak ditemukan.' },
      { status: 404 }
    );
  }

  const valid = await verifyPassword(currentPassword, existing.password);
  if (!valid) {
    return NextResponse.json(
      { error: 'Password lama salah.' },
      { status: 401 }
    );
  }

  const hashed = await hashPassword(newPassword);
  await db.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
