import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, logAiUsage, aiCompletion, buildLanguageInstruction } from '@/lib/ai-helper';
import { logError } from '@/lib/error-log';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { schoolId, userId, subjectId, topicId, count, difficulty, cognitiveLevel, subjectName } = data;

    if (!schoolId || !userId || !subjectId || !count || !subjectName) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Rate limit check
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
    logError({ error, route: '/api/ai/generate-questions', method: 'POST' });
    console.error('Generate questions error:', error);
    const msg = error instanceof Error ? error.message : 'Gagal menghasilkan soal';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
