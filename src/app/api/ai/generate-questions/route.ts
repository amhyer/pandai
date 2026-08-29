import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, logAiUsage, aiCompletion, buildLanguageInstruction } from '@/lib/ai-helper';
import { logError } from '@/lib/error-log';
import { requireAuth, AuthError } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    const data = await request.json();
    const { subjectId, topicId, count, difficulty, cognitiveLevel, subjectName } = data;

    // P0-01: Use server-verified identity, never trust client-supplied IDs
    const userId = auth.userId;
    const schoolId = auth.schoolId;

    if (!subjectId || !count || !subjectName) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }
    if (!schoolId) {
      return NextResponse.json({ error: 'Sekolah tidak terdeteksi pada akun' }, { status: 400 });
    }

    // Rate limit check (using auth identity)
    const rateCheck = await checkRateLimit(userId, schoolId, 'generate_questions');
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.message }, { status: 429 });
    }

    // Fetch topic name if topicId provided
    let topicName = '';
    if (topicId) {
      const topic = await db.topic.findUnique({ where: { id: topicId } });
      topicName = topic?.name || '';
    }

    const langInstruction = buildLanguageInstruction(subjectName);

    const systemPrompt = `Kamu adalah asisten AI ahli pembuatan soal untuk platform PANDAI. ${langInstruction}

Buat ${count} soal pilihan ganda dengan ketentuan:
- Mata pelajaran: ${subjectName}
${topicName ? `- Topik: ${topicName}` : ''}
- Tingkat kesulitan: ${difficulty}
- Level kognitif: ${cognitiveLevel}

Format output harus JSON array dengan struktur berikut:
[
  {
    "content": "isi soal",
    "options": [
      {"label": "A", "text": "pilihan A"},
      {"label": "B", "text": "pilihan B"},
      {"label": "C", "text": "pilihan C"},
      {"label": "D", "text": "pilihan D"},
      {"label": "E", "text": "pilihan E"}
    ],
    "answer": "A",
    "explanation": "pembahasan singkat"
  }
]

Pastikan hanya mengembalikan JSON array tanpa teks tambahan.`;

    const userPrompt = `Buat ${count} soal pilihan ganda untuk ${subjectName}${topicName ? ` topik ${topicName}` : ''} dengan tingkat kesulitan ${difficulty} dan level kognitif ${cognitiveLevel}.`;

    const raw = await aiCompletion(systemPrompt, userPrompt, true);
    const questions = JSON.parse(raw);

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'AI gagal menghasilkan soal' }, { status: 500 });
    }

    // Save to database
    const created: any[] = [];
    for (const q of questions) {
      const question = await db.question.create({
        data: {
          subjectId,
          topicId: topicId || null,
          schoolId,
          type: 'pg',
          content: q.content,
          options: JSON.stringify(q.options),
          answer: q.answer,
          explanation: q.explanation || null,
          cognitiveLevel,
          difficulty,
          status: 'draft',
          source: 'ai',
          createdBy: userId,
        },
      });
      created.push(question);
    }

    // Log usage (estimate ~200 tokens per question)
    await logAiUsage(userId, schoolId, 'generate_questions', count * 200);

    return NextResponse.json({ success: true, questions: created, count: created.length });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/ai/generate-questions', method: 'POST' });
    console.error('Generate questions error:', error);
    return NextResponse.json({ error: 'Gagal menghasilkan soal' }, { status: 500 });
  }
}
