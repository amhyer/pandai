import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/subjects — List all subjects
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    const subjects = await db.subject.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error('GET /api/subjects error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data mata pelajaran' }, { status: 500 });
  }
}

// POST /api/subjects — Create subject
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, type, sortOrder } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Nama dan kode wajib diisi' }, { status: 400 });
    }

    const existing = await db.subject.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'Kode mata pelajaran sudah ada' }, { status: 400 });
    }

    const subject = await db.subject.create({
      data: {
        name,
        code,
        type: type || 'wajib',
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    console.error('POST /api/subjects error:', error);
    return NextResponse.json({ error: 'Gagal membuat mata pelajaran' }, { status: 500 });
  }
}

// PATCH /api/subjects — Update subject
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, code, type, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });
    }

    const subject = await db.subject.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(type && { type }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(subject);
  } catch (error) {
    console.error('PATCH /api/subjects error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate mata pelajaran' }, { status: 500 });
  }
}

// DELETE /api/subjects — Delete subject
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });
    }

    await db.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/subjects error:', error);
    return NextResponse.json({ error: 'Gagal menghapus mata pelajaran' }, { status: 500 });
  }
}
