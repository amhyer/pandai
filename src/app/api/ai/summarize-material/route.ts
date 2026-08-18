import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, logAiUsage, aiCompletion } from '@/lib/ai-helper';
import { logError } from '@/lib/error-log';
import { requireAuth, AuthError } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await requireAuth(request);
    const data = await request.json();
    const { schoolId, userId, title, content } = data;

    if (!schoolId || !userId || !title || !content) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (content.length < 50) {
      return NextResponse.json({ error: 'Konten terlalu pendek untuk diringkas' }, { status: 400 });
    }

    // Rate limit
    const rateCheck = await checkRateLimit(userId, schoolId, 'summarize_material');
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.message }, { status: 429 });
    }

    // Truncate content if too long (keep ~6000 chars)
    const truncatedContent = content.length > 6000
      ? content.slice(0, 6000) + '\n\n[...konten dipotong karena terlalu panjang...]'
      : content;

    const systemPrompt = `Kamu adalah asisten AI untuk platform PANDAI yang ahli dalam merangkum materi pelajaran. Buat ringkasan dalam Bahasa Indonesia yang jelas, terstruktur, dan mudah dipahami siswa.`;

    const userPrompt = `Ringkas materi berikut:

Judul: ${title}

${truncatedContent}

Buat output dengan format:

## Ringkasan
[ringkasan 3-4 paragraf]

## Poin Penting
- [poin 1]
- [poin 2]
- [poin 3]
- ...

## Kata Kunci
[kata kunci yang penting dari materi]`;

    const summary = await aiCompletion(systemPrompt, userPrompt);
    await logAiUsage(userId, schoolId, 'summarize_material', 600);

    return NextResponse.json({ success: true, summary });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/ai/summarize-material', method: 'POST' });
    console.error('Summarize material error:', error);
    const msg = error instanceof Error ? error.message : 'Gagal meringkas materi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
