import { db } from '@/lib/db';
async function main() {
  const a = await db.studentAttempt.findFirst({
    where: { examSessionId: 'cmt5chkjk000onzm2spmbthee' },
    include: { answers: true },
  });
  if (!a) { console.log('No attempt found'); return; }
  console.log('Attempt:', a.id);
  console.log('Status:', a.status);
  console.log('Score:', a.score, '/', a.answers.length);
  console.log('Correct:', a.totalCorrect, 'Wrong:', a.totalWrong, 'Unanswered:', a.totalUnanswered);
  console.log('Percentage:', a.percentage, 'TKA:', a.tkaPrediction);
  console.log('Answers:');
  a.answers.forEach((ans, i) => console.log(`  Q${i+1}: ${ans.answer} correct=${ans.isCorrect}`));
  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
