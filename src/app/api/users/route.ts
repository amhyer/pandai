import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';
import { generateTempPassword } from '@/lib/temp-password';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { logAccess } from '@/lib/audit-log';

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
}): Promise<{ ortuId: string; ortuUsername: string; ortuTempPassword?: string; isNew: boolean } | null> {
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

  // Create new ORANG_TUA account with random temporary password
  const ortuUsername = await generateUniqueOrtuUsername(baseName, siswaData.schoolId);
  const ortuTempPassword = generateTempPassword();
  const ortu = await db.user.create({
    data: {
      username: ortuUsername,
      password: await hashPassword(ortuTempPassword),
      name: siswaData.namaOrtu.trim(),
      role: 'ORANG_TUA',
      schoolId: siswaData.schoolId,
      isActive: true,
      mustChangePassword: true,
    },
  });

  return {
    ortuId: ortu.id,
    ortuUsername: ortuUsername,
    ortuTempPassword,
    isNew: true,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    try { await logAccess(auth, { action: 'READ', resourceType: 'users' }); } catch {}
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');

    // ORANG_TUA: can only see own children (parentId must be own userId)
    if (auth.role === 'ORANG_TUA') {
      if (parentId && parentId !== auth.userId) {
        return NextResponse.json({ error: 'Tidak diizinkan melihat anak orang lain' }, { status: 403 });
      }
      const children = await db.user.findMany({
        where: { parentId: auth.userId, isActive: true, schoolId: auth.schoolId },
        include: { school: true, class: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(children);
    }

    // Non-ortu: require ADMIN role
    if (auth.role !== 'SUPER_ADMIN' && auth.role !== 'ADMIN_SCHOOL') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const schoolId = searchParams.get('schoolId');
    const userRole = searchParams.get('role');
    const classId = searchParams.get('classId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    // Non-super-admin can only see their own school
    if (auth.role !== 'SUPER_ADMIN') {
      // If a different schoolId is requested, reject explicitly
      if (schoolId && schoolId !== auth.schoolId) {
        return NextResponse.json({ error: 'Akses ditolak — bukan sekolah Anda' }, { status: 403 });
      }
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
      take: limit,
      skip,
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
    try { await logAccess(auth, { action: 'CREATE', resourceType: 'users', detail: 'create_user' }); } catch {}

    if (!name) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
    }

    // IDOR fix: ADMIN_SCHOOL can only create users in their own school
    if (auth.role !== 'SUPER_ADMIN') {
      if (schoolId && schoolId !== auth.schoolId) {
        return NextResponse.json({ error: 'Akses ditolak — bukan sekolah Anda' }, { status: 403 });
      }
    }

    const userRole = (role || 'SISWA').toUpperCase();

    // ── GURU: require NIP or NIK as username ──
    if (userRole === 'GURU') {
      const loginId = (nip || nik || '').trim();
      if (!loginId) {
        return NextResponse.json({ error: 'NIP atau NIK wajib diisi untuk guru' }, { status: 400 });
      }
      if (!data.password) {
        return NextResponse.json({ error: 'Password wajib diisi untuk guru' }, { status: 400 });
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
          password: await hashPassword(data.password),
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
      if (!data.password) {
        return NextResponse.json({ error: 'Password wajib diisi untuk siswa' }, { status: 400 });
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
            ? ` | Akun orang tua dibuat otomatis (username: ${ortuResult.ortuUsername}, password: ${ortuResult.ortuTempPassword}). Wajib ganti password saat login pertama.`
            : ` | Terhubung ke akun orang tua yang sudah ada`;
        }
      }

      const user = await db.user.create({
        data: {
          username: nisn.trim(),
          password: await hashPassword(data.password),
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
    if (!data.password) {
      return NextResponse.json({ error: 'Password wajib diisi' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });

    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        password: await hashPassword(data.password),
        name,
        role: userRole,
        schoolId,
        classId,
        phone,
      },
      include: { school: true, class: true },
    });

    return NextResponse.json({ user, message: `Pengguna ${name} berhasil ditambahkan` });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/users', method: 'POST' });
    return NextResponse.json({ error: 'Gagal membuat pengguna' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    try { await logAccess(auth, { action: 'UPDATE', resourceType: 'users' }); } catch {}

    // IDOR fix: ADMIN_SCHOOL can only modify users in their own school
    if (auth.role !== 'SUPER_ADMIN') {
      const targetUser = await db.user.findUnique({ where: { id }, select: { schoolId: true } });
      if (!targetUser || targetUser.schoolId !== auth.schoolId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    // Type-safety: whitelist allowed fields to prevent privilege escalation
    // (e.g. client sending role, schoolId, isActive, mustChangePassword)
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.nisn !== undefined) { data.nisn = body.nisn; data.username = body.nisn.trim(); }
    if (body.nip !== undefined) { data.nip = body.nip; data.username = body.nip.trim(); }
    if (body.nik !== undefined) data.nik = body.nik;
    if (body.classId !== undefined) data.classId = body.classId;
    if (body.jk !== undefined) data.jk = body.jk;
    if (body.namaOrtu !== undefined) data.namaOrtu = body.namaOrtu;
    if (body.password) data.password = await hashPassword(body.password);

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

// PUT /api/users — Profile update (own profile only, or admin/kepsek with same school)
export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { id, name, email, phone } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    // IDOR fix: only allow editing own profile unless admin with same school
    if (id !== auth.userId) {
      if (auth.role !== 'SUPER_ADMIN' && auth.role !== 'ADMIN_SCHOOL' && auth.role !== 'KEPALA_SEKOLAH') {
        return NextResponse.json({ error: 'Tidak diizinkan mengedit profil lain' }, { status: 403 });
      }
      // Admin/kepsek can only edit users in same school
      if (auth.role !== 'SUPER_ADMIN') {
        const targetUser = await db.user.findUnique({ where: { id }, select: { schoolId: true } });
        if (!targetUser || targetUser.schoolId !== auth.schoolId) {
          return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
        }
      }
    }

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
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    try { await logAccess(auth, { action: 'DELETE', resourceType: 'users' }); } catch {}

    // IDOR fix: ADMIN_SCHOOL can only delete users in their own school
    if (auth.role !== 'SUPER_ADMIN') {
      const targetUser = await db.user.findUnique({ where: { id }, select: { schoolId: true } });
      if (!targetUser || targetUser.schoolId !== auth.schoolId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

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
