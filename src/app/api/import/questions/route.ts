import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';
import mammoth from 'mammoth';

// ─── FORMAT YANG DIDUKUT ────────────────────────────────────────
//
//  ▸ PG (Pilihan Ganda):
//    1. Isi soal ...
//    A. Pilihan A
//    B. Pilihan B
//    C. Pilihan C
//    D. Pilihan D
//    Jawaban: A
//    Pembahasan: ... (opsional)
//
//  ▸ Isian Singkat:
//    1. Isi soal ...
//    Jawaban: jawaban singkat
//
//  ▸ Esai/Uraian:
//    1. Isi soal ...
//    Kunci Jawaban: ... (opsional)
//    Pembahasan: ... (opsional)
//
//  ▸ Bisa juga campuran dalam satu dokumen
//  ▸ Nomor soal di-reset otomatis jika ada heading/tebal baru
// ──────────────────────────────────────────────────────────────

interface ParsedQuestion {
  type: 'pg' | 'isian' | 'esai';
  content: string;
  options: { label: string; text: string; isCorrect: boolean }[] | null;
  answer: string | null;
  explanation: string | null;
}

/**
 * Extract plain text from .docx file using mammoth
 */
async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Parse extracted text into structured questions.
 * Supports auto-detection of PG, isian, and esai.
 */
function parseQuestions(text: string): ParsedQuestion[] {
  // Normalize line endings and split
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const questions: ParsedQuestion[] = [];
  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let currentOptions: { label: string; text: string }[] = [];
  let currentContentLines: string[] = [];

  function flushQuestion() {
    if (!currentQuestion || currentContentLines.length === 0) return;

    const content = currentContentLines.join(' ').trim();
    if (!content) return;

    const q: ParsedQuestion = {
      type: currentQuestion.type || 'esai',
      content,
      options: null,
      answer: currentQuestion.answer || null,
      explanation: currentQuestion.explanation || null,
    };

    // Build options for PG
    if (currentOptions.length > 0 && currentQuestion.type === 'pg') {
      const correctAnswer = (currentQuestion.answer || '').toUpperCase().trim();
      q.options = currentOptions.map((opt) => ({
        label: opt.label,
        text: opt.text,
        isCorrect: opt.label.toUpperCase() === correctAnswer,
      }));
    }

    questions.push(q);
    currentQuestion = null;
    currentOptions = [];
    currentContentLines = [];
  }

  // Regex patterns
  const pgNumberRe = /^(\d+)\s*[.)]\s*/;         // "1. " or "1) "
  const optionRe = /^[A-Ea-e]\s*[.)]\s*/;         // "A. " or "A) "
  const answerRe = /^jawaban\s*:\s*/i;
  const explanationRe = /^(pembahasan|kunci jawaban)\s*:\s*/i;

  let detectedType: 'pg' | 'isian' | 'esai' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for new question number (e.g., "1. ", "2) ")
    const numMatch = trimmed.match(pgNumberRe);
    if (numMatch) {
      // Flush previous question
      flushQuestion();

      // Start new question
      const questionText = trimmed.replace(pgNumberRe, '').trim();
      currentContentLines = [questionText];
      currentQuestion = { type: 'esai' }; // default, will be auto-detected
      currentOptions = [];
      detectedType = null;
      continue;
    }

    // Check for option (A-E)
    const optMatch = trimmed.match(optionRe);
    if (optMatch && currentQuestion) {
      const label = trimmed.charAt(0).toUpperCase();
      const optText = trimmed.replace(optionRe, '').trim();
      currentOptions.push({ label, text: optText });
      if (!detectedType) detectedType = 'pg';
      currentQuestion.type = 'pg';
      continue;
    }

    // Check for answer
    const ansMatch = trimmed.match(answerRe);
    if (ansMatch && currentQuestion) {
      currentQuestion.answer = trimmed.replace(answerRe, '').trim();
      if (!detectedType) detectedType = 'isian';
      if (detectedType !== 'pg') {
        currentQuestion.type = 'isian';
      }
      continue;
    }

    // Check for explanation
    const expMatch = trimmed.match(explanationRe);
    if (expMatch && currentQuestion) {
      currentQuestion.explanation = trimmed.replace(explanationRe, '').trim();
      continue;
    }

    // Regular text — append to current question content
    if (currentContentLines.length > 0) {
      currentContentLines.push(trimmed);
    }
  }

  // Flush last question
  flushQuestion();

  // Post-process: questions without options that have answer should be 'isian'
  for (const q of questions) {
    if (q.type === 'pg' && (!q.options || q.options.length === 0)) {
      q.type = 'esai';
      q.options = null;
    }
    if (q.type === 'pg' && q.options) {
      // Ensure at least one option is marked correct
      const hasCorrect = q.options.some((o) => o.isCorrect);
      if (!hasCorrect && q.answer) {
        const correctLabel = q.answer.toUpperCase().charAt(0);
        const matchOpt = q.options.find((o) => o.label === correctLabel);
        if (matchOpt) matchOpt.isCorrect = true;
      }
    }
  }

  return questions;
}

// POST /api/import/questions — Upload .docx, auto-parse, save to DB
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const subjectId = formData.get('subjectId') as string | null;
    let schoolId = (formData.get('schoolId') as string | null) || null;
    const topicId = formData.get('topicId') as string | null;

    // P2: Enforce school scope — non-SA must import to their own school
    const effectiveSchoolId = getSchoolFilter(auth) || schoolId;
    if (schoolId) requireSchoolScope(auth, schoolId);
    schoolId = effectiveSchoolId || null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'File wajib diupload' }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
      return NextResponse.json(
        { success: false, message: 'Hanya file .docx yang didukung' },
        { status: 400 }
      );
    }

    if (!subjectId) {
      return NextResponse.json(
        { success: false, message: 'subjectId diperlukan' },
        { status: 400 }
      );
    }

    const createdBy = auth.userId;

    // Extract text from Word
    const text = await extractText(file);

    if (text.trim().length < 10) {
      return NextResponse.json(
        { success: false, message: 'File kosong atau tidak bisa dibaca' },
        { status: 400 }
      );
    }

    // Parse questions
    const parsed = parseQuestions(text);

    if (parsed.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tidak ada soal yang terdeteksi. Pastikan format soal benar.',
        rawTextPreview: text.substring(0, 500),
        formatGuide: [
          'Format PG:',
          '  1. Pertanyaan...',
          '  A. Pilihan A',
          '  B. Pilihan B',
          '  C. Pilihan C',
          '  D. Pilihan D',
          '  Jawaban: A',
          '',
          'Format Esai:',
          '  1. Pertanyaan...',
          '  Kunci Jawaban: jawaban',
          '  Pembahasan: penjelasan',
        ].join('\n'),
      });
    }

    // Save parsed questions to DB
    const created: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const q = parsed[i];
      try {
        const question = await db.question.create({
          data: {
            subjectId,
            topicId: topicId || null,
            schoolId: schoolId || null,
            type: q.type,
            content: q.content,
            options: q.options ? JSON.stringify(q.options) : null,
            answer: q.answer,
            explanation: q.explanation,
            cognitiveLevel: 'C3',
            difficulty: 'sedang',
            status: 'draft',
            source: 'import_word',
            createdBy,
          },
        });
        created.push(question);
      } catch (err: unknown) {
        errors.push(`Soal ${i + 1}: Gagal menyimpan soal ke database`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${created.length} soal berhasil diimpor, ${errors.length} gagal.`,
      totalParsed: parsed.length,
      imported: created.length,
      failed: errors.length,
      questions: parsed.map((q, i) => ({
        no: i + 1,
        type: q.type,
        content: q.content.substring(0, 100) + (q.content.length > 100 ? '...' : ''),
        optionsCount: q.options?.length || 0,
        answer: q.answer,
        id: created[i]?.id || null,
        error: errors[i] || null,
      })),
      ...(errors.length > 0 && { errors }),
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) { return NextResponse.json({ success: false, message: error.message }, { status: error.status }); }
    logError({ error, route: '/api/import/questions', method: 'POST' });
    return NextResponse.json(
      { success: false, message: 'Gagal mengimpor soal' },
      { status: 500 }
    );
  }
}
