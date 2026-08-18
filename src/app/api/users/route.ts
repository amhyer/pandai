import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';

// Helper: extract first name from full name
function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0].toLowerCase();
}

// Helper: generate unique username for orang tua (avoid collision)
async function generateUniqueOrtuUsername(baseName: string, schoolId: string): Promise<string> {
  let username = baseName;
  let counter = 1;
  while (true) {
    const existing = await db.user.findUnique({ where: { username } });
    if (!existing) return username;
    username = `${baseName}${counter++}`;
  }
}

// Helper: auto-create ORANG_TUA account when a SISWA is created
async function autoCreateOrtuForSiswa(siswaData: {
  namaOrtu: string;
  schoolId: string;
  siswaId: string;
  siswaName: string;
}): Promise<{ ortuId: string; ortuUsername: string; isNew: boolean } | null> {
  if (!siswaData.namaOrtu || !siswaData.namaOrtu.trim()) return null;

  const baseName = getFirstName(siswaData.namaOrtu);

  // Check if an ORANG_TUA with same name already exists in the same school
  const existingOrtu = await db.user.findFirst({
    where: {
      role: 'ORANG_TUA',
      schoolId: siswaData.schoolId,
      name: siswaData.namaOrtu.trim(),
      isActive: true,
    },
    include: { children: true },
  });

  if (existingOrtu) {
    return {
      ortuId: existingOrtu.id,
      ortuUsername: existingOrtu.username || '',
      isNew: false,
    };
  }

  // Create new ORANG_TUA account
  const ortuUsername = await generateUniqueOrtuUsername(baseName, siswaData.schoolId);
  const ortu = await db.user.create({
    data: {
      username: ortuUsername,
      password: await hashPassword('123'),
      name: siswaData.namaOrtu.trim(),
      role: 'ORANG_TUA',
      schoolId: siswaData.schoolId,
      isActive: true,
    },
  });

  return {
    ortuId: ortu.id,
    ortuUsername: ortuUsername,
    isNew: true,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);

    // RBAC: Kepala Sekolah cannot access individual user data
    if (auth.role === 'KEPALA_SEKOLAH') {
      return NextResponse.json(
        { error: 'Kepala Sekolah hanya dapat mengakses data agregat. Akses data individu tidak diizinkan.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const userRole = searchParams.get('role');
    const classId = searchParams.get('classId');
    const parentId = searchParams.get('parentId');

    const where: any = { isActive: true };
    // Non-super-admin can only see their own school
    if (auth.role !== 'SUPER_ADMIN') {
      where.schoolId = auth.schoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }
    if (userRole) where.role = userRole;
    if (classId) where.classId = classId;
    if (parentId) where.parentId = parentId;

    const users = await db.user.findMany({
      where,
      include: { school: true, class: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/users', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const data = await request.json();
    const { name, role, schoolId, classId, phone, nisn, nip, nik, namaOrtu, jk } = data;

    if (!name) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
    }

    const userRole = (role || 'SISWA').toUpperCase();

    // ── GURU: require NIP or NIK as username ──
    if (userRole === 'GURU') {
      const loginId = (nip || nik || '').trim();
      if (!loginId) {
        return NextResponse.json({ error: 'NIP atau NIK wajib diisi untuk guru' }, { status: 400 });
      }

      if (nip) {
        const existingNip = await db.user.findUnique({ where: { nip } });
        if (existingNip) return NextResponse.json({ error: 'NIP sudah terdaftar' }, { status: 409 });
      }
      if (nik) {
        const existingNik = await db.user.findFirst({ where: { nik, schoolId } });
        if (existingNik) return NextResponse.json({ error: 'NIK sudah terdaftar di sekolah ini' }, { status: 409 });
      }

      const existingUsername = await db.user.findUnique({ where: { username: loginId } });
      if (existingUsername) return NextResponse.json({ error: 'Username (NIP/NIK) sudah digunakan' }, { status: 409 });

      const user = await db.user.create({
        data: {
          username: loginId,
          password: await hashPassword(data.password || 'password123'),
          name,
          role: 'GURU',
          schoolId,
          phone,
          nip: nip || null,
          nik: nik || null,
        },
        include: { school: true, class: true },
      });

      return NextResponse.json({ user, message: `Guru ${name} berhasil ditambahkan. Login: ${loginId}` });
    }

    // ── SISWA: require NISN, auto-create ORANG_TUA ──
    if (userRole === 'SISWA') {
      if (!nisn || !nisn.trim()) {
        return NextResponse.json({ error: 'NISN wajib diisi untuk siswa' }, { status: 400 });
      }

      const existingNisn = await db.user.findUnique({ where: { nisn: nisn.trim() } });
      if (existingNisn) return NextResponse.json({ error: 'NISN sudah terdaftar' }, { status: 409 });

      let parentId: string | undefined;
      let ortuMessage = '';
      if (namaOrtu && namaOrtu.trim()) {
        const ortuResult = await autoCreateOrtuForSiswa({
          namaOrtu: namaOrtu.trim(),
          schoolId: schoolId!,
          siswaId: '',
          siswaName: name,
        });
        if (ortuResult) {
          parentId = ortuResult.ortuId;
          ortuMessage = ortuResult.isNew
            ? ` | Akun orang tua dibuat otomatis (username: ${ortuResult.ortuUsername}, password: 123)`
            : ` | Terhubung ke akun orang tua yang sudah ada`;
        }
      }

      const user = await db.user.create({
        data: {
          username: nisn.trim(),
          password: await hashPassword(data.password || nisn.trim()),
          name,
          role: 'SISWA',
          schoolId,
          classId,
          phone,
          nisn: nisn.trim(),
          namaOrtu: namaOrtu?.trim() || null,
          jk: jk || null,
          parentId,
        },
        include: { school: true, class: true },
      });

      return NextResponse.json({
        user,
        message: `Siswa ${name} berhasil ditambahkan. Login: ${nisn.trim()}${ortuMessage}`,
      });
    }

    // ── Fallback: email-based user (for SUPER_ADMIN, ADMIN_SCHOOL) ──
    const email = data.email?.trim();
    if (!email) {
      return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });

    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        password: await hashPassword(data.password || 'password123'),
        name,
        role: userRole,
        schoolId,
        classId,
        phone,
      },
      include: { school: true, class: true },
    });

    return NextResponse.json({ user, message: `Pengguna ${name} berhasil ditambahkan` });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/users', method: 'POST' });
    console.error('Create user error:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat pengguna' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    if (data.password) data.password = await hashPassword(data.password);
    if (data.nisn) data.username = data.nisn.trim();
    if (data.nip) data.username = data.nip.trim();
    const user = await db.user.update({ where: { id }, data });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/users', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal update pengguna' }, { status: 500 });
  }
}

// PUT /api/users — Profile update (uses id from body, accepts name/email/phone)
export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { id, name, email, phone } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;

    const user = await db.user.update({ where: { id }, data });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/users', method: 'PUT' });
    return NextResponse.json({ error: 'Gagal memperbarui profil' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    await db.user.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/users', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal hapus pengguna' }, { status: 500 });
  }
}
