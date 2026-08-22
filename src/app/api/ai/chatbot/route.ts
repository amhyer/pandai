import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, logAiUsage, aiCompletion, buildLanguageInstruction } from '@/lib/ai-helper';
import { logError } from '@/lib/error-log';
import { requireAuth, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';
import { logAccess } from '@/lib/audit-log';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    try { await logAccess(auth, { action: 'READ', resourceType: 'ai-chatbot' }); } catch {}
    const { searchParams } = new URL(request.url);
    // IDOR fix: reject if userId param differs from session
    const queryUserId = searchParams.get('userId');
    if (queryUserId && queryUserId !== auth.userId) {
      return NextResponse.json({ error: 'Tidak diizinkan mengakses data pengguna lain' }, { status: 403 });
    }
    const userId = auth.userId;
    const schoolId = searchParams.get('schoolId') || auth.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 });
    }
    requireSchoolScope(auth, schoolId);

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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/ai/chatbot', method: 'GET' });
    console.error('Get chatbot sessions error:', error);
    return NextResponse.json({ error: 'Gagal mengambil sesi chatbot' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    const data = await request.json();
    // IDOR fix: force userId from auth, ignore body param
    const effectiveUserId = auth.userId;
    const { action, schoolId, sessionId, subjectId, content } = data;
    try { await logAccess(auth, { action: 'CREATE', resourceType: 'ai-chatbot', detail: action }); } catch {}
    const effectiveSchoolId = schoolId || auth.schoolId;

    if (!action || !effectiveSchoolId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }
    requireSchoolScope(auth, effectiveSchoolId);

    // CREATE SESSION
    if (action === 'create_session') {
      const session = await db.chatbotSession.create({
        data: { userId: effectiveUserId, schoolId: effectiveSchoolId, subjectId: subjectId || null },
      });
      return NextResponse.json({ success: true, session });
    }

    // SEND MESSAGE
    if (action === 'send_message') {
      if (!sessionId || !content) {
        return NextResponse.json({ error: 'sessionId dan content diperlukan' }, { status: 400 });
      }

      // Rate limit
      const rateCheck = await checkRateLimit(effectiveUserId, effectiveSchoolId, 'chatbot');
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
          where: { subjectId, schoolId: effectiveSchoolId, status: 'published' },
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
      await logAiUsage(effectiveUserId, effectiveSchoolId, 'chatbot', 300);

      return NextResponse.json({ success: true, message: aiMessage });
    }

    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/ai/chatbot', method: 'POST' });
    console.error('Chatbot error:', error);
    const msg = error instanceof Error ? error.message : 'Gagal memproses chatbot';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId diperlukan' }, { status: 400 });
    }

    // IDOR fix: verify the session belongs to the current user
    const session = await db.chatbotSession.findUnique({ where: { id: sessionId }, select: { userId: true, schoolId: true } });
    if (!session) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    if (session.userId !== auth.userId) {
      return NextResponse.json({ error: 'Tidak diizinkan menghapus sesi orang lain' }, { status: 403 });
    }
    if (session.schoolId) requireSchoolScope(auth, session.schoolId);
    try { await logAccess(auth, { action: 'DELETE', resourceType: 'ai-chatbot', resourceId: sessionId }); } catch {}

    await db.chatMessage.deleteMany({ where: { sessionId } });
    await db.chatbotSession.delete({ where: { id: sessionId } });

    return NextResponse.json({ success: true, message: 'Sesi berhasil dihapus' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/ai/chatbot', method: 'DELETE' });
    console.error('Delete chatbot session error:', error);
    return NextResponse.json({ error: 'Gagal menghapus sesi' }, { status: 500 });
  }
}
