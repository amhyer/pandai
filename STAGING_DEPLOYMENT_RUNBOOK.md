# STAGING DEPLOYMENT RUNBOOK — PANDAI

> **Versi:** 1.0
> **Terakhir diperbarui:** $(date +%Y-%m-%d)
> **Tujuan:** Panduan end-to-end dari server kosong hingga siap re-verifikasi keamanan

---

## DAFTAR ISI

1. [Prasyarat Server](#1-prasyarat-server)
2. [Install Dependencies](#2-install-dependencies)
3. [Environment Variables](#3-environment-variables)
4. [Migrate Database](#4-migrate-database)
5. [Seed Data](#5-seed-data)
6. [Build & Jalankan Aplikasi](#6-build--jalankan-aplikasi)
7. [Re-Verifikasi Keamanan](#7-re-verifikasi-keamanan)
8. [Load Test](#8-load-test)
9. [Kriteria Go/No-Go](#9-kriteria-gono-go)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prasyarat Server

| Kebutuhan | Minimum | Rekomendasi |
|-----------|---------|-------------|
| OS | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 LTS |
| RAM | 2 GB | 4 GB |
| CPU | 2 vCPU | 4 vCPU |
| Disk | 20 GB SSD | 40 GB SSD |
| Port | 3000 (aplikasi), 5432 (PostgreSQL) | 3000 + 5432 |
| PostgreSQL | >= 15 | 16 |
| Node.js | >= 20 LTS | 22 LTS |
| Bun (opsional) | >= 1.1 | Latest |
| Git | >= 2.30 | Latest |
| Artillery (load test) | >= 2.0 | Latest |

### Cek versi

```bash
node --version    # v20.x atau v22.x
pg_isready        # PostgreSQL client
bun --version     # opsional, bisa pakai npx tsx
```

---

## 2. Install Dependencies

### 2.1 Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start & enable
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.2 Buat Database & User

```bash
sudo -u postgres psql <<EOF
CREATE USER pandai WITH PASSWORD 'GANTI_INI_DI_PRODUCTION_SECURE_RANDOM_32_CHARS';
CREATE DATABASE pandai_staging OWNER pandai;
GRANT ALL PRIVILEGES ON DATABASE pandai_staging TO pandai;
EOF
```

### 2.3 Install Node.js 22 LTS

```bash
# Menggunakan NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # v22.x
npm --version
```

### 2.4 Install Bun (opsional — untuk seed)

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### 2.5 Install Artillery (untuk load test)

```bash
npm install -g artillery
```

### 2.6 Clone & Install Project

```bash
cd /opt  # atau /home/deploy
sudo git clone https://github.com/amhyer/pandai.git
cd pandai

npm install  # atau: bun install
```

---

## 3. Environment Variables

### 3.1 Checklist Wajib — Buat `.env`

Salin template dan isi SEMUA nilai:

```bash
cp .env.example .env
nano .env
```

**Daftar lengkap environment variables:**

| Variable | Wajib? | Default/Fallback | Keterangan |
|----------|--------|-------------------|------------|
| `DATABASE_URL` | **WAJIB** | *(tidak ada)* | Format: `postgresql://pandai:PASSWORD@localhost:5432/pandai_staging` |
| `JWT_SECRET` | **WAJIB** | *(throw di production)* | Minimal 32 karakter random. Generate: `openssl rand -base64 48` |
| `PASSWORD_SALT` | **WAJIB** | *(throw di production)* | Salt untuk password hashing legacy. Generate: `openssl rand -base64 32` |
| `NODE_ENV` | **WAJIB** | `development` | Set ke `production` di staging/server |

**Variables yang otomatis (dari code, tidak perlu di .env):**

| Variable | Digunakan di | Perilaku |
|----------|-------------|----------|
| `NODE_ENV` | `db.ts`, `auth.ts`, `constants.ts`, `middleware.ts`, `seed/route.ts` | Mengontrol: log level, cookie secure, HSTS, fallback block, seed endpoint guard |

### 3.2 Contoh `.env` Staging

```env
# Database — PostgreSQL
DATABASE_URL=postgresql://pandai:GANTI_INI_32chars_minimum_random!@localhost:5432/pandai_staging

# Security — WAJIB ganti dari dev values!
JWT_SECRET=a7f3b9c2d4e6f1a8b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5
PASSWORD_SALT=xK9mP2vR4nQ8wT1yA3bC5dE7fG9hJ1kL3mN5oP7qR9sT1uV3wX5

# Environment
NODE_ENV=production
```

### 3.3 Generate JWT_SECRET Aman

```bash
# 48 karakter base64 (36 bytes entropy)
openssl rand -base64 48
```

### 3.4 Cek Dangerous Fallback Defaults

Script berikut memastikan TIDAK ADA fallback default yang berbahaya di production:

```bash
# Harus TIDAK ada output (berarti aman)
rg 'process\.env\.(JWT_SECRET|PASSWORD_SALT|DATABASE_URL)\s*\|\|' src/ --ignore-case

# Cek juga pattern lain
rg "\|\| \"[a-z_]+\"" src/lib/auth.ts src/lib/constants.ts
```

**Catatan penting:** Di `src/lib/auth.ts` dan `src/lib/constants.ts`, terdapat fallback development:
- `process.env.PASSWORD_SALT || 'pandai_dev_salt_2024'` — **AMAN** karena hanya aktif jika `NODE_ENV !== 'production'` (ada guard yang throw)
- `process.env.JWT_SECRET` — **AMAN** karena production mode throw error jika kosong atau == 'CHANGE_ME_IN_PRODUCTION'

---

## 4. Migrate Database

### 4.1 Gunakan Schema PostgreSQL

```bash
# Backup schema SQLite
cp prisma/schema.prisma prisma/schema.sqlite.prisma

# Copy PostgreSQL schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma
```

### 4.2 Generate Prisma Client

```bash
npx prisma generate
```

### 4.3 Jalankan Migrasi

**Opsi A — Prisma Migrate (disarankan):**

```bash
npx prisma migrate deploy
```

**Opsi B — Manual SQL (untuk review sebelum deploy):**

```bash
# Review dulu
less prisma/migrations/postgresql_init/migration.sql

# Jalankan manual
psql -U pandai -d pandai_staging -f prisma/migrations/postgresql_init/migration.sql
```

### 4.4 Verifikasi Migrasi

```bash
npx prisma db pull  # Sinkronkan Prisma dengan DB actual
npx prisma validate  # Harus: "The schema is valid"
```

### 4.5 Catatan SQLite → PostgreSQL

| Aspek | SQLite | PostgreSQL | Action Needed |
|-------|--------|------------|---------------|
| JSON query | `GROUP_CONCAT` | `STRING_AGG` | File: `src/app/api/audit/suspicious-access/route.ts` — **PERLU DIUBAH** sebelum production |
| String concat | `||` | `||` (sama) | OK, cross-compatible |
| DateTime | TEXT (ISO8601) | `TIMESTAMP(3)` | Prisma handle otomatis |
| Boolean | 0/1 | TRUE/FALSE | Prisma handle otomatis |
| Backup endpoint | File copy `.db` | `pg_dump` | **PERLU DIUBAH** untuk production |
| `Float` type | REAL | DOUBLE PRECISION | Prisma handle otomatis |
| `@@db.Text` | Tidak perlu | Perlu untuk field panjang | Sudah ditambahkan di schema.postgresql.prisma |

**Perubahan code yang WAJIB dilakukan sebelum production:**

1. **`src/app/api/audit/suspicious-access/route.ts`** — Ganti `GROUP_CONCAT(DISTINCT ...)` dengan `STRING_AGG(DISTINCT ..., ', ')`

2. **`src/app/api/backup/route.ts`** — Seluruh endpoint ini SQLite-specific (file-based backup). Nonaktifkan atau ganti dengan `pg_dump` wrapper.

---

## 5. Seed Data

### 5.1 Jalankan Seed Idempotent

```bash
npx tsx prisma/seed.postgresql.ts
```

### 5.2 Verifikasi Seed

```bash
npx tsx prisma/seed.postgresql.ts
# Output harus menunjukkan: (upserted, tidak error)
# Dan jumlah users ≈ 28, schools = 2, classes = 4, subjects = 10
```

### 5.3 Jalankan Ulang (Verifikasi Idempotensi)

```bash
npx tsx prisma/seed.postgresql.ts
# Harus berhasil KEDUA KALI tanpa error atau duplikat
```

---

## 6. Build & Jalankan Aplikasi

### 6.1 Build Production

```bash
npm run build
# atau: bun run build
```

### 6.2 Jalankan dengan next start (BUKAN next dev)

```bash
# Foreground (untuk debugging awal)
NODE_ENV=production npm run start

# Background dengan nohup
NODE_ENV=production nohup npm run start > server.log 2>&1 &

# Dengan PM2 (disarankan untuk staging)
npm install -g pm2
NODE_ENV=production pm2 start npm --name pandai -- start
pm2 logs pandai
```

### 6.3 Smoke Test

```bash
# Pastikan server responsif
curl -s http://localhost:3000 | head -c 200

# Coba login
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"0051234567","password":"password123"}' | head -c 200
```

---

## 7. Re-Verifikasi Keamanan

### 7.1 Jalankan 17 IDOR Test

```bash
# Pastikan server berjalan, lalu:
bash scripts/verify/verify-curl.sh
```

**Expected:** Semua 17 skenario IDOR harus mengembalikan 403 atau redirect (BUKAN 200 dengan data milik user lain).

### 7.2 Jalankan Verify All Features

```bash
npx tsx scripts/verify/verify-all-features.ts
```

**Expected:** Semua feature test PASS.

### 7.3 Verifikasi 15 HIGH RBAC Items

Berdasarkan `rbac-audit-report.md`, pastikan:

| No | Item | Endpoint | Expected | Cek |
|----|------|----------|----------|-----|
| H1 | Super Admin only | POST /api/users (SUPER_ADMIN) | 403 non-SA | Manual curl |
| H3 | School scope attendance | POST /api/attendance (cross-school) | 403 | Manual curl |
| H14 | School scope scores | GET /api/scores (cross-school) | 403 | verify-curl.sh |
| H16 | School scope competency | POST /api/competency-assessments (cross-school) | 403 | Manual curl |
| H23 | Admin create user isolation | POST /api/users (other school) | 403 | verify-curl.sh |
| H33 | School scope exam sessions | GET /api/exam-sessions (cross-school) | 403 | Manual curl |
| H34 | School scope attempts | GET /api/student-attempts (cross-school) | 403 | Manual curl |
| H37 | School scope ext quiz | POST /api/external-quiz-scores (cross-school) | 403 | Manual curl |
| H38 | School scope ext quiz GET | GET /api/external-quiz-scores (cross-school) | 403 | Manual curl |
| H49 | Review question role | POST /api/ai/review-question (SISWA) | 403 | Manual curl |

### 7.4 Verifikasi Kunci Keamanan Lainnya

```bash
# 1. JWT_SECRET guard — harus 500/401 tanpa secret
unset JWT_SECRET
NODE_ENV=production npx next start -p 3001 2>&1 | head -5
# Expected: error tentang JWT_SECRET

# 2. Seed endpoint disabled di production
curl -s -X POST http://localhost:3000/api/seed | head -c 200
# Expected: {"error":"Seed endpoint is disabled in production."}

# 3. Security headers
curl -sI http://localhost:3000/api/auth/login | grep -i 'x-content-type\|x-frame\|strict-transport'
# Expected: X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Strict-Transport-Security (jika production)

# 4. Rate limiting
curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"x","password":"x"}'
# Lakukan 10x cepat — harus ada 429
```

---

## 8. Load Test

### 8.1 Jalankan Load Test

```bash
# Pastikan Artillery terinstall
artillery --version

# Jalankan terhadap staging
artillery run scripts/staging/load-test.yml --target http://localhost:3000

# Dengan output JSON
artillery run scripts/staging/load-test.yml --target http://localhost:3000 --output load-test-report.json

# Generate laporan HTML
artillery report load-test-report.json
# Buka load-test-report.html di browser
```

### 8.2 Membaca Hasil

```
All thresholds passed!
  p95 < 2000ms: PASS (actual: XXXms)
  maxErrorRate < 1%: PASS (actual: X.XX%)
```

### 8.3 Skenario yang Diuji

| Skenario | Bobot | Endpoint utama |
|----------|-------|----------------|
| Siswa Login & Browse Exams | 40% | login, GET /api/exams, GET /api/scores, GET /api/attendance |
| Guru Login & Input Attendance | 25% | login, GET /api/classes, GET /api/attendance, GET /api/users |
| Orang Tua Login & Monitor | 20% | login, GET /api/scores, GET /api/attendance, GET /api/character-reports |
| Admin Login & Dashboard | 15% | login, GET /api/dashboard, GET /api/users, GET /api/activity-logs |

### 8.4 Phase Load Test

| Phase | Durasi | Arrival Rate | Total Users ~ |
|-------|--------|-------------|---------------|
| Warmup | 30s | 0.33/s | 10 |
| Peak (Jam Tryout) | 120s | 40/s | ~4800 requests |
| Cooldown | 30s | 5/s | ~150 |

---

## 9. Kriteria Go/No-Go

### ✅ GO — Lanjut ke Production jika SEMUA terpenuhi:

| # | Kriteria | Metode Verifikasi | Status |
|---|----------|-------------------|--------|
| 1 | `npx prisma validate` pass | `npx prisma validate` | ☐ |
| 2 | `npm run build` success | `npm run build` | ☐ |
| 3 | `npm run start` berjalan tanpa crash | `curl http://localhost:3000` | ☐ |
| 4 | Seed idempotent (2x run tanpa error) | `npx tsx prisma/seed.postgresql.ts` (x2) | ☐ |
| 5 | Login semua role berhasil | curl 6 akun demo | ☐ |
| 6 | 17 IDOR test SEMUA return 403 | `bash scripts/verify/verify-curl.sh` | ☐ |
| 7 | 15 HIGH RBAC items SEMUA aman | Manual curl per tabel 7.3 | ☐ |
| 8 | JWT_SECRET throw jika kosong | Unset JWT_SECRET, coba start | ☐ |
| 9 | Seed endpoint disabled di production | `curl -X POST /api/seed` | ☐ |
| 10 | Load test: p95 < 2000ms | Artillery report | ☐ |
| 11 | Load test: error rate < 1% | Artillery report | ☐ |
| 12 | Tidak ada `process.env.X || "default"` tanpa production guard | `rg '\|\|' src/` | ☐ |
| 13 | GROUP_CONCAT sudah diganti STRING_AGG | Cek suspicious-access route | ☐ |
| 14 | Backup endpoint dinonaktifkan/diubah untuk PostgreSQL | Cek backup route | ☐ |

### ❌ NO-GO — Jika SATU pun gagal:

**STOP.** Jangan lanjut ke production. Perbaiki, re-test, baru lanjut.

---

## 10. Troubleshooting

### PostgreSQL connection refused

```bash
# Cek PostgreSQL berjalan
sudo systemctl status postgresql

# Cek connection
psql -U pandai -d pandai_staging -c "SELECT 1;"

# Cek pg_hba.conf
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v '^#' | grep -v '^$'
```

### Prisma migrate error: relation already exists

```bash
# Reset database (HATI-HATI: hapus semua data!)
npx prisma migrate reset

# Atau jalankan manual SQL
psql -U pandai -d pandai_staging -f prisma/migrations/postgresql_init/migration.sql
```

### Build error: module not found

```bash
rm -rf node_modules .next
npm install
npm run build
```

### Seed error: unique constraint violation

```bash
# Ini seharusnya tidak terjadi dengan seed.postgresql.ts (idempotent)
# Jika terjadi, cek apakah ada data duplikat:
psql -U pandai -d pandai_staging -c "SELECT username, COUNT(*) FROM \"User\" GROUP BY username HAVING COUNT(*) > 1;"
```

### Port 3000 already in use

```bash
# Cek proses
lsof -i :3000
kill -9 <PID>

# Atau gunakan port lain
PORT=3001 npm run start
```

### Load test timeout

```bash
# Tingkatkan timeout di artillery config
# Atur defaults.timeout di load-test.yml (default: 10 detik)
```

---

## APPENDIX: Akun Demo

| Role | Username | Password |
|------|----------|----------|
| SUPER_ADMIN | superadmin@pandai.id | password123 |
| ADMIN_SCHOOL (SD) | admin.sdn1@pandai.id | password123 |
| ADMIN_SCHOOL (SMP) | admin.smpn2@pandai.id | password123 |
| KEPALA_SEKOLAH (SD) | kepsek.sdn1 | password123 |
| KEPALA_SEKOLAH (SMP) | kepsek.smpn2 | password123 |
| GURU (SD) | 198504152010011001 | password123 |
| GURU (SMP) | 3502155678090002 | password123 |
| SISWA (SD) | 0051234567 | password123 |
| SISWA (SMP) | 0060987654 | password123 |
| ORANG_TUA (SD) | rahman | 123 |
| ORANG_TUA (SMP) | wati | 123 |

---

## APPENDIX: File Reference

| File | Keterangan |
|------|------------|
| `prisma/schema.postgresql.prisma` | Schema PostgreSQL (dengan @db.Text annotations) |
| `prisma/schema.prisma` | Schema aktif (ganti ke versi PostgreSQL saat staging) |
| `prisma/seed.postgresql.ts` | Seed idempotent (upsert-based, aman dijalankan berulang) |
| `prisma/migrations/postgresql_init/migration.sql` | Manual SQL migration untuk review sebelum deploy |
| `scripts/staging/load-test.yml` | Artillery load test config |
| `scripts/staging/README.md` | Panduan load test |
| `scripts/verify/verify-curl.sh` | 17 IDOR scenario verification |
| `scripts/verify/verify-all-features.ts` | All features verification |
| `rbac-audit-report.md` | RBAC audit report (15 HIGH items) |

---

*Runbook ini adalah panduan lengkap dari nol. Ikuti secara berurutan. Jika ada step yang gagal, jangan lanjut ke step berikutnya.*
