import { db } from '@/lib/db';
async function main() {
  const attempts = await db.studentAttempt.findMany({
    where: { examSessionId: 'cmt5chkjk000onzm2spmbthee' },
  });
  for (const a of attempts) {
    await db.studentAnswer.deleteMany({ where: { studentAttemptId: a.id } });
    await db.studentAttempt.delete({ where: { id: a.id } });
  }
  console.log(`Deleted ${attempts.length} attempts`);
  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
