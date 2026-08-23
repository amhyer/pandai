import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, logAiUsage, aiCompletion } from '@/lib/ai-helper';
import { logError } from '@/lib/error-log';
import { requireAuth, AuthError } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    const data = await request.json();
    const { classId, subjectId } = data;

    // P0-02: Use server-verified identity, never trust client-supplied IDs
    const userId = auth.userId;
    const schoolId = auth.schoolId;

    if (!classId || !subjectId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Rate limit (using auth identity)
    const rateCheck = await checkRateLimit(userId, schoolId, 'analyze_difficulty');
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.message }, { status: 429 });
    }

    // Get class info
    const cls = await db.class.findUnique({ where: { id: classId } });
    const subject = await db.subject.findUnique({ where: { id: subjectId } });

    // Aggregate wrong answers for this class + subject
    const wrongAnswers = await db.studentAnswer.findMany({
      where: {
        studentAttempt: {
          classId,
          schoolId,
        },
        isCorrect: false,
        question: { subjectId },
      },
      include: {
        question: {
          include: {
            subject: true,
            topic: true,
          },
        },
      },
    });

    // Group by topic
    const topicStats: Record<string, { topicName: string; wrongCount: number; questions: string[] }> = {};
    for (const wa of wrongAnswers) {
      const topicId = wa.question.topicId || 'tanpa-topik';
      const topicName = wa.question.topic?.name || 'Tanpa Topik';
      if (!topicStats[topicId]) {
        topicStats[topicId] = { topicName, wrongCount: 0, questions: [] };
      }
      topicStats[topicId].wrongCount++;
      if (topicStats[topicId].questions.length < 3) {
        topicStats[topicId].questions.push(wa.question.content.slice(0, 150));
      }
    }

    if (Object.keys(topicStats).length === 0) {
      return NextResponse.json({
        success: true,
        analysis: 'Belum ada data jawaban salah untuk kelas dan mata pelajaran ini. Analisis tidak dapat dilakukan.',
      });
    }

    const topicSummary = Object.values(topicStats)
      .map((t) => `- ${t.topicName}: ${t.wrongCount} jawaban salah. Contoh soal: ${t.questions.join(' | ')}`)
      .join('\n');

    const totalStudents = await db.user.count({
      where: { classId, role: 'SISWA', isActive: true },
    });

    const systemPrompt = `Kamu adalah analis pendidikan ahli untuk platform PANDAI. Analisis data kesulitan belajar siswa dan berikan rekomendasi pengajaran dalam Bahasa Indonesia yang baik dan terstruktur.`;

    const userPrompt = `Analisis kesulitan belajar berikut:

Kelas: ${cls?.name || 'Tidak diketahui'}
Mata Pelajaran: ${subject?.name || 'Tidak diketahui'}
Jumlah Siswa: ${totalStudents}

Data jawaban salah per topik:
${topicSummary}

Buat analisis yang mencakup:
1. Ringkasan temuan utama
2. Topik yang paling sulit dipahami
3. Kemungkinan penyebab kesulitan
4. Rekomendasi strategi pengajaran`;

    const analysis = await aiCompletion(systemPrompt, userPrompt);
    await logAiUsage(userId, schoolId, 'analyze_difficulty', 500);

    return NextResponse.json({ success: true, analysis });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/ai/analyze-difficulty', method: 'POST' });
    console.error('Analyze difficulty error:', error);
    const msg = error instanceof Error ? error.message : 'Gagal menganalisis kesulitan';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
