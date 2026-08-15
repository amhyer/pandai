# PANDAI — Deployment Guide

## Prasyarat

- Node.js >= 18
- Bun >= 1.0 (opsional, bisa pakai npm)
- Database: SQLite (default) atau PostgreSQL (direkomendasikan untuk multi-sekolah)

---

## 1. Deploy ke Server

```bash
# Clone repository
git clone https://github.com/amhyer/pandai.git
cd pandai

# Install dependencies
bun install  # atau: npm install

# Setup environment
cp .env.example .env
# Edit .env — ISI PASSWORD_SALT DENGAN RANDOM STRING!
# Contoh: PASSWORD_SALT=$(openssl rand -hex 24)

# Push database schema
bun run db:push

# (Opsional) Reset database untuk production bersih
NODE_ENV=production bun run scripts/reset-db.ts

# Build
bun run build

# Jalankan
bun run start  # atau: node_modules/.bin/next start -p 3000
```

### Migrasi ke PostgreSQL (direkomendasikan untuk >5 sekolah)

1. Ubah `DATABASE_URL` di `.env`:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/pandai_db
   ```

2. Ubah `provider` di `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Install PostgreSQL client:
   ```bash
   bun add better-sqlite3  # hapus jika sudah tidak perlu
   ```

4. Push schema:
   ```bash
   bun run db:push
   ```

---

## 2. Membuat Akun Pertama (SUPER_ADMIN)

Pandai menggunakan sistem login sederhana berbasis username/password.
Untuk membuat akun SUPER_ADMIN pertama, jalankan perintah ini di server:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const db = new PrismaClient();

async function createSuperAdmin() {
  const salt = process.env.PASSWORD_SALT || 'CHANGE_ME';
  const password = 'GANTI_PASSWORD_INI';
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password + salt));
  const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const admin = await db.user.create({
    data: {
      username: 'superadmin',
      email: 'admin@pandai.id',
      password: hash,
      name: 'Super Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
    }
  });
  console.log('SUPER_ADMIN created:', admin.username, admin.email);
  await db.\$disconnect();
}

createSuperAdmin();
"
```

**PENTING:** Ganti `password` di script di atas dengan password yang kuat!

---

## 3. Alur Onboarding Sekolah Baru

### Super Admin membuat sekolah:
1. Login sebagai SUPER_ADMIN
2. Buka menu **Sekolah** → **Daftar Sekolah**
3. Klik **Tambah Sekolah**
4. Isi data sekolah (nama, kode, alamat, dll)

### Super Admin membuat Admin Sekolah:
1. Buka menu **Pengguna** → **Tambah Pengguna**
2. Pilih role: **Admin Sekolah**
3. Pilih sekolah yang baru dibuat
4. Isi data admin (nama, email, password)

### Admin Sekolah menambah guru:
1. Login sebagai Admin Sekolah
2. Buka menu **Pengguna** → **Tambah Pengguna**
3. Pilih role: **Guru**
4. Isi data guru (NIP, mata pelajaran, dll)

### Admin Sekolah menambah siswa:
1. Buka menu **Pengguna** → **Tambah Pengguna**
2. Pilih role: **Siswa**
3. Pilih kelas
4. Atau gunakan **Import CSV** untuk massal

### Guru membuat soal:
1. Login sebagai Guru
2. Buka menu **Bank Soal** → **Tambah Soal**
3. Atau gunakan fitur AI untuk generate soal otomatis

---

## 4. Checklist Sebelum Onboarding Sekolah Baru

- [ ] Database sudah di-reset (`NODE_ENV=production bun run scripts/reset-db.ts`)
- [ ] `PASSWORD_SALT` di `.env` sudah diisi dengan random string
- [ ] `DATABASE_URL` mengarah ke database production
- [ ] Backup terakhir tersimpan
- [ ] Server sudah bisa diakses via domain/IP
- [ ] HTTPS sudah dikonfigurasi (LetsEncrypt / reverse proxy)
- [ ] ErrorLog dipantau setelah go-live

---

## 5. Monitoring Pasca-Launch

### Cek ErrorLog
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.errorLog.findMany({ take: 20, orderBy: { createdAt: 'desc' } })
  .then(logs => {
    logs.forEach(e => console.log(e.createdAt.toISOString(), e.level, e.route, e.message.substring(0, 100)));
    return db.\$disconnect();
  });
"
```

### Cek Rate Limiting
Rate limiting aktif secara default:
- Login: 5 percobaan / 60 detik per IP
- AI endpoints: 20 request / 60 detik per user
- Semua POST/PUT/DELETE: 30 request / 60 detik per user

### Backup Database
```bash
# SQLite
cp db/custom.db backup/custom-$(date +%Y%m%d).db

# PostgreSQL
pg_dump pandai_db > backup/pandai-$(date +%Y%m%d).sql
```

---

## 6. Keterbatasan SQLite (Soft-Launch)

SQLite cocok untuk soft-launch dengan ≤10 sekolah. Keterbatasan:
- **Concurrent writes**: Hanya 1 writer pada satu waktu. Banyak request POST bersamaan bisa menyebabkan "database is locked".
- **No replication**: Tidak ada built-in replication/failover.
- **Scalability**: Performance menurun saat data >1GB.

**Rekomendasi migrasi ke PostgreSQL** ketika:
- >10 sekolah aktif
- >100 concurrent users
- Perlu high-availability / failover
