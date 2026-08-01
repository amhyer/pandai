import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';

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
    // Orang tua already exists — just link the new siswa to them
    // (the caller should set parentId = existingOrtu.id)
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
      password: await hashPassword('123'), // Default password
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
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const role = searchParams.get('role');
    const classId = searchParams.get('classId');
    const parentId = searchParams.get('parentId'); // Get children of a parent

    const where: any = { isActive: true };
    if (schoolId) where.schoolId = schoolId;
    if (role) where.role = role;
    if (classId) where.classId = classId;
    if (parentId) where.parentId = parentId;

    const users = await db.user.findMany({
      where,
      include: { school: true, class: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

      // Check uniqueness
      if (nip) {
        const existingNip = await db.user.findUnique({ where: { nip } });
        if (existingNip) return NextResponse.json({ error: 'NIP sudah terdaftar' }, { status: 409 });
      }
      if (nik) {
        // NIK is not globally unique but check within school
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

      // Auto-create orang tua
      let parentId: string | undefined;
      let ortuMessage = '';
      if (namaOrtu && namaOrtu.trim()) {
        const ortuResult = await autoCreateOrtuForSiswa({
          namaOrtu: namaOrtu.trim(),
          schoolId: schoolId!,
          siswaId: '', // will be linked after siswa creation
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
    console.error('Create user error:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat pengguna' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    if (data.password) data.password = await hashPassword(data.password);

    // If updating NISN, also update username
    if (data.nisn) {
      data.username = data.nisn.trim();
    }
    // If updating NIP, also update username
    if (data.nip) {
      data.username = data.nip.trim();
    }

    const user = await db.user.update({ where: { id }, data });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal update pengguna' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    await db.user.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal hapus pengguna' }, { status: 500 });
  }
}
