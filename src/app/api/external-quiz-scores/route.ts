import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';

// GET /api/external-quiz-scores — list scores for a material
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get('materialId');
    const studentId = searchParams.get('studentId');
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');

    const where: Record<string, unknown> = {};
    if (materialId) where.materialId = materialId;
    if (studentId) where.studentId = studentId;
    if (schoolId) where.schoolId = schoolId;
    if (classId) where.classId = classId;

    const scores = await db.externalQuizScore.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    // Enrich with student & material info
    const enriched = await Promise.all(
      scores.map(async (s) => {
        const [student, material] = await Promise.all([
          db.user.findUnique({ where: { id: s.studentId }, select: { id: true, name: true, nisn: true } }),
          db.material.findUnique({ where: { id: s.materialId }, select: { id: true, title: true, externalProvider: true } }),
        ]);
        return { ...s, student, material };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    await logError({ error, route: '/api/external-quiz-scores', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil nilai kuis eksternal' }, { status: 500 });
  }
}

// POST /api/external-quiz-scores — create a score entry
export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get('X-User-Role') || '';
    const userId = req.headers.get('X-User-Id') || '';

    const body = await req.json();
    const { materialId, studentId, schoolId, classId, score, note, entryMode } = body;

    if (!materialId || !studentId || score === undefined) {
      return NextResponse.json({ error: 'Data wajib belum lengkap (materialId, studentId, score)' }, { status: 400 });
    }

    if (score < 0 || score > 100) {
      return NextResponse.json({ error: 'Score harus antara 0-100' }, { status: 400 });
    }

    // SELF_REPORTED: only SISWA can submit, must be own studentId
    // TEACHER_ENTERED: only GURU can submit
    if (entryMode === 'SELF_REPORTED') {
      if (role !== 'SISWA') {
        return NextResponse.json({ error: 'Hanya siswa yang dapat melaporkan nilai sendiri' }, { status: 403 });
      }
      // Verify studentId matches logged-in user
      if (studentId !== userId) {
        return NextResponse.json({ error: 'Tidak dapat melaporkan nilai untuk siswa lain' }, { status: 403 });
      }
    } else if (entryMode === 'TEACHER_ENTERED') {
      if (role !== 'GURU' && role !== 'ADMIN_SCHOOL') {
        return NextResponse.json({ error: 'Hanya guru yang dapat menginput nilai siswa' }, { status: 403 });
      }
    }

    // Check if score already exists for this student+material
    const existing = await db.externalQuizScore.findFirst({
      where: { materialId, studentId },
    });

    let result;
    if (existing) {
      // Update existing
      result = await db.externalQuizScore.update({
        where: { id: existing.id },
        data: { score, note: note || null, enteredBy: userId },
      });
    } else {
      // Create new
      result = await db.externalQuizScore.create({
        data: {
          materialId,
          studentId,
          schoolId: schoolId || null,
          classId: classId || null,
          score,
          note: note || null,
          enteredBy: userId,
          entryMode: entryMode || 'SELF_REPORTED',
        },
      });
    }

    return NextResponse.json(result, { status: existing ? 200 : 201 });
  } catch (error) {
    await logError({ error, route: '/api/external-quiz-scores', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menyimpan nilai kuis eksternal' }, { status: 500 });
  }
}

// PATCH /api/external-quiz-scores — teacher updates a score
export async function PATCH(req: NextRequest) {
  try {
    const role = req.headers.get('X-User-Role') || '';
    if (role !== 'GURU' && role !== 'ADMIN_SCHOOL') {
      return NextResponse.json({ error: 'Hanya guru yang dapat mengubah nilai' }, { status: 403 });
    }

    const body = await req.json();
    const { id, score, note } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    if (score !== undefined && (score < 0 || score > 100)) {
      return NextResponse.json({ error: 'Score harus antara 0-100' }, { status: 400 });
    }

    const result = await db.externalQuizScore.update({
      where: { id },
      data: {
        ...(score !== undefined && { score }),
        ...(note !== undefined && { note }),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    await logError({ error, route: '/api/external-quiz-scores', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal mengupdate nilai' }, { status: 500 });
  }
}

// DELETE /api/external-quiz-scores
export async function DELETE(req: NextRequest) {
  try {
    const role = req.headers.get('X-User-Role') || '';
    if (role !== 'GURU' && role !== 'ADMIN_SCHOOL' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Tidak memiliki izin menghapus' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    await db.externalQuizScore.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    await logError({ error, route: '/api/external-quiz-scores', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal menghapus nilai' }, { status: 500 });
  }
}
