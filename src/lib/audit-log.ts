import { db } from '@/lib/db';
import { AuthUser } from './auth';

export async function logAccess(auth: AuthUser, params: {
  action: string;
  resourceType: string;
  resourceId?: string;
  targetUserId?: string;
  status?: string;
  detail?: string;
  ip?: string;
}) {
  const { status, ...rest } = params;
  await db.auditLog.create({
    data: {
      userId: auth.userId,
      role: auth.role,
      ...rest,
      logStatus: status || 'success',
    },
  });
}