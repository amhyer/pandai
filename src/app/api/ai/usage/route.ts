import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const schoolId = searchParams.get('schoolId');

    if (!userId || !schoolId) {
      return NextResponse.json({ error: 'userId dan schoolId diperlukan' }, { status: 400 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Per-action type counts for user
    const userUsage = await db.aiUsageLog.groupBy({
      by: ['actionType'],
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
      _count: { id: true },
      _sum: { tokensUsed: true },
    });

    // School total today
    const schoolTotal = await db.aiUsageLog.count({
      where: {
        schoolId,
        createdAt: { gte: todayStart },
      },
    });

    const actionLabels: Record<string, string> = {
      generate_questions: 'Generate Soal',
      generate_report: 'Deskripsi Rapor',
      chatbot: 'Chatbot',
      analyze_difficulty: 'Analisis Kesulitan',
      summarize_material: 'Ringkasan Materi',
      recommend_questions: 'Rekomendasi Soal',
    };

    const usageBreakdown = userUsage.map((u) => ({
      actionType: u.actionType,
      label: actionLabels[u.actionType] || u.actionType,
      count: u._count.id,
      tokensUsed: u._sum.tokensUsed || 0,
    }));

    return NextResponse.json({
      userUsage: usageBreakdown,
      schoolTotalToday: schoolTotal,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Get usage error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data penggunaan' }, { status: 500 });
  }
}
