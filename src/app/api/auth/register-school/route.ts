import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logError } from '@/lib/error-log';
import { inferSchoolLevelFromName } from '@/lib/school-grades';

export async function POST(request: Request) {
  try {
    const { email, password, name, schoolData } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, dan nama wajib diisi' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 });
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json({ error: 'Password harus mengandung huruf dan angka' }, { status: 400 });
    }

    if (!schoolData || !schoolData.npsn || !schoolData.name) {
      return NextResponse.json({ error: 'Data sekolah tidak lengkap' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }

    // Check if NPSN already registered
    const existingNpsn = await db.school.findUnique({ where: { npsn: schoolData.npsn } });
    if (existingNpsn) {
      return NextResponse.json({ error: 'Sekolah dengan NPSN ini sudah terdaftar. Hubungi super admin jika ini kesalahan.' }, { status: 409 });
    }

    // Generate school code from NPSN
    const lastFour = schoolData.npsn.slice(-4);
    const schoolCode = `NPSN-${lastFour}`;

    // Check if code already exists (unlikely but possible)
    const existingCode = await db.school.findUnique({ where: { code: schoolCode } });
    const finalCode = existingCode ? `NPSN-${schoolData.npsn}` : schoolCode;

    const hashedPassword = await hashPassword(password);

    // Tebak jenjang dari nama sekolah bila schoolType kosong (mis. DAPODIK tidak
    // mengembalikan bentuk_pendidikan), supaya opsi tingkat kelas langsung benar.
    const schoolType = (schoolData.schoolType ?? '').trim() || inferSchoolLevelFromName(schoolData.name);

    // Create School with Dapodik fields.
    // Self-registered schools start as pending; a SUPER_ADMIN must approve them
    // before the admin account can log in. This prevents NPSN/school squatting.
    const school = await db.school.create({
      data: {
        name: schoolData.name,
        code: finalCode,
        address: schoolData.address || null,
        phone: schoolData.phone || null,
        email: schoolData.email || null,
        npsn: schoolData.npsn,
        province: schoolData.province || null,
        city: schoolData.city || null,
        district: schoolData.district || null,
        principalName: schoolData.principalName || null,
        accreditation: schoolData.accreditation || null,
        schoolType: schoolType || null,
        curriculum: schoolData.curriculum || null,
        status: 'pending',
      },
    });

    // Create subscription for the school
    await db.subscription.create({
      data: {
        schoolId: school.id,
        plan: 'free',
        startDate: new Date(),
        endDate: null,
        amount: 0,
      },
    });

    // Create Admin User linked to the school.
    // The account is inactive until a SUPER_ADMIN approves the school.
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: 'ADMIN_SCHOOL',
        schoolId: school.id,
        isActive: false,
        mustChangePassword: true,
      },
      include: { school: true },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      schoolName: user.school?.name,
      isActive: user.isActive,
      pendingApproval: true,
      schoolStatus: 'pending',
    });
  } catch (error: unknown) {
    logError({ error, route: '/api/auth/register-school', method: 'POST' });
    console.error('Register school error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
