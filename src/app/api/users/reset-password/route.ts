import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';
import { requireAuth } from '@/lib/auth-guard';

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(request, { roles: ['SUPER_ADMIN'] });
  if (error) return error;

  try {
    const { id, newPassword } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID pengguna diperlukan' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const password = newPassword || '123';
    const hashedPassword = await hashPassword(password);

    await db.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: `Password pengguna "${existingUser.name}" berhasil direset`,
      newPassword: password,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal reset password' },
      { status: 500 }
    );
  }
}
