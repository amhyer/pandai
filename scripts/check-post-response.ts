import { db } from '@/lib/db';
async function main() {
  // Simulate what POST returns
  const a = await db.studentAttempt.findFirst({
    where: { examSessionId: 'cmt5chkjk000onzm2spmbthee' },
    include: { answers: true },
  });
  if (!a) return;
  // Serialize like NextResponse.json would
  const serialized = JSON.parse(JSON.stringify(a, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  console.log('Keys:', Object.keys(serialized));
  console.log('Answers count:', serialized.answers?.length);
  console.log('First answer keys:', serialized.answers?.[0] ? Object.keys(serialized.answers[0]) : 'none');
  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
