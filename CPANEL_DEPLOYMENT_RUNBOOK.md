# CPANEL DEPLOYMENT RUNBOOK — PANDAI

> **Target:** Shared hosting cPanel + Node.js App Manager (Passenger)
> **Startup file:** `server.js` (custom, membaca `process.env.PORT`)
> **Database:** PostgreSQL
> **Prinsip:** build manual di server, tanpa `output: 'standalone'`

---

## DAFTAR ISI

0. [Ringkasan Alur](#0-ringkasan-alur)
1. [Prasyarat](#1-prasyarat)
2. [Buat Database & Kredensial](#2-buat-database--kredensial)
3. [Clone via SSH](#3-clone-via-ssh)
4. [Setup Environment](#4-setup-environment)
5. [Install Dependencies](#5-install-dependencies)
6. [Build](#6-build)
7. [Prisma db push](#7-prisma-db-push)
8. [Super Admin / Seed](#8-super-admin--seed)
9. [Konfigurasi Passenger](#9-konfigurasi-passenger)
10. [Verifikasi Pasca-Deploy](#10-verifikasi-pasca-deploy)
11. [Redeploy (Update)](#11-redeploy-update)
12. [Troubleshooting](#12-troubleshooting)

---

## 0. Ringkasan Alur

```
Buat DB + kredensial → clone → isi .env.production → npm install --omit=dev
→ npm run build:plain → npx prisma db push → buat super admin
→ daftarkan app di Passenger (startup: server.js) → verifikasi
```

---

## 1. Prasyarat

| Kebutuhan | Nilai | Cara cek |
|---|---|---|
| Fitur cPanel | **Node.js App Manager** (Passenger) | Ikon di cPanel |
| Akses SSH | Aktif | `ssh user@host` |
| Node.js | **>= 20** (pilih 20/22 di UI) | `node -v` via SSH |
| Database | PostgreSQL dibuat dari cPanel | Langkah 2 |
| Domain/subdomain | Mengarah ke server | DNS |

⚠️ `package.json` sekarang punya `"engines": { "node": ">=20.0.0" }` — Node di server
harus 20 ke atas, dan versi yang dipilih di Node.js App Manager **harus sama** dengan
versi yang aktif di SSH (`node -v`).

---

## 2. Buat Database & Kredensial

### 2a. Database PostgreSQL

1. cPanel → **PostgreSQL Databases** (atau PostgreSQL yang disediakan hosting).
2. Buat database, mis. `cpaneluser_pandai`.
3. Buat user + password kuat, lalu tambahkan user ke database dengan **ALL PRIVILEGES**.
4. Catat host (biasanya `localhost` atau `127.0.0.1` di shared hosting).

### 2b. Kredensial aplikasi

Generate `JWT_SECRET` dan `PASSWORD_SALT` (64 hex char) dengan script repo:

```bash
bash scripts/generate-credentials.sh --show
```

> Script menulis ke `.env.local` dan menampilkan nilainya hanya di terminal
> interaktif (`--show`). Salin kedua nilai — dipakai di Langkah 4.
> Alternatif manual: `openssl rand -hex 32` (dua kali).

⚠️ **`PASSWORD_SALT` bersifat permanen.** Semua password legacy (SHA-256) diverifikasi
dengan salt ini. Jangan pernah diubah setelah ada user — jika bocor, rotasi butuh
reset password massal.

---

## 3. Clone via SSH

```bash
# Masuk SSH, lalu:
cd ~
git clone <repo-url> pandai
cd pandai
git log --oneline -3   # pastikan commit terbaru masuk
```

> Jika Anda lebih dulu membuat app di Node.js App Manager (Langkah 9) dan cPanel
> sudah membuat folder application root yang **tidak kosong**, clone ke folder lain
> lalu pindahkan isinya, atau hapus isi placeholder folder tersebut terlebih dahulu.

File `.exe` dan `static-serve/` sudah dikeluarkan dari git — jika masih perlu
`public/pull-dapodik.exe` di server, salin manual (scp/rsync), bukan lewat git.

---

## 4. Setup Environment

Salin template checklist yang sudah disiapkan repo:

```bash
cp .env.production.example .env.production   # template ter-commit di git
nano .env.production                         # isi nilainya
```

**Wajib terisi sebelum lanjut (centang `[x]` di komentar saat selesai):**

| Variable | Kapan dibaca | Catatan |
|---|---|---|
| `DATABASE_URL` | runtime + CLI Prisma | `postgresql://user:pass@127.0.0.1:5432/dbname` |
| `JWT_SECRET` | runtime | dari Langkah 2b — kosong = login gagal total |
| `PASSWORD_SALT` | runtime + seed | dari Langkah 2b — harus konsisten selamanya |
| `NEXT_PUBLIC_APP_URL` | **saat build** | `https://domain-anda.com` — di-inline ke bundle; salah saat build = build ulang |

Opsional: `UPSTASH_REDIS_REST_URL/_TOKEN` (rate limit multi-instance),
`SUPER_ADMIN_EMAIL/_NAME/_PASSWORD` (Langkah 8).

Fitur AI (chatbot/generate soal) **tidak pakai env var** — butuh file `.z-ai-config`
(JSON: `{"baseUrl": "https://.../v1", "apiKey": "..."}`) di application root.
Buat sekarang jika fitur AI dipakai (lihat bagian 7 di `.env.production`).

> ⚠️ **Jangan set `PORT` atau `NODE_ENV` manual** — Passenger yang men-set.
> `server.js` memaksa `NODE_ENV=production` jika belum ada.

---

## 5. Install Dependencies

```bash
cd ~/pandai
npm install --omit=dev
npm install --no-save typescript@5 @types/react@^19 @types/node@^22 tailwindcss@^4 @tailwindcss/postcss@^4 tw-animate-css@^1 tsx@^4
```

- Perintah pertama (`--omit=dev`) **wajib**: men-skip `better-sqlite3` (butuh native
  compile yang sering gagal di shared hosting) dan tool dev lain. `postinstall`
  otomatis menjalankan `prisma generate` — dengan `binaryTargets` yang sudah
  di-set di `prisma/schema.prisma` (`native` + `debian-openssl-3.0.x` +
  `rhel-openssl-3.0.x`), binary untuk OS server ikut terunduh.
- Perintah kedua (`--no-save`) **juga wajib**: build-time dependencies
  (`typescript`, `@types/*`, `tailwindcss`, `@tailwindcss/postcss`,
  `tw-animate-css`, `tsx`) berada di `devDependencies`, sehingga `--omit=dev`
  melewatinya — padahal `next build` butuh semuanya (kompilasi TS, plugin
  PostCSS/Tailwind v4, `@import "tw-animate-css"` di globals.css) dan Langkah 8
  butuh `tsx`. Flag `--no-save` meng-install ke `node_modules` tanpa mengubah
  `package.json`/lockfile.

Jika muncul warning `engine mismatch`, cek `node -v` — pastikan >= 20.9 dan sama
dengan versi yang dipilih di Node.js App Manager.

---

## 6. Build

```bash
npm run build:plain
```

Script ini = `prisma generate && next build` **tanpa** standalone output —
pasangan yang benar untuk `server.js` kustom.

- Jika OOM saat build (shared hosting sering membatasi RAM):
  ```bash
  NODE_OPTIONS=--max-old-space-size=1536 npm run build:plain
  ```
- Verifikasi: `ls .next/BUILD_ID` harus ada.
- Jangan pakai `npm run build` (standalone) untuk setup ini, dan jangan pakai
  `build:vercel` (menjalankan `db push --accept-data-loss` otomatis!).

---

## 7. Prisma db push

Repo ini **tidak memakai file migration** (`prisma/migrations/` hanya berisi
`migration_lock.toml`) — skema diterapkan langsung dengan `db push`.

```bash
cd ~/pandai
set -a; source .env.production; set +a   # Prisma CLI hanya membaca .env, BUKAN .env.production
npx prisma db push
unset DATABASE_URL JWT_SECRET PASSWORD_SALT   # bersihkan env sesi SSH
```

> **Kenapa harus `source` dulu?** `npx prisma db push` mencari `DATABASE_URL` di
> `.env`, sedikit pun tidak membaca `.env.production`. Tanpa `source`, perintah
> gagal dengan `Environment variable not found: DATABASE_URL`.
> Pola `set -a; source ...; set +a` juga dipakai untuk semua script TS di Langkah 8.

Pada database kosong pertama kali, `db push` cukup tanpa flag tambahan.
Hindari `--accept-data-loss` di production kecuali Anda paham persis datanya.

---

## 8. Super Admin / Seed

### 8a. Super admin production (WAJIB untuk login pertama)

```bash
cd ~/pandai
set -a; source .env.production; set +a
npx tsx scripts/create-super-admin.ts
unset DATABASE_URL JWT_SECRET PASSWORD_SALT
```

- Tanpa `SUPER_ADMIN_PASSWORD` di env, script membuat password acak dan
  **mencetaknya sekali** ke terminal — catat segera.
- Default tanpa env: `superadmin@pandai.id` / nama "Super Admin PANDAI".

### 8b. Seed data dummy (HANYA untuk testing — JANGAN di production!)

```bash
set -a; source .env.production; set +a
npx tsx prisma/seed.ts
unset DATABASE_URL JWT_SECRET PASSWORD_SALT
```

Membuat sekolah dummy + akun semua role dengan password universal `password123`.
**Jangan pernah dijalankan di production.**

⚠️ Kedua script wajib dijalankan dengan `PASSWORD_SALT` yang sama dengan runtime —
kalau berbeda, akun yang dibuat tidak bisa login.

---

## 9. Konfigurasi Passenger

cPanel → **Setup Node.js App** (Node.js App Manager):

| Field | Nilai |
|---|---|
| Node.js version | 20.x atau 22.x (sama dengan SSH) |
| Application mode | Production |
| Application root | `pandai` (folder hasil clone) |
| Application URL | domain/subdomain tujuan |
| Application startup file | `server.js` |

Lalu:

1. Klik **CREATE** / **START**.
2. (Opsional) Tambahkan env variables lewat UI sebagai alternatif `.env.production`
   — pilih **satu** sumber saja untuk menghindari kebingungan; file lebih mudah
   di-audit lewat git diff manual.
3. Jangan jalankan "Run NPM Install" dari UI (tidak memakai `--omit=dev`);
   install sudah dilakukan via SSH di Langkah 5.

**Restart aplikasi** setiap mengubah `.env.production` / `.z-ai-config` / kode:

```bash
cd ~/pandai && mkdir -p tmp && touch tmp/restart.txt
```

atau tombol **Restart** di Node.js App Manager.

---

## 10. Verifikasi Pasca-Deploy

```bash
# 1. App hidup dan menjawab
curl -I https://domain-anda.com
# Harap: HTTP/2 200 (atau 307 redirect ke login), BUKAN 503/502

# 2. Security headers dari proxy terpasang
curl -sI https://domain-anda.com | grep -iE 'content-security|x-frame|x-content-type'
# Harap: Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff

# 3. API auth menolak akses tanpa sesi
curl -s https://domain-anda.com/api/auth/me
# Harap: response JSON error/401-style, BUKAN crash HTML
```

Lalu melalui browser:

- [ ] Halaman login tampil dengan CSS/JS utuh (kalau rusak → lihat Troubleshooting #4)
- [ ] Login super admin berhasil
- [ ] Dashboard role terbuka; deep-link `/admin-school` tanpa sesi ter-redirect ke `/`
- [ ] Fitur AI (jika dipakai) merespons — kalau error, cek `.z-ai-config`

---

## 11. Redeploy (Update)

```bash
cd ~/pandai
git pull
npm install --omit=dev          # hanya jika package.json/lockfile berubah
npm run build:plain             # hanya jika ada perubahan kode
set -a; source .env.production; set +a
npx prisma db push              # hanya jika schema.prisma berubah
unset DATABASE_URL JWT_SECRET PASSWORD_SALT
mkdir -p tmp && touch tmp/restart.txt
```

---

## 12. Troubleshooting

| # | Gejala | Penyebab & Solusi |
|---|---|---|
| 1 | **503** terus-menerus | App gagal start. Cek startup file = `server.js`, lalu log error di interface Node.js App Manager. Penyebab umum: build belum dijalankan (`server.js` akan menulis `BUILD_ID tidak ditemukan`) |
| 2 | `Error: [SECURITY] JWT_SECRET is not configured` / `PASSWORD_SALT ... not set` | Env tidak terbaca: pastikan `.env.production` di application root **dan** restart app (`touch tmp/restart.txt`). Nilai `CHANGE_ME_IN_PRODUCTION` juga ditolak guard |
| 3 | `Environment variable not found: DATABASE_URL` saat `prisma db push` | Prisma CLI tidak membaca `.env.production` — jalankan dengan `set -a; source .env.production; set +a` dulu (Langkah 7) |
| 4 | Halaman tampil tapi CSS/JS 404 | Build tercampur: pastikan build terakhir adalah `build:plain` (bukan standalone), lalu build ulang + restart |
| 5 | Build OOM / terbunuh | `NODE_OPTIONS=--max-old-space-size=1536 npm run build:plain`; jika tetap gagal karena limit hosting, build di mesin lokal lalu rsync `.next`, `public`, `node_modules`, `package.json` ke server |
| 6 | Error Prisma `Query engine binary ... not found` / architecture mismatch | Regenerate di server: `npx prisma generate` (binaryTargets sudah mencakup debian & rhel) |
| 7 | Semua user gagal login setelah seed ulang | `PASSWORD_SALT` saat seed ≠ salt saat runtime. Samakan di `.env.production`, seed ulang |
| 8 | 502 sporadis | Sudah diantisipasi `server.js` (keep-alive 120s > timeout proxy). Jika masih terjadi, cek limit proxy hosting |
| 9 | Rate limit "lupa" setelah restart | Normal tanpa Upstash (in-memory per proses). Pasang `UPSTASH_REDIS_REST_*` jika perlu persisten |
| 10 | Reset password link mengarah ke `localhost:3000` | `NEXT_PUBLIC_APP_URL` salah/kosong **saat build** — perbaiki env lalu `npm run build:plain` ulang + restart |

---

## Checklist Go-Live Ringkas

```
[ ] PostgreSQL DB + user dibuat, ALL PRIVILEGES
[ ] JWT_SECRET & PASSWORD_SALT ter-generate (64 hex)
[ ] Repo ter-clone, commit terbaru
[ ] .env.production dibuat dari .env.production.example, 4 wajib terisi (DATABASE_URL, JWT_SECRET, PASSWORD_SALT, NEXT_PUBLIC_APP_URL)
[ ] (.z-ai-config dibuat, jika pakai fitur AI)
[ ] npm install --omit=dev sukses
[ ] npm install --no-save typescript@5 @types/react@^19 @types/node@^22 tailwindcss@^4 @tailwindcss/postcss@^4 tw-animate-css@^1 tsx@^4 (Langkah 5b)
[ ] npm run build:plain sukses (.next/BUILD_ID ada)
[ ] npx prisma db push sukses
[ ] Super admin dibuat, password dicatat
[ ] Passenger: startup file server.js, Node >= 20, app STARTED
[ ] curl 200 + security headers + /api/auth/me menolak anonim
[ ] Login super admin via browser sukses
```
