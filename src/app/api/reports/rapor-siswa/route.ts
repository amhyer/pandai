import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getRaporSiswaData, generateRaporSiswaPDF } from '@/lib/pdf-report';
import { logError } from '@/lib/error-log';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const term = searchParams.get('term');
    const format = searchParams.get('format');

    if (!studentId || !term) {
      return NextResponse.json({ error: 'studentId dan term wajib' }, { status: 400 });
    }

    // Ownership checks
    if (auth.role === 'SISWA' && auth.userId !== studentId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    if (auth.role === 'ORANG_TUA') {
      const { db } = await import('@/lib/db');
      const child = await db.user.findFirst({ where: { parentId: auth.userId, id: studentId, schoolId: auth.schoolId } });
      if (!child) return NextResponse.json({ error: 'Bukan anak Anda' }, { status: 403 });
    }

    if (format === 'pdf') {
      const pdf = await generateRaporSiswaPDF(studentId, term);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="rapor-${studentId.substring(0, 8)}-${term}.pdf"`,
        },
      });
    }

    const data = await getRaporSiswaData(studentId, term);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/reports/rapor-siswa', method: 'GET' });
    return NextResponse.json({ error: 'Gagal generate rapor' }, { status: 500 });
  }
}
