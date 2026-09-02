import { NextResponse } from 'next/server';
import { getCurrentUser, createSession } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/auth/session-token
 * Mengembalikan session token untuk user yang sedang login.
 * Digunakan oleh EXE pull-dapodik untuk autentikasi.
 */
export async function GET(request: Request) {
  try {
    const auth = await getCurrentUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: 'Belum login' },
        { status: 401 }
      );
    }

    // Get fresh user data
    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, role: true, schoolId: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Akun tidak aktif' },
        { status: 401 }
      );
    }

    // Generate fresh session token
    const token = await createSession({
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });

    return NextResponse.json({
      success: true,
      token,
      userId: user.id,
      schoolId: user.schoolId,
      expiresIn: '24 jam',
    });
  } catch (error) {
    console.error('[Session Token Error]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil session token' },
      { status: 500 }
    );
  }
}
