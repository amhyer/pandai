import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, logAiUsage, aiCompletion, buildLanguageInstruction } from '@/lib/ai-helper';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const schoolId = searchParams.get('schoolId');

    if (!userId || !schoolId) {
      return NextResponse.json({ error: 'userId dan schoolId diperlukan' }, { status: 400 });
    }

    const sessions = await db.chatbotSession.findMany({
      where: { userId, schoolId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      subjectId: s.subjectId,
      lastMessage: s.messages[0]?.content || '',
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get chatbot sessions error:', error);
    return NextResponse.json({ error: 'Gagal mengambil sesi chatbot' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { action, userId, schoolId, sessionId, subjectId, content } = data;

    if (!action || !userId || !schoolId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // CREATE SESSION
    if (action === 'create_session') {
      const session = await db.chatbotSession.create({
        data: { userId, schoolId, subjectId: subjectId || null },
      });
      return NextResponse.json({ success: true, session });
    }

    // SEND MESSAGE
    if (action === 'send_message') {
      if (!sessionId || !content) {
        return NextResponse.json({ error: 'sessionId dan content diperlukan' }, { status: 400 });
      }

      // Rate limit
      const rateCheck = await checkRateLimit(userId, schoolId, 'chatbot');
      if (!rateCheck.allowed) {
        return NextResponse.json({ error: rateCheck.message }, { status: 429 });
      }

      // Save user message
      await db.chatMessage.create({
        data: { sessionId, role: 'user', content },
      });

      // Update session title from first message
      const existingMessages = await db.chatMessage.count({ where: { sessionId } });
      if (existingMessages <= 1) {
        await db.chatbotSession.update({
          where: { id: sessionId },
          data: {
            title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
            subjectId: subjectId || undefined,
          },
        });
      }

      // Build RAG context: fetch last 5 materials for the subject
      let ragContext = '';
      if (subjectId) {
        const subject = await db.subject.findUnique({ where: { id: subjectId } });
        const subjectName = subject?.name || 'Mata Pelajaran';
        const materials = await db.material.findMany({
          where: { subjectId, schoolId, status: 'published' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { title: true, content: true },
        });

        if (materials.length > 0) {
          ragContext = `\n\n=== MATERI REFERENSI (${subjectName}) ===\n`;
          for (const m of materials) {
            ragContext += `\n--- ${m.title} ---\n${(m.content || '').slice(0, 800)}\n`;
          }
        }
      }

      // Build conversation history: last 20 messages
      const history = await db.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 20,
        select: { role: true, content: true },
      });

      const langInstruction = subjectId
        ? (() => {
            const subject = subjectId;
            // We'll use a simple check here
            return buildLanguageInstruction('bahasa indonesia');
          })()
        : 'Gunakan Bahasa Indonesia yang baik dan benar.';

      const systemPrompt = `Kamu adalah PANDAI AI, asisten belajar cerdas untuk platform PANDAI. ${langInstruction}

Tugasmu membantu siswa memahami materi pelajaran dengan cara yang mudah dipahami. Berikan penjelasan yang jelas, terstruktur, dan membantu.

Jika ada konteks materi referensi di bawah, gunakan sebagai dasar jawaban.
${ragContext}

Aturan:
- Jawab dengan bahasa yang ramah dan edukatif
- Gunakan contoh jika memungkinkan
- Jika pertanyaan di luar materi, tetap bantu dengan baik
- Format jawaban rapi dengan paragraf pendek`;

      const conversationMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.map((m) => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const zaiMod = await import('z-ai-web-dev-sdk');
      const ZAIClass = zaiMod.default;
      const instance = await ZAIClass.create();

      const result = await instance.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 2048,
      });

      const aiContent = result.choices?.[0]?.message?.content || 'Maaf, saya tidak dapat menjawab pertanyaan tersebut.';

      // Save AI response
      const aiMessage = await db.chatMessage.create({
        data: { sessionId, role: 'assistant', content: aiContent },
      });

      // Update session timestamp
      await db.chatbotSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      // Log usage
      await logAiUsage(userId, schoolId, 'chatbot', 300);

      return NextResponse.json({ success: true, message: aiMessage });
    }

    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Chatbot error:', error);
    const msg = error instanceof Error ? error.message : 'Gagal memproses chatbot';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId diperlukan' }, { status: 400 });
    }

    await db.chatMessage.deleteMany({ where: { sessionId } });
    await db.chatbotSession.delete({ where: { id: sessionId } });

    return NextResponse.json({ success: true, message: 'Sesi berhasil dihapus' });
  } catch (error) {
    console.error('Delete chatbot session error:', error);
    return NextResponse.json({ error: 'Gagal menghapus sesi' }, { status: 500 });
  }
}
