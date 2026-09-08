# RENCANA KERJA — PANDAI (Phase 1: Integrasi & Dashboard)

Dokumen ini mencatat rencana, status, dan arsitektur pekerjaan feature yang
diimplementasikan di branch `arena/01a07ec6-pandai`.

> **Catatan penting (2026-09-08):** pekerjaan "uncommitted" dari session
> `arena/01a07a73-pandai` hilang (tidak sempat di-commit sebelum workspace
> direset). Commit di branch ini adalah **re-implementasi** fitur yang sama
> berdasarkan deskripsi + konvensi repo, bukan kode aslinya. Work yang
> sudah di-push sebelumnya (commit `886abeb` — ImageModal guru-assignment-view)
> tetap dirujuk/sinkronkan.

## Status Feature

| # | Feature | Status | Commit |
|---|---------|--------|--------|
| 1 | Shared ImageModal + gambar soal (bank soal, editor, assignment siswa/guru) | ✅ Selesai | `feat(question): shared ImageModal...` |
| 2 | Google Sheets Sync (OAuth2, sync, push, status, mapping, schedule, disconnect) | ✅ Selesai | `feat(sheets): Google Sheets Sync...` |
| 3 | TKA Dashboard siswa (API, halaman, chart tren/mapel/radar) | ✅ Selesai | `feat(tka): Dashboard TKA siswa...` |
| 4 | Guru Catatan (model, API CRUD, halaman, UI) | ✅ Selesai | `feat(guru-catatan): catatan pembinaan...` |
| 5 | Rekap 7 kebiasaan + endpoint ekspor CSV + utils grading/export | ✅ Selesai | `feat(analytics): rekap 7 kebiasaan...` |
| 6 | Dashboard banding admin + enhancement dashboard siswa/ortu + kuis mandiri | ✅ Selesai | `feat(dashboards): dashboard banding...` |

## Arsitektur & Lokasi File

### Google Sheets Sync
```
src/app/api/sheets/route.ts              GET config / POST simpan config
src/app/api/sheets/oauth/route.ts        GET mulai OAuth (state di cookie httpOnly)
src/app/api/sheets/oauth/callback/route.ts  GET tukar code -> token terenkripsi
src/app/api/sheets/sync/route.ts         POST sync manual + cron (?cron=1 + secret)
src/app/api/sheets/push/route.ts         POST push parsial (filter kelas/mapel)
src/app/api/sheets/status/route.ts       GET status + metadata sheet dari Google
src/app/api/sheets/schedule/route.ts     GET/POST frekuensi jadwal
src/app/api/sheets/disconnect/route.ts   POST putuskan koneksi
src/lib/google-sheets/{types,oauth,client,mapping,sync}.ts
src/lib/encryption.ts                    AES-256-GCM (token di DB)
src/components/views/admin-school-settings.tsx   UI pengaturan + integrasi
src/app/admin-school/settings/page.tsx
docs/GOOGLE_SHEETS_SYNC_SETUP.md         panduan setup lengkap
```
- Token OAuth2 **terenkripsi** di `GoogleSheetsConfig` (kolom `encrypted_*`).
- Auto token refresh di client saat 401 (persist token baru ke DB).
- Cron: Vercel Cron → `POST /api/sheets/sync?cron=1` + `x-cron-secret`.

### TKA Dashboard
```
src/app/api/analytics/tka-dashboard/route.ts   siswa (diri) / ortu (anak) / kelas
src/app/siswa/tka-dashboard/page.tsx
src/components/views/siswa/tka-dashboard-view.tsx
src/components/views/competency/tka-dashboard-chart.tsx   Line + Bar
src/components/views/competency/competency-radar-chart.tsx Radar 8 dimensi
```

### Guru Catatan
```
prisma/schema.prisma                       model GuruCatatan
src/app/api/guru-catatan/route.ts          GET (multi-role) + POST
src/app/api/guru-catatan/[id]/route.ts     PATCH/DELETE (hanya penulis/admin)
src/app/guru/catatan/page.tsx
src/components/views/guru/guru-catatan-view.tsx
```
Kategori: `umum | apresiasi | perbaikan | perhatian`.

### Analytics & Export
```
src/app/api/analytics/character-recap/route.ts  rekap 7 kebiasaan
src/app/api/export/route.ts                     CSV: students/scores/attendance/character/catatan
src/lib/grading-utils.ts                        gradeLetter, bandingScores, dll
src/lib/export-utils.ts                         buildCsv, csvBlob, downloadXLSX
src/components/views/character/character-recap-view.tsx
```

### Dashboard Enhancement
```
src/app/admin-school/dashboard-banding/page.tsx
src/components/views/grades/dashboard-banding-view.tsx   distribusi, per mapel, top 5, rekap
src/components/views/siswa/siswa-dashboard-enhancement.tsx  embed di dashboard siswa
src/components/views/siswa/diagnostic-results.tsx         pola useEffect (React 19 lint-safe)
src/components/views/ortu/ortu-dashboard-enhancement.tsx  embed di dashboard ortu
src/components/quiz/quiz-card.tsx                         kuis mandiri 5 soal
```

## Environment Variables Baru

| Variabel | Kewajiban |
|---|---|
| `AES_SECRET` | wajib (prod) — enkripsi token Sheets |
| `GOOGLE_SHEETS_CLIENT_ID` | wajib (prod) — Google OAuth |
| `GOOGLE_SHEETS_CLIENT_SECRET` | wajib (prod) — Google OAuth |
| `GOOGLE_SHEETS_REDIRECT_URI` | wajib (prod) — harus sama dengan di GCP |
| `SHEETS_SYNC_CRON_SECRET` | untuk cron sinkronisasi |

Generate: `./scripts/generate-credentials.sh` (menulis ke `.env.local`, mode 600).

## Perubahan Skema (prisma db push)

- `Question.imageUrl` — URL gambar soal (nullable)
- `GoogleSheetsConfig` — diperluas: spreadsheetId nullable, sheetName,
  token terenkripsi, scheduleFrequency, lastSyncRows/lastError, FK School
- `GuruCatatan` — model baru (relasi User×2, Class, Subject, School)

## Verifikasi

- `npx tsc --noEmit` — semua file baru bersih; sisa error = baseline pre-existing
  di `main` (pattern `username: string | null` di halaman route + beberapa file
  lama — sama sebelum & sesudah pekerjaan ini).
- `npx eslint <file-baru>` — bersih (0 error, 0 warning).
- `prisma generate` tidak bisa dijalankan di sandbox (host `binaries.prisma.sh`
  terblokir); type-check memakai stub client. Jalankan `bun run db:push` di
  lingkungan dengan akses internet sebelum uji runtime.

## Langkah Selanjutnya (disarankan)

1. `bun install && bun run db:push && bun run seed` — siapkan DB lokal.
2. Uji runtime: login admin → Pengaturan Aplikasi → alur OAuth Sheets (butuh
   GCP project + env).
3. Uji TKA dashboard & Guru Catatan dengan data seed.
4. Rekonsiliasi branch dengan `arena/01a07a73-pandai` / `main` saat merge
   (branch ini berbasis `main` ec897db; 01a07a73 punya garis komit terpisah
   dengan diff kecil — lihat `git diff main origin/arena/01a07a73-pandai`).
