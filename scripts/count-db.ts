import { db } from '@/lib/db';

async function main() {
  const tables = ['ExamPackage', 'ExamSession', 'ExamItem', 'Question', 'ExamAssignment', 'StudentAttempt', 'User', 'Class'];
  for (const t of tables) {
    const count: any = await db.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM ${t}`);
    console.log(`${t}: ${count[0].cnt}`);
  }
  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
