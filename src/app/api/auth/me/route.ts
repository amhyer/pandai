import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { JWT_COOKIE_NAME, toPublicUser, verifySession } from '@/lib/auth';

// GET /api/auth/me — Restore session from the httpOnly `pandai_session` cookie.
// Lets the client (Zustand/RAM-only auth) survive a full page refresh.
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(JWT_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: { school: true, class: true },
    });

    // Session valid but user missing / deactivated → treat as logged out.
    if (!user || !user.isActive) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user: toPublicUser(user) });
  } catch (error: unknown) {
    console.error('GET /api/auth/me error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
