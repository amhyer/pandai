import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 7 Kebiasaan Anak Hebat
const SEVEN_HABITS = [
  'Proaktif',
  'Mulai dengan Tujuan',
  'Prioritas Utama Dahulu',
  'Pikir Menang-Menang',
  'Mengerti lalu Dierti',
  'Bersinergi',
  'Asah Gergaji',
];

// GET /api/character-reports
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');
    const reporterId = searchParams.get('reporterId');
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;
    if (reporterId) where.reporterId = reporterId;
    if (date) where.date = date;
    if (month) {
      where.date = { startsWith: month } as any;
    }

    const reports = await db.characterReport.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: 500,
    });

    // Enrich with student names
    const enriched = await Promise.all(
      reports.map(async (r) => {
        const student = r.studentId
          ? await db.user.findUnique({ where: { id: r.studentId }, select: { id: true, name: true, nisn: true } })
          : null;
        return { ...r, student };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('GET /api/character-reports error:', error);
    return NextResponse.json({ error: 'Gagal mengambil laporan karakter' }, { status: 500 });
  }
}

// POST /api/character-reports — Create character report
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, classId, schoolId, reporterId, date, habit, rating, note } = body;

    if (!studentId || !reporterId || !date || !habit) {
      return NextResponse.json({ error: 'Data wajib belum lengkap' }, { status: 400 });
    }

    if (!SEVEN_HABITS.includes(habit)) {
      return NextResponse.json({ error: 'Kebiasaan tidak valid' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating harus antara 1-5' }, { status: 400 });
    }

    const report = await db.characterReport.create({
      data: {
        studentId,
        classId: classId || null,
        schoolId: schoolId || null,
        reporterId,
        date,
        habit,
        rating,
        note: note || null,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('POST /api/character-reports error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan laporan karakter' }, { status: 500 });
  }
}

// PATCH /api/character-reports
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, rating, note } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const report = await db.characterReport.update({
      where: { id },
      data: {
        ...(rating !== undefined && { rating }),
        ...(note !== undefined && { note }),
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('PATCH /api/character-reports error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate laporan' }, { status: 500 });
  }
}

// DELETE /api/character-reports
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    await db.characterReport.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/character-reports error:', error);
    return NextResponse.json({ error: 'Gagal menghapus laporan' }, { status: 500 });
  }
}
