import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';

// GET /api/attendance
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH', 'SISWA']);

    // RBAC: Kepala Sekolah cannot access individual attendance data
    if (auth.role === 'KEPALA_SEKOLAH') {
      return NextResponse.json(
        { error: 'Kepala Sekolah hanya dapat mengakses data agregat. Akses data individu tidak diizinkan.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;
    if (date) where.date = date;
    if (month) {
      where.date = { startsWith: month } as any;
    }

    const records = await db.attendance.findMany({
      where, orderBy: [{ date: 'desc' }, { id: 'asc' }], take: month ? 500 : 100,
    });

    const enriched = await Promise.all(
      records.map(async (r) => {
        const student = r.studentId
          ? await db.user.findUnique({ where: { id: r.studentId }, select: { id: true, name: true, nisn: true } })
          : null;
        return { ...r, student };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/attendance error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data kehadiran' }, { status: 500 });
  }
}

// POST /api/attendance — Create attendance record
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['GURU']);
    const body = await req.json();
    const { records } = body;
    const { classId, schoolId, date } = body;
    const recordedBy = auth.userId;

    if (!date || !schoolId || !records?.length) {
      return NextResponse.json({ error: 'Data wajib belum lengkap' }, { status: 400 });
    }

    if (classId) {
      await db.attendance.deleteMany({ where: { classId, date, recordedBy } });
    }

    const created = await db.attendance.createMany({
      data: records.map((r: { studentId: string; status: string; note?: string }) => ({
        studentId: r.studentId, classId: classId || null, schoolId, date, status: r.status,
        note: r.note || null, recordedBy,
      })),
    });

    return NextResponse.json({ created: created.count }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/attendance error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan kehadiran' }, { status: 500 });
  }
}

// PATCH /api/attendance — Update single record
export async function PATCH(req: NextRequest) {
  try {
    await requireRole(req, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);
    const body = await req.json();
    const { id, status, note } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const record = await db.attendance.update({
      where: { id },
      data: { ...(status && { status }), ...(note !== undefined && { note }) },
    });

    return NextResponse.json(record);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('PATCH /api/attendance error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate kehadiran' }, { status: 500 });
  }
}
