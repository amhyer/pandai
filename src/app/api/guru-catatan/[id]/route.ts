import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, AuthError } from '@/lib/auth';

const VALID_CATEGORIES = ['umum', 'apresiasi', 'perbaikan', 'perhatian'];

/**
 * PATCH/DELETE /api/guru-catatan/[id]
 * Hanya guru penulis (atau admin sekolah yang sama) yang bisa edit/hapus.
 */

async function loadScoped(request: Request, id: string) {
  const auth = await requireAuth(request);
  const existing = await db.guruCatatan.findUnique({ where: { id } });
  if (!existing) return { error: NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 }) };

  const isAuthor = existing.teacherId === auth.userId;
  const isSchoolAdmin =
    (auth.role === 'ADMIN_SCHOOL' || auth.role === 'KEPALA_SEKOLAH' || auth.role === 'SUPER_ADMIN') &&
    existing.schoolId === auth.schoolId;

  if (!isAuthor && !isSchoolAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { auth, existing };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await loadScoped(request, id);
    if (res.error) return res.error;
    const { existing } = res;

    const body = (await request.json().catch(() => ({}))) as {
      category?: string;
      content?: string;
      date?: string;
      subjectId?: string | null;
    };

    const data: Record<string, unknown> = {};
    if (body.content !== undefined) {
      const c = body.content.trim();
      if (!c) return NextResponse.json({ error: 'Isi catatan tidak boleh kosong' }, { status: 400 });
      if (c.length > 2000) return NextResponse.json({ error: 'Catatan maksimal 2000 karakter' }, { status: 400 });
      data.content = c;
    }
    if (body.category !== undefined) {
      if (!VALID_CATEGORIES.includes(body.category)) {
        return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 });
      }
      data.category = body.category;
    }
    if (body.date) data.date = body.date;
    if (body.subjectId !== undefined) data.subjectId = body.subjectId;

    const updated = await db.guruCatatan.update({ where: { id: existing.id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/guru-catatan/[id]', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal memperbarui catatan' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await loadScoped(request, id);
    if (res.error) return res.error;
    const { existing } = res;

    await db.guruCatatan.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/guru-catatan/[id]', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal menghapus catatan' }, { status: 500 });
  }
}
