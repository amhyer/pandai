import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';
import { buildCsv, sanitizeFilename } from '@/lib/export-utils';

/**
 * GET /api/export?type=students|scores|attendance|character|catatan
 *
 * Ekspor CSV (download) untuk Admin Sekolah / Kepala Sekolah / Super Admin.
 * GURU bisa ekspor scores & character & catatan untuk sekolahnya.
 *
 * Query:
 *  - type       : dataset (wajib)
 *  - classId    : filter kelas (opsional)
 *  - subjectId  : filter mapel (opsional, utk scores)
 */

type ExportType = 'students' | 'scores' | 'attendance' | 'character' | 'catatan';

const ROLES_FOR: Record<ExportType, string[]> = {
  students: ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH'],
  scores: ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH', 'GURU'],
  attendance: ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH', 'GURU'],
  character: ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH', 'GURU'],
  catatan: ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH', 'GURU'],
};

async function exportStudents(schoolId: string | null, classId: string | null) {
  const students = await db.user.findMany({
    where: { role: 'SISWA', isActive: true, schoolId: schoolId ?? undefined, classId: classId ?? undefined },
    include: { class: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
  const rows = students.map((s) => ({
    NISN: s.nisn ?? '',
    Nama: s.name,
    JK: s.jk ?? '',
    Kelas: s.class?.name ?? '',
    'No. HP': s.phone ?? '',
    Aktif: s.isActive ? 'Ya' : 'Tidak',
  }));
  return {
    csv: buildCsv(rows),
    filename: sanitizeFilename(`siswa-${classId ? 'kelas' : 'sekolah'}-${new Date().toISOString().slice(0, 10)}`),
  };
}

async function exportScores(schoolId: string | null, classId: string | null, subjectId: string | null) {
  const attempts = await db.studentAttempt.findMany({
    where: {
      schoolId: schoolId ?? undefined,
      isRemedial: false,
      status: { in: ['submitted', 'graded'] },
      ...(classId ? { classId } : {}),
      ...(subjectId ? { examPackage: { subjectId } } : {}),
    },
    include: {
      user: { select: { nisn: true, name: true, class: { select: { name: true } } } },
      examPackage: { include: { subject: { select: { name: true } } } },
    },
    orderBy: [{ user: { name: 'asc' } }, { submittedAt: 'desc' }],
    take: 20000,
  });
  const rows = attempts.map((a) => ({
    NISN: a.user?.nisn ?? '',
    Nama: a.user?.name ?? '',
    Kelas: a.user?.class?.name ?? '',
    Mapel: a.examPackage?.subject?.name ?? 'TKA',
    Skor: Math.round(a.score ?? 0),
    Benar: a.totalCorrect ?? 0,
    Salah: a.totalWrong ?? 0,
    'Tidak Dijawab': a.totalUnanswered ?? 0,
    'Prediksi TKA': a.tkaPrediction != null ? Math.round(a.tkaPrediction) : '',
    Tanggal: (a.submittedAt ?? a.createdAt).toISOString().slice(0, 10),
    Status: a.status,
  }));
  return {
    csv: buildCsv(rows),
    filename: sanitizeFilename(`nilai-${new Date().toISOString().slice(0, 10)}`),
  };
}

async function exportAttendance(schoolId: string | null, classId: string | null) {
  const records = await db.attendance.findMany({
    where: { schoolId: schoolId ?? undefined, ...(classId ? { classId } : {}) },
    include: { student: { select: { nisn: true, name: true } } },
    orderBy: [{ date: 'desc' }, { student: { name: 'asc' } }],
    take: 50000,
  });
  const rows = records.map((r) => ({
    Tanggal: r.date,
    NISN: r.student?.nisn ?? '',
    Nama: r.student?.name ?? '',
    Status: r.status,
    Catatan: r.note ?? '',
  }));
  return {
    csv: buildCsv(rows),
    filename: sanitizeFilename(`kehadiran-${new Date().toISOString().slice(0, 10)}`),
  };
}

async function exportCharacter(schoolId: string | null, classId: string | null) {
  const reports = await db.characterReport.findMany({
    where: { schoolId: schoolId ?? undefined, ...(classId ? { classId } : {}) },
    include: { student: { select: { nisn: true, name: true } } },
    orderBy: [{ date: 'desc' }, { student: { name: 'asc' } }],
    take: 50000,
  });
  const rows = reports.map((r) => ({
    Tanggal: r.date,
    NISN: r.student?.nisn ?? '',
    Nama: r.student?.name ?? '',
    Kebiasaan: r.habit,
    Rating: r.rating,
    'Diisi Oleh': r.filledBy,
    Catatan: r.note ?? '',
  }));
  return {
    csv: buildCsv(rows),
    filename: sanitizeFilename(`kebiasaan-${new Date().toISOString().slice(0, 10)}`),
  };
}

async function exportCatatan(schoolId: string | null, classId: string | null) {
  const items = await db.guruCatatan.findMany({
    where: { schoolId: schoolId ?? undefined, ...(classId ? { classId } : {}) },
    include: {
      student: { select: { nisn: true, name: true, class: { select: { name: true } } } },
      teacher: { select: { name: true } },
    },
    orderBy: [{ date: 'desc' }, { student: { name: 'asc' } }],
    take: 20000,
  });
  const rows = items.map((c) => ({
    Tanggal: c.date,
    Term: c.term,
    NISN: c.student?.nisn ?? '',
    Nama: c.student?.name ?? '',
    Kelas: c.student?.class?.name ?? '',
    Kategori: c.category,
    Catatan: c.content,
    Guru: c.teacher?.name ?? '',
  }));
  return {
    csv: buildCsv(rows),
    filename: sanitizeFilename(`catatan-siswa-${new Date().toISOString().slice(0, 10)}`),
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH', 'GURU']);
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');

    if (!typeParam || !ROLES_FOR[typeParam as ExportType]) {
      return NextResponse.json(
        { error: 'type harus salah satu: students, scores, attendance, character, catatan' },
        { status: 400 }
      );
    }
    const type = typeParam as ExportType;
    if (!ROLES_FOR[type].includes(auth.role)) {
      return NextResponse.json({ error: 'Role tidak diizinkan untuk ekspor ini' }, { status: 403 });
    }

    const schoolId = auth.role === 'SUPER_ADMIN' ? null : auth.schoolId;

    let result: { csv: string; filename: string };
    switch (type) {
      case 'students':
        result = await exportStudents(schoolId, classId);
        break;
      case 'scores':
        result = await exportScores(schoolId, classId, subjectId);
        break;
      case 'attendance':
        result = await exportAttendance(schoolId, classId);
        break;
      case 'character':
        result = await exportCharacter(schoolId, classId);
        break;
      case 'catatan':
        result = await exportCatatan(schoolId, classId);
        break;
    }

    return new NextResponse('\uFEFF' + result.csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/export', method: 'GET' });
    return NextResponse.json({ error: 'Gagal membuat ekspor' }, { status: 500 });
  }
}
