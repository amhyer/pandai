import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { logError } from '@/lib/error-log';
import { validateDimension, validateRating } from '@/lib/competency-dimensions';

// ─── POST: Create or upsert a competency assessment (GURU only) ───
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH', 'SUPER_ADMIN']);

    const body = await request.json();
    const { studentId, classId, subjectId, dimension, rating, term, note, date } = body;

    // Validasi wajib
    if (!studentId || !dimension || !rating || !term || !date) {
      return NextResponse.json(
        { error: 'studentId, dimension, rating, term, dan date wajib diisi' },
        { status: 400 }
      );
    }

    if (!validateDimension(dimension)) {
      return NextResponse.json(
        { error: `Dimensi tidak valid. Pilihan: ${['KEIMANAN_KETAKWAAN','KEWARGAAN','PENALARAN_KRITIS','KREATIVITAS','KOLABORASI','KEMANDIRIAN','KESEHATAN','KOMUNIKASI'].join(', ')}` },
        { status: 400 }
      );
    }

    if (!validateRating(rating)) {
      return NextResponse.json(
        { error: 'Rating harus integer 1-4' },
        { status: 400 }
      );
    }

    // Cek siswa ada dan di sekolah yang sama
    const student = await db.user.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    const targetSchoolId = auth.role === 'SUPER_ADMIN' ? (student.schoolId || body.schoolId) : auth.schoolId;
    if (!targetSchoolId) {
      return NextResponse.json({ error: 'Sekolah tidak diketahui' }, { status: 400 });
    }

    // School isolation: siswa harus di sekolah yang sama (kecuali SUPER_ADMIN)
    if (auth.role !== 'SUPER_ADMIN' && student.schoolId && student.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Tidak bisa menilai siswa dari sekolah lain' }, { status: 403 });
    }

    // Upsert: satu guru, satu dimensi, satu siswa, satu periode
    const assessment = await db.competencyAssessment.upsert({
      where: {
        studentId_dimension_term_assessedBy: {
          studentId,
          dimension,
          term,
          assessedBy: auth.userId,
        },
      },
      create: {
        studentId,
        schoolId: targetSchoolId,
        classId: classId || student.classId || null,
        subjectId: subjectId || null,
        dimension,
        rating,
        assessedBy: auth.userId,
        term,
        note: note || null,
        date,
      },
      update: {
        rating,
        note: note !== undefined ? note : undefined,
        date,
        classId: classId || student.classId || undefined,
      },
      include: {
        student: { select: { id: true, name: true, nisn: true, classId: true } },
        assessor: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(assessment);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/competency-assessments', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menyimpan penilaian' }, { status: 500 });
  }
}

// ─── GET: List assessments with filters + optional recap mode ───
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const term = searchParams.get('term');
    const recap = searchParams.get('recap'); // 'student' | 'class'

    // ── Build where clause with school isolation ──
    const where: Record<string, unknown> = {};

    if (auth.role === 'SISWA') {
      // Siswa hanya bisa lihat data diri sendiri
      where.studentId = auth.userId;
      where.schoolId = auth.schoolId;
    } else if (auth.role === 'ORANG_TUA') {
      // Ortu hanya bisa lihat data anak-anaknya
      const children = await db.user.findMany({
        where: { parentId: auth.userId, schoolId: auth.schoolId },
        select: { id: true },
      });
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) {
        return NextResponse.json([]);
      }
      where.studentId = { in: childIds };
      where.schoolId = auth.schoolId;
    } else {
      // GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN
      if (auth.role !== 'SUPER_ADMIN' && auth.schoolId) {
        where.schoolId = auth.schoolId;
      }
      if (studentId) where.studentId = studentId;
      if (classId) where.classId = classId;
    }

    if (term) where.term = term;

    // ── Recap mode ──
    if (recap === 'student') {
      // Rata-rata per dimensi per siswa
      const targetStudentId = studentId || (auth.role === 'SISWA' ? auth.userId : null);
      if (!targetStudentId) {
        return NextResponse.json({ error: 'studentId wajib untuk recap student' }, { status: 400 });
      }

      const assessments = await db.competencyAssessment.findMany({
        where: { ...where, studentId: targetStudentId },
      });

      // Group by dimension, average the ratings
      const byDimension: Record<string, { total: number; count: number; ratings: number[] }> = {};
      for (const a of assessments) {
        if (!byDimension[a.dimension]) {
          byDimension[a.dimension] = { total: 0, count: 0, ratings: [] };
        }
        byDimension[a.dimension].total += a.rating;
        byDimension[a.dimension].count += 1;
        byDimension[a.dimension].ratings.push(a.rating);
      }

      const recapData = Object.entries(byDimension).map(([dimension, data]) => ({
        dimension,
        average: Math.round((data.total / data.count) * 100) / 100,
        count: data.count,
        ratings: data.ratings,
      }));

      // Also return raw assessments for detail view
      const raw = await db.competencyAssessment.findMany({
        where: { ...where, studentId: targetStudentId },
        include: {
          assessor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ recap: recapData, assessments: raw });
    }

    if (recap === 'class') {
      // Rata-rata per dimensi per kelas
      if (!classId && !auth.schoolId) {
        return NextResponse.json({ error: 'classId atau schoolId wajib untuk recap class' }, { status: 400 });
      }

      const assessments = await db.competencyAssessment.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, classId: true } },
        },
      });

      // Group by dimension
      const byDimension: Record<string, { total: number; count: number; studentRatings: Record<string, number[]> }> = {};
      for (const a of assessments) {
        if (!byDimension[a.dimension]) {
          byDimension[a.dimension] = { total: 0, count: 0, studentRatings: {} };
        }
        byDimension[a.dimension].total += a.rating;
        byDimension[a.dimension].count += 1;
        if (!byDimension[a.dimension].studentRatings[a.studentId]) {
          byDimension[a.dimension].studentRatings[a.studentId] = [];
        }
        byDimension[a.dimension].studentRatings[a.studentId].push(a.rating);
      }

      const recapData = Object.entries(byDimension).map(([dimension, data]) => {
        const studentAverages = Object.entries(data.studentRatings).map(([sid, ratings]) => ({
          studentId: sid,
          average: Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 100) / 100,
        }));
        return {
          dimension,
          classAverage: Math.round((data.total / data.count) * 100) / 100,
          totalAssessments: data.count,
          uniqueStudents: Object.keys(data.studentRatings).length,
          studentAverages,
        };
      });

      return NextResponse.json({ recap: recapData });
    }

    // ── Normal list mode ──
    const assessments = await db.competencyAssessment.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, nisn: true, classId: true } },
        assessor: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json(assessments);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/competency-assessments', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil data penilaian' }, { status: 500 });
  }
}

// ─── PATCH: Update an assessment (GURU who created it, or ADMIN_SCHOOL/KEPALA_SEKOLAH) ───
export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU', 'ADMIN_SCHOOL', 'KEPALA_SEKOLAH', 'SUPER_ADMIN']);
    const body = await request.json();
    const { id, rating, note, date } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });
    }

    const existing = await db.competencyAssessment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Penilaian tidak ditemukan' }, { status: 404 });
    }

    // School isolation
    if (auth.role !== 'SUPER_ADMIN' && existing.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Only the assessor (or admin) can update
    if (auth.role === 'GURU' && existing.assessedBy !== auth.userId) {
      return NextResponse.json({ error: 'Hanya guru yang menilai yang bisa mengubah' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (rating !== undefined) {
      if (!validateRating(rating)) {
        return NextResponse.json({ error: 'Rating harus integer 1-4' }, { status: 400 });
      }
      data.rating = rating;
    }
    if (note !== undefined) data.note = note;
    if (date !== undefined) data.date = date;

    const updated = await db.competencyAssessment.update({
      where: { id },
      data,
      include: {
        student: { select: { id: true, name: true, nisn: true } },
        assessor: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/competency-assessments', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal memperbarui penilaian' }, { status: 500 });
  }
}
