import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const subjectId = searchParams.get('subjectId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const global = searchParams.get('global') === 'true';

    const where: any = {};
    if (global) {
      where.schoolId = null;
    } else if (schoolId) {
      where.OR = [{ schoolId }, { schoolId: null }];
    }
    if (subjectId) where.subjectId = subjectId;
    if (type) where.type = type;
    if (status) where.status = status;

    const questions = await db.question.findMany({
      where,
      include: { subject: true, topic: true, creator: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(questions);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil soal' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { subjectId, topicId, schoolId, type, content, options, answer, explanation, cognitiveLevel, difficulty, createdBy } = data;

    const question = await db.question.create({
      data: {
        subjectId, topicId: topicId || null,
        schoolId: schoolId || null,
        type: type || 'pg', content,
        options: options ? JSON.stringify(options) : null,
        answer: answer || null,
        explanation: explanation || null,
        cognitiveLevel: cognitiveLevel || 'C3',
        difficulty: difficulty || 'sedang',
        createdBy,
        status: 'published',
      },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error('Create question error:', error);
    return NextResponse.json({ error: 'Gagal membuat soal' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    if (data.options) data.options = JSON.stringify(data.options);
    const question = await db.question.update({ where: { id }, data });
    return NextResponse.json(question);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal update soal' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    await db.question.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal hapus soal' }, { status: 500 });
  }
}
