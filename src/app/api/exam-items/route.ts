import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

type SafeOption = { label: string; text: string };

function safeOptions(optionsRaw: string | null): SafeOption[] {
  try {
    const parsed = optionsRaw ? JSON.parse(optionsRaw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((o: Record<string, unknown>) => ({
      label: String(o.label ?? ''),
      text: String(o.text ?? ''),
    }));
  } catch {
    return [];
  }
}

/**
 * Returns only fields that are safe to send to the browser.
 * Answer keys, explanations, and the correctness marker inside options
 * are NEVER included.
 */
function toSafeItem(item: any) {
  return {
    id: item.id,
    examPackageId: item.examPackageId,
    orderNum: item.orderNum,
    points: item.points,
    question: item.question
      ? {
          id: item.question.id,
          content: item.question.content,
          options: safeOptions(item.question.options),
          type: item.question.type,
          difficulty: item.question.difficulty,
          cognitiveLevel: item.question.cognitiveLevel,
          subjectId: item.question.subjectId,
          topicId: item.question.topicId,
        }
      : null,
  };
}

// GET exam items for a package
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const examPackageId = searchParams.get('examPackageId');

    if (!examPackageId) {
      return NextResponse.json({ error: 'examPackageId is required' }, { status: 400 });
    }

    // Tenancy enforcement for private exam packages
    const pkg = await db.examPackage.findUnique({
      where: { id: examPackageId },
      select: { id: true, schoolId: true },
    });
    if (!pkg) {
      return NextResponse.json({ error: 'Paket ujian tidak ditemukan' }, { status: 404 });
    }

    // A package owned by a school may only be read by users of that school.
    if (pkg.schoolId && auth.role !== 'SUPER_ADMIN' && auth.schoolId !== pkg.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const items = await db.examItem.findMany({
      where: { examPackageId },
      include: {
        question: { include: { subject: true, topic: true } },
      },
      orderBy: { orderNum: 'asc' },
    });

    return NextResponse.json(items.map(toSafeItem));
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal mengambil data soal paket' }, { status: 500 });
  }
}

// POST add exam item to package
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']);
    const data = await request.json();
    const { examPackageId, questionId, orderNum, points } = data;

    if (!examPackageId || !questionId) {
      return NextResponse.json({ error: 'examPackageId dan questionId wajib' }, { status: 400 });
    }

    const pkg = await db.examPackage.findUnique({
      where: { id: examPackageId },
      select: { schoolId: true },
    });
    if (!pkg) return NextResponse.json({ error: 'Paket ujian tidak ditemukan' }, { status: 404 });

    // Private packages are restricted to the owning school.
    if (pkg.schoolId && auth.role !== 'SUPER_ADMIN') {
      requireSchoolScope(auth, pkg.schoolId);
    }

    // 409 Guard: Check if package already has attempts — cannot modify items
    const existingAttempts = await db.studentAttempt.count({
      where: { examPackageId },
    });
    if (existingAttempts > 0) {
      return NextResponse.json(
        { error: 'Paket sudah memiliki jawaban siswa, tidak dapat ditambah soal baru', code: 'HAS_ATTEMPTS' },
        { status: 409 }
      );
    }

    const item = await db.examItem.create({
      data: {
        examPackageId,
        questionId,
        orderNum: Number.isInteger(orderNum) ? orderNum : 0,
        points: typeof points === 'number' && points > 0 ? points : 1,
      },
      include: { question: true },
    });

    const totalItems = await db.examItem.count({ where: { examPackageId } });
    await db.examPackage.update({
      where: { id: examPackageId },
      data: { totalQuestions: totalItems },
    });

    return NextResponse.json(toSafeItem(item));
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Create exam item error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan soal ke paket' }, { status: 500 });
  }
}

// PATCH update exam item (e.g., reorder, change points)
export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']);
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    const item = await db.examItem.findUnique({
      where: { id },
      select: { id: true, examPackageId: true },
    });
    if (!item) return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });

    const pkg = await db.examPackage.findUnique({
      where: { id: item.examPackageId },
      select: { schoolId: true },
    });
    if (pkg?.schoolId && auth.role !== 'SUPER_ADMIN') {
      requireSchoolScope(auth, pkg.schoolId);
    }

    const existingAttempts = await db.studentAttempt.count({
      where: { examPackageId: item.examPackageId },
    });
    if (existingAttempts > 0) {
      return NextResponse.json(
        { error: 'Paket sudah memiliki jawaban siswa, tidak dapat diubah', code: 'HAS_ATTEMPTS' },
        { status: 409 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (data.orderNum !== undefined && Number.isInteger(data.orderNum)) updateData.orderNum = data.orderNum;
    if (data.points !== undefined && typeof data.points === 'number' && data.points > 0) updateData.points = data.points;

    const updated = await db.examItem.update({ where: { id }, data: updateData });
    return NextResponse.json(toSafeItem(updated));
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal update soal paket' }, { status: 500 });
  }
}

// DELETE remove exam item
export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    const item = await db.examItem.findUnique({ where: { id }, select: { id: true, examPackageId: true } });
    if (!item) return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });

    const pkg = await db.examPackage.findUnique({
      where: { id: item.examPackageId },
      select: { schoolId: true },
    });
    if (pkg?.schoolId && auth.role !== 'SUPER_ADMIN') {
      requireSchoolScope(auth, pkg.schoolId);
    }

    const existingAttempts = await db.studentAttempt.count({
      where: { examPackageId: item.examPackageId },
    });
    if (existingAttempts > 0) {
      return NextResponse.json(
        { error: 'Paket sudah memiliki jawaban siswa, tidak dapat dihapus', code: 'HAS_ATTEMPTS' },
        { status: 409 }
      );
    }

    await db.examItem.delete({ where: { id } });

    const totalItems = await db.examItem.count({ where: { examPackageId: item.examPackageId } });
    await db.examPackage.update({
      where: { id: item.examPackageId },
      data: { totalQuestions: totalItems },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal hapus soal paket' }, { status: 500 });
  }
}
