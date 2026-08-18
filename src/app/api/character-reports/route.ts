import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';

export const SEVEN_HABITS = ['bangun_pagi', 'beribadah', 'berolahraga', 'makan_sehat', 'gemar_belajar', 'bermasyarakat', 'tidur_cepat'] as const;

export const SEVEN_HABIT_LABELS: Record<string, { name: string; emoji: string; description: string }> = {
  bangun_pagi: { name: 'Bangun Pagi', emoji: '🌅', description: 'Bangun pagi secara teratur sebelum jam 6 pagi' },
  beribadah: { name: 'Beribadah', emoji: '🤲', description: 'Melaksanakan ibadah sesuai agama dan keyakinan masing-masing' },
  berolahraga: { name: 'Berolahraga', emoji: '🏃', description: 'Melakukan aktivitas olahraga minimal 30 menit per hari' },
  makan_sehat: { name: 'Makan Sehat dan Bergizi', emoji: '🥗', description: 'Mengonsumsi makanan sehat dan bergizi seimbang' },
  gemar_belajar: { name: 'Gemar Belajar', emoji: '📚', description: 'Belajar dengan rajin dan disiplin setiap hari' },
  bermasyarakat: { name: 'Bermasyarakat', emoji: '🤝', description: 'Aktif berinteraksi dan membantu di lingkungan masyarakat' },
  tidur_cepat: { name: 'Tidur Cepat', emoji: '😴', description: 'Tidur tepat waktu pada malam hari sebelum jam 9 malam' },
};

export const RATING_LABELS: Record<number, string> = { 1: 'Belum', 2: 'Kadang', 3: 'Sering', 4: 'Selalu' };

// GET /api/character-reports
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH', 'ORANG_TUA', 'SISWA']);

    // RBAC: Kepala Sekolah cannot access individual character reports
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
    const reporterId = searchParams.get('reporterId');
    const date = searchParams.get('date');
    const month = searchParams.get('month');
    const filledBy = searchParams.get('filledBy');

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;
    if (reporterId) where.reporterId = reporterId;
    if (date) where.date = date;
    if (month) { where.date = { startsWith: month } as any; }
    if (filledBy) where.filledBy = filledBy;

    const reports = await db.characterReport.findMany({
      where, orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 500,
    });

    const enriched = await Promise.all(
      reports.map(async (r) => {
        const student = r.studentId ? await db.user.findUnique({ where: { id: r.studentId }, select: { id: true, name: true, nisn: true } }) : null;
        return { ...r, student };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/character-reports', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil laporan karakter' }, { status: 500 });
  }
}

// POST /api/character-reports — ONLY ORANG_TUA can create
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['ORANG_TUA']);
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    const results: Record<string, unknown>[] = [];
    for (const item of items) {
      const { studentId, classId, schoolId, reporterId, date, habit, rating, note } = item;

      if (!studentId || !reporterId || !date || !habit) {
        return NextResponse.json({ error: 'Data wajib belum lengkap' }, { status: 400 });
      }
      if (!SEVEN_HABITS.includes(habit as typeof SEVEN_HABITS[number])) {
        return NextResponse.json({ error: 'Kebiasaan tidak valid' }, { status: 400 });
      }
      if (rating < 1 || rating > 4) {
        return NextResponse.json({ error: 'Rating harus antara 1-4 (Belum/Kadang/Sering/Selalu)' }, { status: 400 });
      }

      const report = await db.characterReport.create({
        data: {
          studentId, classId: classId || null, schoolId: schoolId || null,
          reporterId, filledBy: 'ORANG_TUA', date, habit, rating, note: note || null,
        },
      });
      results.push(report);
    }

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/character-reports', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menyimpan laporan karakter' }, { status: 500 });
  }
}

// PATCH /api/character-reports — ONLY ORANG_TUA
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['ORANG_TUA']);
    const body = await req.json();
    const { id, rating, note } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });
    if (rating !== undefined && (rating < 1 || rating > 4)) {
      return NextResponse.json({ error: 'Rating harus antara 1-4' }, { status: 400 });
    }

    const report = await db.characterReport.update({
      where: { id }, data: { ...(rating !== undefined && { rating }), ...(note !== undefined && { note }) },
    });
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/character-reports', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal mengupdate laporan' }, { status: 500 });
  }
}

// DELETE /api/character-reports — ONLY ORANG_TUA
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['ORANG_TUA']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    await db.characterReport.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/character-reports', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal menghapus laporan' }, { status: 500 });
  }
}
