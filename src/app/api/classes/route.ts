import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';
import { getSchoolLevel, isGradeValidForSchool } from '@/lib/school-grades';

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']);
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const grade = searchParams.get('grade');

    const where: any = {};
    // Enforce school scope
    const effectiveSchoolId = getSchoolFilter(auth);
    if (effectiveSchoolId) {
      where.schoolId = effectiveSchoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }
    if (grade) where.grade = parseInt(grade);

    const classes = await db.class.findMany({
      where,
      include: {
        _count: { select: { users: true } },
        WaliKelas: { select: { id: true, name: true, nip: true } },
      },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(classes);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/classes', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil data kelas' }, { status: 500 });
  }
}

// POST /api/classes — Create new class (ADMIN_SCHOOL, SUPER_ADMIN)
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { name, grade, academicYear, schoolId, waliKelasId } = await request.json();

    if (!name || !grade) {
      return NextResponse.json({ error: 'Nama dan tingkat kelas wajib diisi' }, { status: 400 });
    }

    const effectiveSchoolId = schoolId || auth.schoolId;
    if (!effectiveSchoolId) {
      return NextResponse.json({ error: 'School ID diperlukan' }, { status: 400 });
    }

    // Enforce school scope
    if (auth.role !== 'SUPER_ADMIN') {
      requireSchoolScope(auth, effectiveSchoolId);
    }

    // Pastikan tingkat kelas sesuai jenjang sekolah (SD 1-6, SMP 7-9, SMA/SMK 10-12)
    const school = await db.school.findUnique({
      where: { id: effectiveSchoolId },
      select: { schoolType: true, name: true },
    });
    if (!isGradeValidForSchool(grade, school?.schoolType, school?.name)) {
      const level = getSchoolLevel(school?.schoolType, school?.name);
      const valid = level === 'SD' ? '1-6' : level === 'SMP' ? '7-9' : '10-12';
      return NextResponse.json(
        { error: `Tingkat kelas tidak sesuai jenjang sekolah (hanya Kelas ${valid} untuk jenjang ini)` },
        { status: 400 }
      );
    }

    // Check for duplicate class name in same school
    const existing = await db.class.findFirst({
      where: { schoolId: effectiveSchoolId, name, grade: Number(grade) },
    });
    if (existing) {
      return NextResponse.json({ error: 'Kelas dengan nama dan tingkat yang sama sudah ada di sekolah ini' }, { status: 409 });
    }

    const cls = await db.class.create({
      data: {
        name,
        grade: Number(grade),
        academicYear: academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        schoolId: effectiveSchoolId,
        waliKelasId: waliKelasId || null,
      },
      include: {
        _count: { select: { users: true } },
        WaliKelas: { select: { id: true, name: true, nip: true } },
      },
    });

    return NextResponse.json(cls, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/classes', method: 'POST' });
    return NextResponse.json({ error: 'Gagal membuat kelas' }, { status: 500 });
  }
}

// PUT /api/classes — Update class (e.g. assign wali kelas)
export async function PUT(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { id, waliKelasId, name, grade, academicYear } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    // Verify school scope & cari schoolId kelas tsb (untuk validasi jenjang)
    let schoolIdForValidation: string;
    const existing = await db.class.findUnique({
      where: { id },
      select: { schoolId: true, name: true, grade: true },
    });
    if (!existing) return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    if (auth.role !== 'SUPER_ADMIN' && existing.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak — bukan sekolah Anda' }, { status: 403 });
    }
    schoolIdForValidation = existing.schoolId;

    const nextName = name === undefined ? existing.name : String(name).trim();
    const nextGrade = grade === undefined ? existing.grade : Number(grade);
    if (!nextName || !Number.isInteger(nextGrade)) {
      return NextResponse.json({ error: 'Nama dan tingkat kelas wajib diisi dengan benar' }, { status: 400 });
    }

    // Pastikan tingkat kelas sesuai jenjang sekolah
    const school = await db.school.findUnique({
      where: { id: schoolIdForValidation },
      select: { schoolType: true, name: true },
    });
    if (!isGradeValidForSchool(nextGrade, school?.schoolType, school?.name)) {
      const level = getSchoolLevel(school?.schoolType, school?.name);
      const valid = level === 'SD' ? '1-6' : level === 'SMP' ? '7-9' : '10-12';
      return NextResponse.json(
        { error: `Tingkat kelas tidak sesuai jenjang sekolah (hanya Kelas ${valid} untuk jenjang ini)` },
        { status: 400 }
      );
    }

    // Jangan izinkan dua kelas dengan nama dan tingkat yang sama dalam satu sekolah.
    const duplicate = await db.class.findFirst({
      where: {
        schoolId: schoolIdForValidation,
        name: nextName,
        grade: nextGrade,
        NOT: { id },
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'Kelas dengan nama dan tingkat yang sama sudah ada di sekolah ini' }, { status: 409 });
    }

    const data: Record<string, unknown> = {
      name: nextName,
      grade: nextGrade,
    };
    if (academicYear !== undefined) data.academicYear = String(academicYear).trim();
    if (waliKelasId !== undefined) data.waliKelasId = waliKelasId || null;

    const cls = await db.class.update({
      where: { id },
      data,
      include: {
        _count: { select: { users: true } },
        WaliKelas: { select: { id: true, name: true, nip: true } },
      },
    });
    return NextResponse.json(cls);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/classes', method: 'PUT' });
    return NextResponse.json({ error: 'Gagal memperbarui kelas' }, { status: 500 });
  }
}

// DELETE /api/classes — Delete a class (ADMIN_SCHOOL, SUPER_ADMIN)
export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    const existing = await db.class.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        schoolId: true,
        _count: { select: { users: true, examAssignments: true, timetables: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    if (auth.role !== 'SUPER_ADMIN' && existing.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak — bukan sekolah Anda' }, { status: 403 });
    }

    // Jadwal dan penugasan ujian memiliki relasi wajib ke kelas. Menolak penghapusan
    // lebih aman daripada menghapus data akademik yang masih digunakan.
    if (existing._count.examAssignments > 0 || existing._count.timetables > 0) {
      return NextResponse.json(
        { error: 'Kelas tidak dapat dihapus karena masih digunakan pada jadwal atau penugasan ujian' },
        { status: 409 }
      );
    }

    // Siswa tetap dipertahankan; hanya hubungan kelasnya yang dilepas.
    await db.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { classId: id }, data: { classId: null } });
      await tx.class.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, studentCount: existing._count.users });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/classes', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal menghapus kelas' }, { status: 500 });
  }
}
