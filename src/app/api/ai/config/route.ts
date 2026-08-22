import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';
import { logAccess } from '@/lib/audit-log';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 });
    }

    // IDOR fix: only ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN can read AI config
    if (auth.role === 'SISWA' || auth.role === 'ORANG_TUA') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    requireSchoolScope(auth, schoolId);
    try { await logAccess(auth, { action: 'READ', resourceType: 'ai-config' }); } catch {}

    let config = await db.aiConfig.findUnique({ where: { schoolId } });
    if (!config) {
      config = await db.aiConfig.create({ data: { schoolId } });
    }

    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Get AI config error:', error);
    return NextResponse.json({ error: 'Gagal mengambil konfigurasi AI' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth(request);
    const data = await request.json();
    const { schoolId, ...updateData } = data;
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 });
    }

    // IDOR fix: only ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN can modify AI config
    if (auth.role === 'SISWA' || auth.role === 'ORANG_TUA' || auth.role === 'GURU') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    requireSchoolScope(auth, schoolId);
    try { await logAccess(auth, { action: 'UPDATE', resourceType: 'ai-config' }); } catch {}

    // Clean updateData - only allow known fields
    const allowedFields = [
      'generateQuestionsPerDay',
      'generateReportPerDay',
      'chatbotPerDay',
      'analyzeDifficultyPerDay',
      'summarizeMaterialPerDay',
      'recommendQuestionsPerDay',
      'schoolDailyLimit',
      'enabled',
    ];
    const cleanData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        cleanData[key] = updateData[key];
      }
    }

    const config = await db.aiConfig.upsert({
      where: { schoolId },
      update: cleanData,
      create: { schoolId, ...cleanData },
    });

    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Update AI config error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate konfigurasi AI' }, { status: 500 });
  }
}
