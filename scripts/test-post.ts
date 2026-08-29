import { db } from '@/lib/db';
async function main() {
  // Clean up
  const existing = await db.studentAttempt.findMany({ where: { examSessionId: 'cmt5chkjk000onzm2spmbthee' } });
  for (const a of existing) {
    await db.studentAnswer.deleteMany({ where: { studentAttemptId: a.id } });
    await db.studentAttempt.delete({ where: { id: a.id } });
  }
  const attempt = await db.studentAttempt.create({
    data: {
      userId: 'cmt5awvx1000unzl3e6lvqzhc',
      examSessionId: 'cmt5chkjk000onzm2spmbthee',
      examPackageId: 'cmt5chkjd000cnzm28vli3di9',
      schoolId: 'cmt5awvwm0000nzl3hlthlzzl',
      classId: 'cmt5awvwx000knzl39bp1aku3',
      score: 5, totalCorrect: 5, totalWrong: 0, totalUnanswered: 0,
      percentage: 100, tkaPrediction: 1000, duration: 10, status: 'submitted',
      submittedAt: new Date(),
      answers: { create: [
        { questionId: 'q1', answer: 'B', isCorrect: true, pointsEarned: 1, timeSpent: 0 },
        { questionId: 'q2', answer: 'C', isCorrect: true, pointsEarned: 1, timeSpent: 0 },
      ]},
    },
    include: { answers: true },
  });
  console.log('answers type:', typeof attempt.answers);
  console.log('is array:', Array.isArray(attempt.answers));
  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
