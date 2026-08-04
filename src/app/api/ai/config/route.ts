import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 });
    }

    let config = await db.aiConfig.findUnique({ where: { schoolId } });
    if (!config) {
      config = await db.aiConfig.create({ data: { schoolId } });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Get AI config error:', error);
    return NextResponse.json({ error: 'Gagal mengambil konfigurasi AI' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    const { schoolId, ...updateData } = data;
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 });
    }

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
    console.error('Update AI config error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate konfigurasi AI' }, { status: 500 });
  }
}
