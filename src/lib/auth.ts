import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import type { UserRole } from '@/store/use-store';

// ─── Constants ────────────────────────────────────────────────

const JWT_COOKIE_NAME = 'pandai_session';
const JWT_EXPIRY_HOURS = 24;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'CHANGE_ME_IN_PRODUCTION') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] JWT_SECRET is not configured');
    }
    // Dev fallback — still better than nothing
    return new TextEncoder().encode('dev_jwt_secret_do_not_use_in_prod');
  }
  return new TextEncoder().encode(secret);
}

// ─── Password Hashing (bcrypt) ───────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Detect legacy SHA-256 hashes (64 hex chars, no $ prefix)
  if (hash && !hash.startsWith('$') && /^[a-f0-9]{64}$/i.test(hash)) {
    // Legacy SHA-256 — verify with old method
    const salt = process.env.PASSWORD_SALT || 'pandai_dev_salt_2024';
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const legacyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return legacyHash === hash;
  }
  return bcrypt.compare(password, hash);
}

/** Re-hash a legacy SHA-256 password to bcrypt after successful login */
export async function rehashIfNeeded(userId: string, password: string, currentHash: string): Promise<void> {
  if (currentHash && !currentHash.startsWith('$') && /^[a-f0-9]{64}$/i.test(currentHash)) {
    const newHash = await hashPassword(password);
    await db.user.update({ where: { id: userId }, data: { password: newHash } });
  }
}

// ─── JWT Session ─────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  role: string;
  schoolId: string | null;
}

export async function createSession(user: {
  id: string;
  role: string;
  schoolId: string | null;
}): Promise<string> {
  const secret = getJwtSecret();
  const token = await new SignJWT({
    userId: user.id,
    role: user.role,
    schoolId: user.schoolId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_HOURS}h`)
    .sign(secret);

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: (payload as unknown as SessionPayload).userId,
      role: (payload as unknown as SessionPayload).role,
      schoolId: (payload as unknown as SessionPayload).schoolId ?? null,
    };
  } catch {
    return null;
  }
}

// ─── Server-side session from Request (reads httpOnly cookie) ──

export interface AuthUser {
  userId: string;
  role: string;
  schoolId: string | null;
}

/**
 * Get the current authenticated user from the request's httpOnly cookie.
 * Returns null if not authenticated or session is invalid/expired.
 * THIS is the single source of truth for API authorization.
 */
export async function getCurrentUser(request: Request): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const match = cookieHeader.match(new RegExp(`${JWT_COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  return verifySession(match[1]);
}

/**
 * Require authentication — returns AuthUser or throws 401 Response.
 * Use this in every protected API route.
 */
export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new AuthError('Unauthorized', 401);
  }
  return user;
}

/**
 * Require specific role(s) — returns AuthUser or throws 403.
 */
export async function requireRole(request: Request, roles: string | string[]): Promise<AuthUser> {
  const user = await requireAuth(request);
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) {
    throw new AuthError('Forbidden', 403);
  }
  return user;
}

// ─── Error class for clean 401/403 throwing ──────────────────

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
    this.name = 'AuthError';
  }
}

// ─── Cookie helpers for login/logout ─────────────────────────

export function createSessionCookie(token: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    name: JWT_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: JWT_EXPIRY_HOURS * 60 * 60,
  };
}

export function createLogoutCookie() {
  return {
    name: JWT_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

export { JWT_COOKIE_NAME };
