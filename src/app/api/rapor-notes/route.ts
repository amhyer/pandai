import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { logAccess } from '@/lib/audit-log';
import { getSchoolFilter } from '@/lib/scope';

// GET /api/rapor-notes — Get rapor notes
export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH', 'SISWA', 'ORANG_TUA']);
    try { await logAccess(auth, { action: 'READ', resourceType: 'rapor-notes' }); } catch {}

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const term = searchParams.get('term');

    const where: Record<string, unknown> = {};

    // Role-based filtering
    if (auth.role === 'SISWA') {
      where.studentId = auth.userId;
      if (auth.schoolId) where.schoolId = auth.schoolId;
    } else if (auth.role === 'ORANG_TUA') {
      const children = await db.user.findMany({
        where: { parentId: auth.userId, schoolId: auth.schoolId },
        select: { id: true },
      });
      if (children.length === 0) return NextResponse.json([]);
      where.studentId = { in: children.map(c => c.id) };
      where.schoolId = auth.schoolId;
    } else {
      const schoolF = getSchoolFilter(auth);
      if (schoolF) where.schoolId = schoolF;
      if (studentId) where.studentId = studentId;
      if (classId) where.classId = classId;
    }

    if (term) where.term = term;

    const notes = await db.raporNote.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, nisn: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    return NextResponse.json(notes);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/rapor-notes error:', error);
    return NextResponse.json({ error: 'Gagal mengambil catatan rapor' }, { status: 500 });
  }
}

// POST /api/rapor-notes — Create or update rapor note (GURU/ADMIN only)
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']);
    try { await logAccess(auth, { action: 'CREATE', resourceType: 'rapor-notes' }); } catch {}

    const body = await request.json();
    const { studentId, classId, term, note } = body;

    if (!studentId || !term || !note) {
      return NextResponse.json({ error: 'studentId, term, dan note wajib diisi' }, { status: 400 });
    }

    // Verify student exists and get schoolId
    const student = await db.user.findUnique({
      where: { id: studentId },
      select: { id: true, schoolId: true },
    });
    if (!student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    // School scope check
    const schoolF = getSchoolFilter(auth);
    if (schoolF && student.schoolId !== schoolF) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
    }

    const schoolId = student.schoolId || auth.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID tidak ditemukan' }, { status: 400 });
    }

    // Upsert rapor note
    const raporNote = await db.raporNote.upsert({
      where: {
        studentId_schoolId_term: { studentId, schoolId, term },
      },
      create: {
        studentId,
        schoolId,
        classId: classId || student.schoolId ? undefined : null,
        term,
        note,
        createdBy: auth.userId,
      },
      update: {
        note,
        createdBy: auth.userId,
      },
      include: {
        student: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(raporNote);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/rapor-notes error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan catatan rapor' }, { status: 500 });
  }
}

// DELETE /api/rapor-notes — Delete rapor note
export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    try { await logAccess(auth, { action: 'DELETE', resourceType: 'rapor-notes' }); } catch {}

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const existing = await db.raporNote.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 });

    // School scope check
    const schoolF = getSchoolFilter(auth);
    if (schoolF && existing.schoolId !== schoolF) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
    }

    await db.raporNote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('DELETE /api/rapor-notes error:', error);
    return NextResponse.json({ error: 'Gagal menghapus catatan rapor' }, { status: 500 });
  }
}
