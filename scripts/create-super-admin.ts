/**
 * PANDAI — Create / Reset Super Admin
 *
 * Membuat akun SUPER_ADMIN langsung di database (cocok untuk production
 * Neon.tech + Vercel, karena seed dummy TIDAK berjalan otomatis saat deploy).
 *
 * Idempotent & aman dijalankan otomatis saat deploy:
 *  - Akun belum ada -> dibuat baru (pakai SUPER_ADMIN_PASSWORD atau 'password123')
 *  - Akun sudah ada -> password TIDAK diubah (kecuali SUPER_ADMIN_PASSWORD di-set
 *    eksplisit). Mencegah setiap deploy mereset password super admin.
 *
 * Password di-hash bcrypt, tidak bergantung pada PASSWORD_SALT legacy SHA-256.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || 'superadmin@pandai.id';
const DEFAULT_SUPER_ADMIN_PASSWORD = 'password123';
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || 'Super Admin PANDAI';

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🔐 Membuat / memperbarui Super Admin...');
  console.log(`   email    : ${SUPER_ADMIN_EMAIL}`);
  console.log(`   nama     : ${SUPER_ADMIN_NAME}`);

  const existing = await db.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });

  if (existing) {
    const data: { name?: string; role?: string; isActive?: boolean; password?: string } = {
      name: SUPER_ADMIN_NAME,
      role: 'SUPER_ADMIN',
      isActive: true,
    };
    if (process.env.SUPER_ADMIN_PASSWORD) {
      data.password = await hashPassword(process.env.SUPER_ADMIN_PASSWORD);
      console.log('   (password diperbarui karena SUPER_ADMIN_PASSWORD di-set)');
    }
    const updated = await db.user.update({ where: { id: existing.id }, data });
    console.log(`✅ Super Admin diperbarui: id=${updated.id}`);
  } else {
    const password = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_SUPER_ADMIN_PASSWORD;
    const hashed = await hashPassword(password);
    const created = await db.user.create({
      data: {
        email: SUPER_ADMIN_EMAIL,
        name: SUPER_ADMIN_NAME,
        password: hashed,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    console.log(`✅ Super Admin dibuat: id=${created.id}`);
    if (!process.env.SUPER_ADMIN_PASSWORD) {
      console.log(`   ⚠️  Menggunakan password default '${DEFAULT_SUPER_ADMIN_PASSWORD}'.`);
    }
  }
  console.log('\n🎉 Selesai.');
}

main()
  .catch((e) => {
    console.error('❌ Gagal membuat super admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });