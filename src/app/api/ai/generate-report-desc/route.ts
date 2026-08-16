import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, logAiUsage, aiCompletion } from '@/lib/ai-helper';
import { logError } from '@/lib/error-log';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { schoolId, userId, studentId } = data;

    if (!schoolId || !userId || !studentId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Rate limit
    const rateCheck = await checkRateLimit(userId, schoolId, 'generate_report');
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.message }, { status: 429 });
    }

    // Fetch student data
    const student = await db.user.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    // Fetch attempt data
    const attempts = await db.studentAttempt.findMany({
      where: { userId: studentId, schoolId },
      include: {
        answers: {
          include: {
            question: { include: { subject: true, topic: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Fetch attendance data
    const attendance = await db.attendance.findMany({
      where: { studentId, schoolId },
      orderBy: { date: 'desc' },
      take: 30,
    });

    // Fetch character reports
    const charReports = await db.characterReport.findMany({
      where: { studentId, schoolId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Build summary data
    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts
      : 0;

    const attendanceSummary = {
      hadir: attendance.filter((a) => a.status === 'hadir').length,
      izin: attendance.filter((a) => a.status === 'izin').length,
      sakit: attendance.filter((a) => a.status === 'sakit').length,
      alpa: attendance.filter((a) => a.status === 'alpa').length,
    };

    // Per-subject performance
    const subjectPerf: Record<string, { name: string; avg: number; attempts: number }> = {};
    for (const att of attempts) {
      for (const ans of att.answers) {
        const subj = ans.question.subject;
        if (!subjectPerf[subj.id]) {
          subjectPerf[subj.id] = { name: subj.name, avg: 0, attempts: 0 };
        }
        subjectPerf[subj.id].attempts++;
        subjectPerf[subj.id].avg += ans.isCorrect ? 1 : 0;
      }
    }
    // Normalize
    for (const key of Object.keys(subjectPerf)) {
      const sp = subjectPerf[key];
      sp.avg = sp.attempts > 0 ? Math.round((sp.avg / sp.attempts) * 100) : 0;
    }

    const habitLabels: Record<string, string> = {
      proaktif: 'Bersikap Proaktif',
      tujuan: 'Memulai dengan Tujuan',
      prioritas: 'Prioritas Utama Dahulu',
      menang: 'Berpikir Menang-Menang',
      mengerti: 'Mengerti lalu Dierti',
      sinergi: 'Bersinergi',
      asah: 'Asah Gergaji',
    };

    const habitSummary = charReports.map((cr) => {
      const labels: Record<number, string> = { 1: 'Kurang', 2: 'Cukup', 3: 'Baik', 4: 'Sangat Baik', 5: 'Luar Biasa' };
      return `- ${habitLabels[cr.habit] || cr.habit}: ${labels[cr.rating] || cr.rating}/5${cr.note ? ` (${cr.note})` : ''}`;
    }).join('\n');

    const systemPrompt = `Kamu adalah guru berpengalaman yang membuat deskripsi rapor untuk platform PANDAI. Buat deskripsi rapor dalam Bahasa Indonesia yang profesional, positif, dan membangun.`;

    const userPrompt = `Buat deskripsi rapor untuk siswa berikut:

Nama: ${student.name}
Kelas: ${student.class?.name || '-'}
Jenis Kelamin: ${student.jk === 'L' ? 'Laki-laki' : student.jk === 'P' ? 'Perempuan' : '-'}

Data Akademik:
- Total pengerjaan: ${totalAttempts}
- Rata-rata skor: ${avgScore.toFixed(1)}%
- Performa per mapel: ${Object.values(subjectPerf).map((s) => `${s.name} (${s.avg}%)`).join(', ') || 'Belum ada data'}

Kehadiran:
- Hadir: ${attendanceSummary.hadir}, Izin: ${attendanceSummary.izin}, Sakit: ${attendanceSummary.sakit}, Alpa: ${attendanceSummary.alpa}

7 Kebiasaan Anak Indonesia Hebat (Bangun Pagi, Beribadah, Berolahraga, Makan Sehat, Gemar Belajar, Bermasyarakat, Tidur Cepat):
${habitSummary || 'Belum ada data'}

Buat deskripsi rapor yang mencakup:
1. Sikap dan perilaku selama pembelajaran
2. Prestasi akademik
3. Kehadiran
4. Saran untuk peningkatan

Tulis dalam bentuk paragraf yang mengalir, 3-4 paragraf. Gunakan bahasa yang positif dan membangun.`;

    const description = await aiCompletion(systemPrompt, userPrompt);
    await logAiUsage(userId, schoolId, 'generate_report', 500);

    return NextResponse.json({ success: true, description });
  } catch (error: unknown) {
    logError({ error, route: '/api/ai/generate-report-desc', method: 'POST' });
    console.error('Generate report desc error:', error);
    const msg = error instanceof Error ? error.message : 'Gagal menghasilkan deskripsi rapor';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
