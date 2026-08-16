import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/attendance
export async function GET(req: NextRequest) {
  try {
    // RBAC: Kepala Sekolah cannot access individual attendance data
    const role = req.headers.get('X-User-Role');
    if (role === 'KEPALA_SEKOLAH') {
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
    const month = searchParams.get('month'); // YYYY-MM

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;
    if (date) where.date = date;
    if (month) {
      // Use startsWith for month filtering in SQLite
      where.date = { startsWith: month } as any;
    }

    const records = await db.attendance.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
      take: month ? 500 : 100,
    });

    // Enrich with student names
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
    console.error('GET /api/attendance error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data kehadiran' }, { status: 500 });
  }
}

// POST /api/attendance — Create attendance record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { records } = body; // Array of { studentId, status, note? }
    const { classId, schoolId, date, recordedBy } = body;

    if (!date || !schoolId || !recordedBy || !records?.length) {
      return NextResponse.json({ error: 'Data wajib belum lengkap' }, { status: 400 });
    }

    // Upsert attendance records (delete existing for same date/class, then create new)
    if (classId) {
      await db.attendance.deleteMany({
        where: { classId, date, recordedBy },
      });
    }

    const created = await db.attendance.createMany({
      data: records.map((r: { studentId: string; status: string; note?: string }) => ({
        studentId: r.studentId,
        classId: classId || null,
        schoolId,
        date,
        status: r.status,
        note: r.note || null,
        recordedBy,
      })),
    });

    return NextResponse.json({ created: created.count }, { status: 201 });
  } catch (error) {
    console.error('POST /api/attendance error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan kehadiran' }, { status: 500 });
  }
}

// PATCH /api/attendance — Update single record
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, note } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const record = await db.attendance.update({
      where: { id },
      data: { ...(status && { status }), ...(note !== undefined && { note }) },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('PATCH /api/attendance error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate kehadiran' }, { status: 500 });
  }
}
