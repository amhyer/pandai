import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET exam items for a package
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examPackageId = searchParams.get('examPackageId');

    if (!examPackageId) {
      return NextResponse.json({ error: 'examPackageId is required' }, { status: 400 });
    }

    const items = await db.examItem.findMany({
      where: { examPackageId },
      include: {
        question: { include: { subject: true, topic: true } },
      },
      orderBy: { orderNum: 'asc' },
    });

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data soal paket' }, { status: 500 });
  }
}

// POST add exam item to package
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { examPackageId, questionId, orderNum, points } = data;

    if (!examPackageId || !questionId) {
      return NextResponse.json({ error: 'examPackageId dan questionId wajib' }, { status: 400 });
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
        orderNum: orderNum || 0,
        points: points || 1,
      },
      include: { question: true },
    });

    // Update totalQuestions count on the package
    const totalItems = await db.examItem.count({ where: { examPackageId } });
    await db.examPackage.update({
      where: { id: examPackageId },
      data: { totalQuestions: totalItems },
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Create exam item error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan soal ke paket' }, { status: 500 });
  }
}

// PATCH update exam item (e.g., reorder, change points)
export async function PATCH(request: Request) {
  try {
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    // Check if the exam item's package has attempts
    const item = await db.examItem.findUnique({ where: { id }, select: { examPackageId: true } });
    if (item) {
      const existingAttempts = await db.studentAttempt.count({
        where: { examPackageId: item.examPackageId },
      });
      if (existingAttempts > 0) {
        return NextResponse.json(
          { error: 'Paket sudah memiliki jawaban siswa, tidak dapat diubah', code: 'HAS_ATTEMPTS' },
          { status: 409 }
        );
      }
    }

    const updated = await db.examItem.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal update soal paket' }, { status: 500 });
  }
}

// DELETE remove exam item
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    // Check if the exam item's package has attempts
    const item = await db.examItem.findUnique({ where: { id }, select: { examPackageId: true } });
    if (item) {
      const existingAttempts = await db.studentAttempt.count({
        where: { examPackageId: item.examPackageId },
      });
      if (existingAttempts > 0) {
        return NextResponse.json(
          { error: 'Paket sudah memiliki jawaban siswa, tidak dapat dihapus', code: 'HAS_ATTEMPTS' },
          { status: 409 }
        );
      }
    }

    await db.examItem.delete({ where: { id } });

    // Update totalQuestions count
    if (item) {
      const totalItems = await db.examItem.count({ where: { examPackageId: item.examPackageId } });
      await db.examPackage.update({
        where: { id: item.examPackageId },
        data: { totalQuestions: totalItems },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal hapus soal paket' }, { status: 500 });
  }
}
