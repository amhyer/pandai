import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { logError } from '@/lib/error-log';

// ─── GET: List grade components ───
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const classId = searchParams.get('classId');
    const term = searchParams.get('term');

    const where: Record<string, unknown> = {};
    if (auth.role !== 'SUPER_ADMIN' && auth.schoolId) {
      where.schoolId = auth.schoolId;
    }
    if (subjectId) where.subjectId = subjectId;
    if (classId) where.classId = classId;
    if (term) where.term = term;

    const components = await db.gradeComponent.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true } },
        class_: { select: { id: true, name: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Calculate total weight for each group
    return NextResponse.json(components);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/grade-components', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil komponen' }, { status: 500 });
  }
}

// ─── POST: Create grade component (ADMIN_SCHOOL, SUPER_ADMIN) ───
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['ADMIN_SCHOOL', 'SUPER_ADMIN']);
    const body = await request.json();
    const { name, weight, subjectId, classId, term, sortOrder } = body;

    if (!name || weight === undefined || !term) {
      return NextResponse.json({ error: 'name, weight, dan term wajib diisi' }, { status: 400 });
    }

    if (weight < 0 || weight > 100) {
      return NextResponse.json({ error: 'Weight harus 0-100' }, { status: 400 });
    }

    const schoolId = auth.role === 'SUPER_ADMIN' ? body.schoolId : auth.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId wajib' }, { status: 400 });
    }

    const component = await db.gradeComponent.create({
      data: {
        schoolId,
        name,
        weight,
        subjectId: subjectId || null,
        classId: classId || null,
        term,
        sortOrder: sortOrder || 0,
        createdBy: auth.userId,
      },
    });

    // Check total weight (warning only)
    const whereGroup: Record<string, unknown> = { schoolId, term };
    if (subjectId) whereGroup.subjectId = subjectId;
    if (classId) whereGroup.classId = classId;

    const allComponents = await db.gradeComponent.findMany({ where: whereGroup });
    const totalWeight = allComponents.reduce((sum, c) => sum + c.weight, 0);

    return NextResponse.json({
      ...component,
      _meta: {
        totalWeight,
        is100: totalWeight === 100,
        warning: totalWeight !== 100 ? `Total bobot saat ini: ${totalWeight}% (idealnya 100%)` : undefined,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/grade-components', method: 'POST' });
    return NextResponse.json({ error: 'Gagal membuat komponen' }, { status: 500 });
  }
}

// ─── PATCH: Update grade component ───
export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, ['ADMIN_SCHOOL', 'SUPER_ADMIN']);
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const existing = await db.gradeComponent.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Komponen tidak ditemukan' }, { status: 404 });
    if (auth.role !== 'SUPER_ADMIN' && existing.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const updated = await db.gradeComponent.update({ where: { id }, data });

    // Recalculate total weight warning
    const whereGroup: Record<string, unknown> = { schoolId: existing.schoolId, term: updated.term || existing.term };
    if (updated.subjectId || existing.subjectId) whereGroup.subjectId = updated.subjectId || existing.subjectId;
    if (updated.classId || existing.classId) whereGroup.classId = updated.classId || existing.classId;
    const allComponents = await db.gradeComponent.findMany({ where: whereGroup });
    const totalWeight = allComponents.reduce((sum, c) => sum + c.weight, 0);

    return NextResponse.json({
      ...updated,
      _meta: { totalWeight, is100: totalWeight === 100, warning: totalWeight !== 100 ? `Total bobot: ${totalWeight}%` : undefined },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/grade-components', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal update komponen' }, { status: 500 });
  }
}

// ─── DELETE: Remove grade component ───
export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ['ADMIN_SCHOOL', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    const existing = await db.gradeComponent.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Komponen tidak ditemukan' }, { status: 404 });
    if (auth.role !== 'SUPER_ADMIN' && existing.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    await db.gradeComponent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/grade-components', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal hapus komponen' }, { status: 500 });
  }
}
