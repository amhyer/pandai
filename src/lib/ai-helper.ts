import { ZAI } from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════
// LAZY SINGLETON for ZAI SDK
// ═══════════════════════════════════════════════════════════════

let _zai: ZAI | null = null;

export function getZai(): ZAI {
  if (!_zai) {
    _zai = new ZAI();
  }
  return _zai;
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMIT CHECK
// ═══════════════════════════════════════════════════════════════

const ACTION_LIMIT_MAP: Record<string, keyof {
  generateQuestionsPerDay: number;
  generateReportPerDay: number;
  chatbotPerDay: number;
  analyzeDifficultyPerDay: number;
  summarizeMaterialPerDay: number;
  recommendQuestionsPerDay: number;
}> = {
  generate_questions: 'generateQuestionsPerDay',
  generate_report: 'generateReportPerDay',
  chatbot: 'chatbotPerDay',
  analyze_difficulty: 'analyzeDifficultyPerDay',
  summarize_material: 'summarizeMaterialPerDay',
  recommend_questions: 'recommendQuestionsPerDay',
};

export async function checkRateLimit(
  userId: string,
  schoolId: string,
  actionType: string
): Promise<{ allowed: boolean; message?: string }> {
  // Get AI config for school
  const config = await db.aiConfig.findUnique({ where: { schoolId } });
  if (!config) {
    // Auto-create config if not exists
    await db.aiConfig.create({ data: { schoolId } });
    return { allowed: true };
  }

  if (!config.enabled) {
    return { allowed: false, message: 'Fitur AI dinonaktifkan untuk sekolah ini.' };
  }

  // Check school daily aggregate limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const schoolTotalToday = await db.aiUsageLog.count({
    where: {
      schoolId,
      createdAt: { gte: todayStart },
    },
  });

  if (schoolTotalToday >= config.schoolDailyLimit) {
    return { allowed: false, message: `Batas harian sekolah (${config.schoolDailyLimit}) telah tercapai.` };
  }

  // Check per-action user limit
  const limitField = ACTION_LIMIT_MAP[actionType];
  if (limitField) {
    const userActionToday = await db.aiUsageLog.count({
      where: {
        userId,
        actionType,
        createdAt: { gte: todayStart },
      },
    });

    const limit = config[limitField] as number;
    if (userActionToday >= limit) {
      const actionLabels: Record<string, string> = {
        generate_questions: 'Generate Soal',
        generate_report: 'Deskripsi Rapor',
        chatbot: 'Chatbot',
        analyze_difficulty: 'Analisis Kesulitan',
        summarize_material: 'Ringkasan Materi',
        recommend_questions: 'Rekomendasi Soal',
      };
      return {
        allowed: false,
        message: `Batas harian ${actionLabels[actionType] || actionType} (${limit}) telah tercapai.`,
      };
    }
  }

  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════
// LOG AI USAGE
// ═══════════════════════════════════════════════════════════════

export async function logAiUsage(
  userId: string,
  schoolId: string,
  actionType: string,
  tokensUsed: number
): Promise<void> {
  await db.aiUsageLog.create({
    data: { userId, schoolId, actionType, tokensUsed },
  });
}

// ═══════════════════════════════════════════════════════════════
// AI CHAT COMPLETION WRAPPER
// ═══════════════════════════════════════════════════════════════

export async function aiCompletion(
  systemPrompt: string,
  userPrompt: string,
  jsonMode?: boolean
): Promise<string> {
  const zai = getZai();
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ];

  const result = await zai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 4096,
    response_format: jsonMode ? { type: 'json_object' } : undefined,
  });

  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI tidak memberikan respons.');
  }
  return content;
}

// ═══════════════════════════════════════════════════════════════
// LANGUAGE DETECTION
// ═══════════════════════════════════════════════════════════════

const ENGLISH_SUBJECTS = [
  'bahasa inggris',
  'b. inggris',
  'bing',
  'english',
];

export function getSubjectLanguage(subjectName: string): string {
  const lower = subjectName.toLowerCase().trim();
  if (ENGLISH_SUBJECTS.some((e) => lower.includes(e))) {
    return 'en';
  }
  return 'id';
}

export function buildLanguageInstruction(subjectName: string): string {
  const lang = getSubjectLanguage(subjectName);
  if (lang === 'en') {
    return 'Gunakan Bahasa Inggris dalam semua soal, pilihan jawaban, dan pembahasan. Semua konten harus dalam Bahasa Inggris.';
  }
  return 'Gunakan Bahasa Indonesia dalam semua soal, pilihan jawaban, dan pembahasan. Semua konten harus dalam Bahasa Indonesia yang baik dan benar.';
}
