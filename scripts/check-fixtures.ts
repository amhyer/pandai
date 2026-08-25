import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  const testUsers = await db.user.findMany({ where: { OR: [
    { name: { startsWith: 'TEST_' } },
    { name: { startsWith: 'test_' } },
    { username: { startsWith: 'test_' } },
    { username: { startsWith: 'TEST_' } },
  ]}, select: { id: true, name: true, username: true, role: true } });
  
  const testSchools = await db.school.findMany({ where: { OR: [
    { name: { startsWith: 'TEST_' } },
    { name: { startsWith: 'test_' } },
  ]}, select: { id: true, name: true } });
  
  console.log(`TEST_ users: ${testUsers.length}`);
  testUsers.forEach(u => console.log(`  ${u.id} | ${u.username || '-'} | ${u.name} | ${u.role}`));
  console.log(`TEST_ schools: ${testSchools.length}`);
  testSchools.forEach(s => console.log(`  ${s.id} | ${s.name}`));

  if (testUsers.length === 0 && testSchools.length === 0) {
    console.log('\n✅ No TEST_ fixtures found. Database is clean.');
  }
  
  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
