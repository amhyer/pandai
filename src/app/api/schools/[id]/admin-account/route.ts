import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/schools/[id]/admin-account — Find the ADMIN_SCHOOL user for this school
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

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
    console.error('Get admin account error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data akun admin' }, { status: 500 });
  }
}

// POST /api/schools/[id]/admin-account — Create or update the admin account
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, password } = body;

    const school = await db.school.findUnique({ where: { id } });
    if (!school) {
      return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 });
    }

    if (!name || !email) {
      return NextResponse.json({ error: 'Nama dan email wajib diisi' }, { status: 400 });
    }

    // Check if ADMIN_SCHOOL user already exists for this school
    const existingAdmin = await db.user.findFirst({
      where: { schoolId: id, role: 'ADMIN_SCHOOL' },
    });

    if (existingAdmin) {
      // Update existing admin account
      const updateData: Record<string, string> = { name, email: email.toLowerCase() };
      if (password) {
        updateData.password = await hashPassword(password);
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
        admin: updated,
        message: 'Akun admin berhasil diperbarui',
      });
    }

    // Create new admin account
    const schoolCode = school.code.toLowerCase();
    const adminUsername = `admin.${schoolCode}@pandai.id`;
    const defaultPassword = password || 'password123';

    const newAdmin = await db.user.create({
      data: {
        username: adminUsername,
        email: email.toLowerCase(),
        password: await hashPassword(defaultPassword),
        name,
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
      admin: newAdmin,
      message: password
        ? 'Akun admin berhasil dibuat dengan password yang ditentukan'
        : `Akun admin berhasil dibuat. Password default: password123`,
    });
  } catch (error: any) {
    console.error('Create/update admin account error:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat/memperbarui akun admin' }, { status: 500 });
  }
}

// PATCH /api/schools/[id]/admin-account — Reset admin password
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const newPassword = body.password || body.newPassword;

    if (!newPassword) {
      return NextResponse.json({ error: 'Password baru wajib diisi' }, { status: 400 });
    }

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

    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: 'Password admin berhasil direset',
      newPassword,
    });
  } catch (error) {
    console.error('Reset admin password error:', error);
    return NextResponse.json({ error: 'Gagal mereset password admin' }, { status: 500 });
  }
}
