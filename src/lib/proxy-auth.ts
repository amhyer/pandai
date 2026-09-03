import { jwtVerify } from 'jose';

/**
 * Edge-safe JWT verification for src/proxy.ts.
 *
 * This intentionally does NOT import @/lib/auth or @/lib/db: the proxy runs
 * in the Edge runtime and cannot load Prisma/Node-only modules. It only needs
 * the same JWT secret + cookie parsing used by the Node runtime.
 */

const JWT_COOKIE_NAME = 'pandai_session';

export interface ProxySession {
  userId: string;
  role: string;
  schoolId: string | null;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  const placeholder =
    secret === 'CHANGE_ME_IN_PRODUCTION' ||
    secret.startsWith('replace_with_') ||
    secret.startsWith('dev_jwt_secret');
  if (!secret || placeholder) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] JWT_SECRET is not configured');
    }
    return new TextEncoder().encode('dev_jwt_secret_do_not_use_in_prod');
  }
  if (secret.length < 32) {
    throw new Error('[SECURITY] JWT_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${JWT_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export async function verifyProxySession(token: string): Promise<ProxySession | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: (payload as unknown as ProxySession).userId,
      role: (payload as unknown as ProxySession).role,
      schoolId: (payload as unknown as ProxySession).schoolId ?? null,
    };
  } catch {
    return null;
  }
}
