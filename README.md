# PANDAI — Platform Manajemen Sekolah Digital

Sistem Informasi Manajemen dan Akuntabilitas Sekolah Terpadu (SIMANTAP) untuk pengelolaan akademik, penilaian, kehadiran, dan pelaporan di sekolah dasar (SD) dan sekolah menengah pertama (SMP).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Runtime** | Bun |
| **Database** | SQLite + Prisma ORM |
| **UI** | Tailwind CSS 4 + shadcn/ui (New York) |
| **Auth** | JWT (jose) — cookie-based |
| **State** | Zustand + TanStack Query |
| **Charts** | Recharts |
| **PDF** | jsPDF |

## Features (A → I)

| # | Fitur | Deskripsi |
|---|-------|----------|
| A | Autentikasi & RBAC | Login, register, 6 roles (SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA, ORANG_TUA) |
| B | Manajemen Sekolah & Kelas | CRUD sekolah, kelas, mata pelajaran, tahun ajaran |
| C | Bank Soal & Ujian | Soal PG/esai, paket ujian, sesi ujian, auto-scoring |
| D | Kehadiran Siswa | Presensi harian per kelas, rekap bulanan |
| E | Jurnal Mengajar Guru | Log kegiatan belajar per pertemuan |
| F | Kotak Masukan | Saran/kritik antar role dengan balasan |
| G | Profil Lulusan 8 Dimensi | Penilaian karakter: spiritual, moral, dsb. |
| H | Komponen Nilai & Bobot | Sistem penilaian fleksibel (PH, PTS, PAS, tugas, dll.) |
| I | Rapor Cetak PDF | Generate rapor siswa & legger kelas dalam PDF |

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Setup environment
 cp .env.example .env
# Edit .env — set JWT_SECRET, DATABASE_URL, etc.

# 3. Push database schema
bun run db:push
bun run db:generate

# 4. (Optional) Seed demo data
bun run seed

# 5. Start development server
bun run dev
```

## Useful Commands

```bash
bun run dev           # Start dev server (port 3000)
bun run lint          # Run ESLint
bun run build         # Production build
bun run db:push       # Push Prisma schema to database
bun run db:generate   # Regenerate Prisma client
bun run seed          # Seed demo data
bun run backup        # Backup database (SQLite binary copy)
bun run backup:list   # List available backups
bun run backup:restore # Restore from backup (interactive)
```

## Project Structure

```
pandai/
├── src/
│   ├── app/
│   │   ├── api/v1/          # 57 API route handlers
│   │   ├── (auth)/          # Login/register pages
│   │   ├── (dashboard)/     # Authenticated app shell
│   │   └── page.tsx         # Public landing
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   └── features/        # Feature-specific views
│   └── lib/
│       ├── auth.ts          # JWT auth utilities
│       ├── db.ts            # Prisma client singleton
│       └── pdf-report.ts    # jsPDF report generation
├── prisma/
│   └── schema.prisma        # 35 database models
├── scripts/
│   ├── backup.mjs           # Database backup script
│   └── restore.mjs          # Database restore script
├── DEPLOY.md                # Deployment checklist & guide
├── API.md                   # Full API documentation (~50 endpoints)
└── CI/CD: .github/workflows/ci.yml
```

## Documentation

- **[DEPLOY.md](DEPLOY.md)** — Deployment checklist, rollback procedure, troubleshooting
- **[API.md](API.md)** — Complete API endpoint documentation grouped by feature
- **[.env.example](.env.example)** — Environment variable reference

## Security

- JWT cookie-based authentication (httpOnly, secure, sameSite)
- Role-based access control (RBAC) across 6 user roles
- School data isolation — users can only access their own school's data
- Pre-commit hook prevents database/env file commits
- Rate limiting on login endpoint

### Production credentials — security checklist

1. **Never commit real secrets.** `.env`, `.env.local`, and `.env.production` are gitignored.
2. **Generate strong app secrets** instead of hardcoding:
   ```bash
   chmod +x scripts/generate-credentials.sh
   ./scripts/generate-credentials.sh --force
   ```
   The script writes to gitignored `.env.local` (mode `600`) and does **not** print credential values.
3. **Rotate database & platform credentials** when they may have been exposed:
   - Neon PostgreSQL: https://console.neon.tech → **Settings** → **Members** → **Rotate password**
   - Vercel: https://vercel.com/dashboard → **Settings** → **OIDC Token** → **Regenerate**
4. **Clean leaked credentials from Git history** with the built-in safe script:
   ```bash
   ./scripts/purge-git-secrets.sh --inspect                 # non-destructive scan
   ./scripts/purge-git-secrets.sh --filter-repo --yes      # or --bfg --yes
   ```
5. After a history rewrite, **force-push every affected branch**:
   ```bash
   git push --force-with-lease origin main
   git push --force-with-lease origin arena/01a064ff-pandai
   ```
6. Rotating `JWT_SECRET` invalidates existing sessions — users will need to log in again after redeploy.
7. Full step-by-step runbook: **`docs/ROTATE_CREDENTIALS.md`**.

## License

Private — All rights reserved.
