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
  const placeholder = secret === 'CHANGE_ME_IN_PRODUCTION' || secret.startsWith('replace_with_') || secret.startsWith('dev_jwt_secret');
  if (!secret || placeholder) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] JWT_SECRET is not configured');
    }
    // Dev fallback — still better than nothing
    return new TextEncoder().encode('dev_jwt_secret_do_not_use_in_prod');
  }
  if (secret.length < 32) {
    throw new Error('[SECURITY] JWT_SECRET must be at least 32 characters');
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
 * Also verifies the user is still active in the database.
 */
export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new AuthError('Unauthorized', 401);
  }

  // P0-04: Re-verify user is still active (prevents deactivated users from
  // continuing with a valid JWT issued before deactivation)
  const dbUser = await db.user.findUnique({
    where: { id: user.userId },
    select: { isActive: true, role: true },
  });
  if (!dbUser || !dbUser.isActive) {
    throw new AuthError('Akun tidak aktif', 401);
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

// ─── Public user mapper (login + GET /api/auth/me) ───────────

export interface PublicUser {
  id: string;
  username: string | null;
  email: string | null;
  name: string;
  role: string;
  avatar: string | null;
  phone: string | null;
  nisn: string | null;
  nip: string | null;
  namaOrtu: string | null;
  jk: string | null;
  parentId: string | null;
  schoolId: string | null;
  schoolName: string | null;
  schoolType: string | null;
  classId: string | null;
  className: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
}

/**
 * Map a Prisma user (with school & class included) to the safe public shape.
 * NIK is intentionally excluded — KTP number must never reach client-side JS.
 */
export function toPublicUser(user: {
  id: string;
  username: string | null;
  email: string | null;
  name: string;
  role: string;
  avatar: string | null;
  phone: string | null;
  nisn: string | null;
  nip: string | null;
  namaOrtu: string | null;
  jk: string | null;
  parentId: string | null;
  schoolId: string | null;
  classId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  school?: { name: string; schoolType: string | null } | null;
  class?: { name: string } | null;
}): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
    nisn: user.nisn,
    nip: user.nip,
    namaOrtu: user.namaOrtu,
    jk: user.jk,
    parentId: user.parentId,
    schoolId: user.schoolId,
    schoolName: user.school?.name ?? null,
    schoolType: user.school?.schoolType ?? null,
    classId: user.classId,
    className: user.class?.name ?? null,
    isActive: user.isActive,
    mustChangePassword: !!user.mustChangePassword,
  };
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

// ─── Sensitive user sanitizer for admin/user routes ────────────

/** Remove secrets that must never be sent to the browser even for authorized admin views. */
export function sanitizeUser(user: any): any {
  if (!user) return user;
  const { password, sessionToken, ...safe } = user;
  return safe;
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
