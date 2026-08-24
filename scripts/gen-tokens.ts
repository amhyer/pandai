import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';

const db = new PrismaClient();
const secret = new TextEncoder().encode('dev_jwt_secret_do_not_use_in_prod');

async function main() {
  const roles = ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'SISWA', 'ORANG_TUA', 'KEPALA_SEKOLAH'];
  const results: Record<string, string> = {};

  for (const role of roles) {
    const u = await db.user.findFirst({ where: { role }, select: { id: true, role: true, schoolId: true, isActive: true } });
    if (u) {
      const token = await new SignJWT({ userId: u.id, role: u.role, schoolId: u.schoolId || null, isActive: u.isActive })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(secret);
      results[role] = token;
      console.log(`${role}_TOKEN=${token}`);
    }
  }

  // Also output a SISWA_ID
  const siswa = await db.user.findFirst({ where: { role: 'SISWA' }, select: { id: true } });
  if (siswa) console.log(`SISWA_ID=${siswa.id}`);

  // INACTIVE token
  const inactiveToken = await new SignJWT({ userId: 'fake-inactive-id', role: 'GURU', schoolId: null, isActive: false })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
  console.log(`INACTIVE_TOKEN=${inactiveToken}`);
}

main().catch(console.error);
