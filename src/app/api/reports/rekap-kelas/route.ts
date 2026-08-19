import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getRekapKelasData } from '@/lib/pdf-report';
import { logError } from '@/lib/error-log';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const term = searchParams.get('term');

    if (!classId || !term) {
      return NextResponse.json({ error: 'classId dan term wajib' }, { status: 400 });
    }

    // School isolation
    if (auth.role !== 'SUPER_ADMIN') {
      const { db } = await import('@/lib/db');
      const klass = await db.class.findUnique({ where: { id: classId }, select: { schoolId: true } });
      if (!klass || (auth.schoolId && klass.schoolId !== auth.schoolId)) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    const data = await getRekapKelasData(classId, term);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/reports/rekap-kelas', method: 'GET' });
    return NextResponse.json({ error: 'Gagal generate rekap' }, { status: 500 });
  }
}
