import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, logAiUsage, aiCompletion, buildLanguageInstruction } from '@/lib/ai-helper';
import { logError } from '@/lib/error-log';
import { requireAuth, AuthError } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await requireAuth(request);
    const data = await request.json();
    const { schoolId, userId, studentId, subjectId } = data;

    if (!schoolId || !userId || !studentId || !subjectId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Rate limit
    const rateCheck = await checkRateLimit(userId, schoolId, 'recommend_questions');
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.message }, { status: 429 });
    }

    // Fetch student info
    const student = await db.user.findUnique({ where: { id: studentId } });
    const subject = await db.subject.findUnique({ where: { id: subjectId } });

    // Find weak topics via wrong answers
    const wrongAnswers = await db.studentAnswer.findMany({
      where: {
        studentAttempt: { userId: studentId, schoolId },
        isCorrect: false,
        question: { subjectId },
      },
      include: {
        question: { include: { topic: true } },
      },
    });

    const topicWrongCount: Record<string, { name: string; count: number }> = {};
    for (const wa of wrongAnswers) {
      const tid = wa.question.topicId || '__no_topic__';
      const tname = wa.question.topic?.name || 'Topik Umum';
      if (!topicWrongCount[tid]) topicWrongCount[tid] = { name: tname, count: 0 };
      topicWrongCount[tid].count++;
    }

    const weakTopics = Object.values(topicWrongCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (weakTopics.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: 'Belum ada data jawaban untuk mata pelajaran ini. Selesaikan beberapa latihan terlebih dahulu untuk mendapatkan rekomendasi yang personal.',
      });
    }

    const langInstruction = buildLanguageInstruction(subject?.name || 'Bahasa Indonesia');

    const systemPrompt = `Kamu adalah tutor AI ahli untuk platform PANDAI. ${langInstruction}

Buat rekomendasi soal latihan yang dipersonalisasi berdasarkan analisis kelemahan siswa. Berikan rekomendasi dalam Bahasa Indonesia yang mudah dipahami.`;

    const userPrompt = `Buat rekomendasi soal latihan untuk siswa berikut:

Nama: ${student?.name || 'Siswa'}
Mata Pelajaran: ${subject?.name || '-'}

Topik yang perlu diperkuat (berdasarkan analisis jawaban salah):
${weakTopics.map((t) => `- ${t.name}: ${t.count} kali salah`).join('\n')}

Buat rekomendasi yang mencakup:
1. 3-5 soal latihan untuk setiap topik lemah (bisa berupa deskripsi soal singkat)
2. Strategi belajar yang disarankan
3. Sumber belajar atau cara memahami topik tersebut`;

    const recommendations = await aiCompletion(systemPrompt, userPrompt);
    await logAiUsage(userId, schoolId, 'recommend_questions', 500);

    return NextResponse.json({ success: true, recommendations });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/ai/recommend-questions', method: 'POST' });
    console.error('Recommend questions error:', error);
    const msg = error instanceof Error ? error.message : 'Gagal membuat rekomendasi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
