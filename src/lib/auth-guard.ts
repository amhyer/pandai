import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// ═══════════════════════════════════════════════════════════════
// Auth Session Interface
// ═══════════════════════════════════════════════════════════════

export interface AuthSession {
  id: string;
  username: string | null;
  email: string | null;
  name: string;
  role: string;
  schoolId: string | null;
  classId: string | null;
  isActive: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Generate session token (UUID)
// ═══════════════════════════════════════════════════════════════

export function generateSessionToken(): string {
  return randomUUID();
}

// ═══════════════════════════════════════════════════════════════
// requireAuth — main auth guard for API routes
// ═══════════════════════════════════════════════════════════════

interface RequireAuthOptions {
  roles?: string[]; // If provided, only these roles are allowed
  checkSchoolId?: boolean; // If true, request must include schoolId matching session
}

export async function requireAuth(
  request: NextRequest,
  options: RequireAuthOptions = {}
): Promise<{ session: AuthSession; error: null } | { session: null; error: NextResponse }> {
  // Extract token from Authorization header
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Autentikasi diperlukan' }, { status: 401 }),
    };
  }

  // Look up user by session token
  const user = await db.user.findUnique({
    where: { sessionToken: token },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      schoolId: true,
      classId: true,
      isActive: true,
    },
  });

  if (!user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Token tidak valid' }, { status: 401 }),
    };
  }

  if (!user.isActive) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Akun dinonaktifkan' }, { status: 403 }),
    };
  }

  // Role check
  if (options.roles && options.roles.length > 0) {
    if (!options.roles.includes(user.role)) {
      return {
        session: null,
        error: NextResponse.json({ error: 'Akses ditolak untuk role ini' }, { status: 403 }),
      };
    }
  }

  // School isolation check
  if (options.checkSchoolId) {
    const { searchParams } = new URL(request.url);
    const requestSchoolId = searchParams.get('schoolId');
    
    // Also check POST body for schoolId (use clone to avoid consuming original stream)
    let bodySchoolId: string | null = null;
    try {
      const ct = request.headers.get('content-type');
      if (ct?.includes('application/json')) {
        const body = await request.clone().json();
        bodySchoolId = body.schoolId || null;
      }
    } catch {
      // Body not readable or not JSON
    }

    const requiredSchoolId = requestSchoolId || bodySchoolId;
    
    if (requiredSchoolId && user.role !== 'SUPER_ADMIN' && user.schoolId !== requiredSchoolId) {
      return {
        session: null,
        error: NextResponse.json({ error: 'Akses ditolak: data sekolah lain' }, { status: 403 }),
      };
    }
  }

  return {
    session: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      classId: user.classId,
      isActive: user.isActive,
    },
    error: null,
  };
}

// ═══════════════════════════════════════════════════════════════
// getAuthSession — simpler version, just extracts session without role check
// ═══════════════════════════════════════════════════════════════

export async function getAuthSession(request: NextRequest): Promise<AuthSession | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return null;

  const user = await db.user.findUnique({
    where: { sessionToken: token },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      schoolId: true,
      classId: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    schoolId: user.schoolId,
    classId: user.classId,
    isActive: user.isActive,
  };
}

// ═══════════════════════════════════════════════════════════════
// enforceSchoolIsolation — check that session.schoolId matches provided schoolId
// ═══════════════════════════════════════════════════════════════

export function enforceSchoolIsolation(
  session: AuthSession,
  schoolId: string
): NextResponse | null {
  if (session.role === 'SUPER_ADMIN') return null; // Super admin sees all
  if (session.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Akses ditolak: data sekolah lain' }, { status: 403 });
  }
  return null;
}
