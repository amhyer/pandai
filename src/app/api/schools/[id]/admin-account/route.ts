import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, requireRole, AuthError, sanitizeUser } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password minimal 8 karakter';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password harus mengandung huruf dan angka';
  }
  return null;
}

// GET /api/schools/[id]/admin-account — Find the ADMIN_SCHOOL user for this school
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const authed = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { id } = await params;

    if (authed.role !== 'SUPER_ADMIN') {
      requireSchoolScope(authed, id);
    }

    const school = await db.school.findUnique({ where: { id } });
    if (!school) {
      return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 });
    }

    const admin = await db.user.findFirst({
      where: {
        schoolId: id,
        role: 'ADMIN_SCHOOL',
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ exists: false, message: 'Akun admin sekolah belum dibuat' });
    }

    return NextResponse.json({ exists: true, admin });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Get admin account error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data akun admin' }, { status: 500 });
  }
}

// POST /api/schools/[id]/admin-account — Create or update the admin account
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const authed = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { id } = await params;

    if (authed.role !== 'SUPER_ADMIN') {
      requireSchoolScope(authed, id);
    }

    const body = await request.json();
    const { name, email, password } = body;

    const school = await db.school.findUnique({ where: { id } });
    if (!school) {
      return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 });
    }

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return NextResponse.json({ error: 'Email tidak valid' }, { status: 400 });
    }

    if (password) {
      const pwdError = validatePassword(String(password));
      if (pwdError) return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    // Check if ADMIN_SCHOOL user already exists for this school
    const existingAdmin = await db.user.findFirst({
      where: { schoolId: id, role: 'ADMIN_SCHOOL' },
    });

    if (existingAdmin) {
      // Update existing admin account
      const updateData: Record<string, string> = {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
      };
      if (password) {
        updateData.password = await hashPassword(String(password));
      }

      const updated = await db.user.update({
        where: { id: existingAdmin.id },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });

      return NextResponse.json({
        admin: sanitizeUser(updated as unknown as Record<string, unknown>),
        message: 'Akun admin berhasil diperbarui',
      });
    }

    // Create new admin account
    if (!password) {
      return NextResponse.json(
        { error: 'Password wajib diisi saat membuat akun admin' },
        { status: 400 }
      );
    }

    const schoolCode = school.code.toLowerCase();
    const adminUsername = `admin.${schoolCode}@pandai.id`;

    const newAdmin = await db.user.create({
      data: {
        username: adminUsername,
        email: String(email).trim().toLowerCase(),
        password: await hashPassword(String(password)),
        name: String(name).trim(),
        role: 'ADMIN_SCHOOL',
        schoolId: id,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      admin: sanitizeUser(newAdmin as unknown as Record<string, unknown>),
      message: 'Akun admin berhasil dibuat',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Create/update admin account error:', error);
    return NextResponse.json({ error: 'Gagal membuat/memperbarui akun admin' }, { status: 500 });
  }
}

// PATCH /api/schools/[id]/admin-account — Reset admin password
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const authed = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { id } = await params;

    if (authed.role !== 'SUPER_ADMIN') {
      requireSchoolScope(authed, id);
    }

    const body = await request.json();
    const newPassword = body.password || body.newPassword;

    if (!newPassword) {
      return NextResponse.json({ error: 'Password baru wajib diisi' }, { status: 400 });
    }
    const pwdError = validatePassword(String(newPassword));
    if (pwdError) return NextResponse.json({ error: pwdError }, { status: 400 });

    const school = await db.school.findUnique({ where: { id } });
    if (!school) {
      return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 });
    }

    const admin = await db.user.findFirst({
      where: { schoolId: id, role: 'ADMIN_SCHOOL' },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Akun admin sekolah tidak ditemukan' }, { status: 404 });
    }

    const hashedPassword = await hashPassword(String(newPassword));
    await db.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword, mustChangePassword: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Password admin berhasil direset. Pengguna wajib mengganti password saat login berikutnya.',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Reset admin password error:', error);
    return NextResponse.json({ error: 'Gagal mereset password admin' }, { status: 500 });
  }
}
