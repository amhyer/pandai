import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const { email, password, name, schoolData } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, dan nama wajib diisi' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
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

    // Create School with Dapodik fields
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
        schoolType: schoolData.schoolType || null,
        curriculum: schoolData.curriculum || null,
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

    // Create Admin User linked to the school
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: 'ADMIN_SCHOOL',
        schoolId: school.id,
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
    });
  } catch (error: any) {
    console.error('Register school error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
