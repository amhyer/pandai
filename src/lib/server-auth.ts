import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifySession, toPublicUser, type PublicUser } from '@/lib/auth';
import type { UserRole } from '@/store/use-store';

/**
 * Server-only session helper for App Router page/layout components.
 *
 * Use this instead of calling `/api/auth/me` from a Server Component so a
 * migrated route can pre-load the signed-in user without an extra client
 * round-trip. It mirrors requireAuth()'s active-user check, but is safe to
 * call from a server page/layout (no `Request` object needed).
 */
export async function getServerSessionUser(
  allowedRoles?: UserRole[]
): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('pandai_session')?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  if (allowedRoles && !allowedRoles.includes(session.role as UserRole)) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { school: { select: { name: true, schoolType: true } }, class: { select: { name: true } } },
  });
  if (!user || !user.isActive) return null;

  return toPublicUser(user);
}
