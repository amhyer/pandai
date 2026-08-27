# 📖 PANDAI — Panduan Pengembang (Developer Guide)

> **Versi**: 1.0 · **Terakhir diperbarui**: Juli 2025  
> **Status**: Fitur 1 (PANDAI AI) selesai · 6 fitur inovatif tersisa

---

## 🏗️ 1. Arsitektur & Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) | 4.x |
| Database | SQLite via Prisma ORM | 6.x |
| State (Client) | Zustand | 5.x |
| Server State | TanStack Query | 5.x |
| Icons | Lucide React | 0.525.x |
| Animations | Framer Motion | 12.x |
| Charts | Recharts | 2.x |
| Markdown | react-markdown | 10.x |
| AI SDK | z-ai-web-dev-sdk | 0.0.18 |
| Form | react-hook-form + zod | 7.x / 4.x |
| Toast | Sonner | 2.x |
| Auth | NextAuth.js v4 | 4.x |

### Port & Infrastruktur
- **Dev server**: Port `3000` (Next.js + Turbopack)
- **Gateway**: Caddy (port 81, proxy ke 3000)
- **Database file**: `db/custom.db` (SQLite)
- **Mini-services**: Folder `mini-services/` (port terpisah, socket.io)
- **API requests antar-service**: Wajib pakai `?XTransformPort={Port}` (BUKAN hardcode port di URL)

### Penting
- **Hanya 1 route publik**: `/` (src/app/page.tsx) — semua halaman via client-side navigation
- **z-ai-web-dev-sdk**: WAJIB di backend saja, JANGAN di client-side
- **API pattern**: `NextResponse.json()`, try-catch, pesan error Bahasa Indonesia

---

## 🎭 2. Sistem RBAC (5 Role)

```
SUPER_ADMIN → Admin platform, kelola semua sekolah
ADMIN_SCHOOL → Admin 1 sekolah, kelola data induk + sistem
GURU          → Guru mata pelajaran + wali kelas
SISWA         → Siswa, belajar + kerjakan tugas
ORANG_TUA     → Orang tua, pantau progres anak
```

### Hak Akses per Fitur

| Fitur | SUPER | ADMIN | GURU | SISWA | ORTU |
|-------|-------|-------|------|-------|------|
| Dashboard | ✅ global | ✅ sekolah | ✅ kelas | ✅ pribadi | ✅ anak |
| Kelola Sekolah | ✅ | ❌ | ❌ | ❌ | ❌ |
| Data Induk | ❌ | ✅ | ❌ | ❌ | ❌ |
| Jadwal Pelajaran | ❌ | ✅ | ❌ (lihat) | ❌ | ❌ |
| Wali Kelas | ❌ | ✅ | ❌ (lihat) | ❌ | ❌ |
| Import Data | ❌ | ✅ | ❌ | ❌ | ❌ |
| Materi Pelajaran | ❌ | ❌ | ✅ CRUD | ✅ baca | ✅ baca |
| Tugas/Kuis/Ujian | ❌ | ❌ | ✅ CRUD | ✅ kerjakan | ✅ lihat |
| Kehadiran | ❌ | ❌ | ✅ isi | ✅ lihat sendiri | ✅ lihat anak |
| 7 Kebiasaan | ❌ | ❌ | ✅ isi | ❌ | ✅ isi + rekap |
| Jurnal Mengajar | ❌ | ❌ | ✅ | ❌ | ❌ |
| Input Nilai | ❌ | ❌ | ✅ | ✅ lihat sendiri | ✅ lihat anak |
| Analisis Hasil Belajar | ❌ | ❌ | ✅ | ❌ | ❌ |
| **PANDAI AI** | ❌ | ❌ | ✅ full | ✅ chatbot | ❌ |
| Pengumuman | ❌ | ✅ CRUD | ✅ baca | ✅ baca | ✅ baca |
| Notifikasi | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 👤 3. Akun Demo (Terdaftar di Database)

> Password default semua: `password123` (kecuali Orang Tua: `123`)

### Super Admin
| Username | Password | Nama |
|----------|----------|------|
| `superadmin@pandai.id` | `password123` | Admin NALAR |

### Admin Sekolah
| Username | Password | Nama | Sekolah |
|----------|----------|------|--------|
| `admin.sman1@pandai.id` | `password123` | Dra. Siti Rahayu | SMA Negeri 1 Jakarta |

> Dr. Budi Santoso (SMA Negeri 3 Bandung) belum punya username — login via email tidak tersedia.

### Guru
| Username (NIP) | Password | Nama | Sekolah |
|---------------|----------|------|--------|
| `198504152010011001` | `password123` | Hj. Ratna Dewi, M.Pd | SMA Negeri 1 Jakarta |

> Mr. John Smith, M.Ed dan Ir. Agus Prasetyo, M.Si belum punya username/NIP.

### Siswa
| Username (NISN) | Password | Nama | Kelas |
|----------------|----------|------|-------|
| `0051234567` | `password123` | Ahmad Rizky Pratama | XII IPA 1 |

> Siswa lain (Siti Nurhaliza, Budi Hartono, dll.) belum punya NISN di database.

### Orang Tua
| Username | Password | Nama | Sekolah |
|----------|----------|------|--------|
| `ahmad` | `123` | Bpk. Hasan Basri | SMA Negeri 1 Jakarta |

> Orang tua ini terhubung ke Ahmad Rizky Pratama (parentId).

---

## 🏫 4. Data Referensi (Sekolah, Kelas, Mapel)

### Sekolah
| ID (cuid) | Nama | Kode |
|-----------|------|------|
| `cmscsq8z600mypfv61x9u1sw0` | SMA Negeri 1 Jakarta | SMA1JKT |
| `cmscsq8z700mzpfv6m35djzo9` | SMA Negeri 3 Bandung | SMA3BDG |
| `cmscsq8z800n0pfv6xj1b7mon` | SMK Negeri 2 Surabaya | SMK2SBY |

### Kelas (SMA Negeri 1 Jakarta)
| ID (cuid) | Nama | Grade | Wali Kelas |
|-----------|------|-------|------------|
| `cmscsq8zl00oupfv6k8tbvx29` | XII IPA 1 | 12 | (kosong) |
| `cmscsq8zl00ovpfv6xtpek3jz` | XII IPA 2 | 12 | (kosong) |
| `cmscsq8zl00owpfv6hs71eeha` | XII IPS 1 | 12 | (kosong) |
| `cmscsq8zl00oxpfv6gc0k891u` | XI IPA 1 | 11 | (kosong) |

### Mata Pelajaran
| ID (cuid) | Nama | Kode | Tipe |
|-----------|------|------|------|
| `cmscsq8za00n4pfv6ezr22aik` | Bahasa Indonesia | bindo | wajib |
| `cmscsq8za00n5pfv6bt3tg29d` | Bahasa Inggris | bing | wajib |
| `cmscsq8za00n6pfv69ux3bl3y` | Matematika | mat | wajib |
| `cmscsq8za00n7pfv6cx7emi7u` | Fisika | fis | pilihan |
| `cmscsq8za00n8pfv6wpyyqrjs` | Kimia | kim | pilihan |
| `cmscsq8za00n9pfv6kr0zlzh0` | Biologi | bio | pilihan |
| `cmscsq8za00napfv6bjiyzoy9` | Ekonomi | eko | pilihan |
| `cmscsq8za00nbpfv6iykmynok` | Sosiologi | sos | pilihan |
| `cmscsq8za00ncpfv6az62gf4i` | Sejarah | sej | pilihan |
| `cmscsq8za00ndpfv6k1ffkkxu` | Geografi | geo | pilihan |

---

## 📁 5. Struktur File Proyek

```
src/
├── app/
│   ├── page.tsx                        # Landing page (route /)
│   ├── layout.tsx                      # Root layout + providers
│   ├── authenticated-app.tsx          # ViewRouter + lazy loading
│   └── api/
│       ├── auth/login/route.ts         # POST login
│       ├── auth/register/route.ts      # POST register
│       ├── auth/register-school/route.ts
│       ├── users/route.ts              # CRUD users
│       ├── classes/route.ts            # CRUD + PATCH wali kelas
│       ├── subjects/route.ts           # CRUD subjects
│       ├── questions/route.ts          # CRUD bank soal
│       ├── exams/route.ts              # Exam packages + sessions
│       ├── attempts/route.ts           # Student attempts
│       ├── attendance/route.ts         # Kehadiran
│       ├── character-reports/route.ts  # 7 Kebiasaan
│       ├── teacher-assignments/route.ts
│       ├── teaching-journals/route.ts
│       ├── materials/route.ts          # Materi pelajaran
│       ├── timetable/route.ts          # Jadwal CRUD
│       ├── timetable/bulk/route.ts     # Jadwal bulk upsert
│       ├── announcements/route.ts      # Pengumuman CRUD
│       ├── notifications/route.ts      # Notifikasi
│       ├── import/csv/route.ts         # Import CSV
│       ├── import/template/route.ts    # Download template CSV
│       ├── analytics/route.ts          # Dashboard analytics
│       ├── scores/route.ts             # Agregasi skor
│       ├── backup/route.ts             # Backup database
│       ├── schools/route.ts            # CRUD sekolah
│       ├── schools/lookup/route.ts     # NPSN lookup
│       ├── seed/route.ts               # Seed database
│       ├── ai/                         # ⭐ PANDAI AI (Fitur 1)
│       │   ├── config/route.ts         # GET/PATCH AI config
│       │   ├── generate-questions/route.ts  # POST generate soal
│       │   ├── review-question/route.ts    # PATCH approve/reject
│       │   ├── chatbot/route.ts        # GET/POST/DELETE chatbot
│       │   ├── analyze-difficulty/route.ts # POST analisis kesulitan
│       │   ├── generate-report-desc/route.ts # POST deskripsi rapor
│       │   ├── recommend-questions/route.ts  # POST rekomendasi
│       │   ├── summarize-material/route.ts  # POST ringkasan materi
│       │   └── usage/route.ts          # GET usage stats
│       └── route.ts                    # Root API
├── components/
│   ├── auth/
│   │   ├── login-form.tsx              # Login + demo buttons
│   │   └── register-form.tsx          # Register
│   ├── layout/
│   │   └── app-layout.tsx             # Sidebar + header + NAV_CONFIG
│   ├── landing/
│   │   └── landing-page.tsx           # Landing page
│   ├── dashboard/
│   │   ├── super-admin/               # SuperAdminDashboard + SchoolManager
│   │   ├── admin-sekolah/             # AdminDashboard + ClassManager + UserManager
│   │   ├── guru/                      # GuruDashboard
│   │   ├── siswa/                     # SiswaDashboard
│   │   └── orang-tua/                # OrangTuaDashboard
│   ├── views/
│   │   ├── super-admin-views.tsx      # UsersGlobal, Reports, Analytics, Settings
│   │   ├── admin-school-new-views.tsx # Subjects, TeacherAssign, Backup, ActivityLog
│   │   ├── admin-school-timetable.tsx # TimetableView + WaliKelasView
│   │   ├── admin-school-import.tsx    # ImportCsvView
│   │   ├── admin-school-views.tsx     # (legacy, unused)
│   │   ├── guru-views.tsx             # Materi, Nilai, Analisis, Laporan
│   │   ├── guru-new-views.tsx         # Tugas, Kehadiran, Rekap, Karakter, Jurnal
│   │   ├── guru-ai-views.tsx         # ⭐ GuruPandaiAiView (5 tab)
│   │   ├── siswa-views.tsx            # Riwayat, Nilai
│   │   ├── siswa-new-views.tsx        # Materi, Tugas, Kehadiran
│   │   ├── siswa-ai-views.tsx         # ⭐ SiswaPandaiAiView (chatbot)
│   │   ├── orang-tua-views.tsx        # Nilai, Materi, Kehadiran, Kuis, Laporan
│   │   ├── ortu-new-views.tsx         # Karakter, RekapKarakter
│   │   └── shared-views.tsx           # Profile, Notifications, Broadcasts
│   ├── exam/                          # ExamManager, ExamRunner, ResultsView
│   ├── question/                       # QuestionBank, QuestionEditor
│   ├── analytics/                      # AnalyticsView, ReportsView
│   └── ui/                            # shadcn/ui components (40+ files)
├── hooks/
│   ├── use-mobile.ts
│   └── use-toast.ts
├── lib/
│   ├── db.ts                          # Prisma client singleton
│   ├── ai-helper.ts                   # ⭐ AI SDK wrapper + rate limiter
│   ├── constants.ts                   # Hash/password utilities
│   ├── utils.ts                       # cn(), helpers
│   └── npsn-database.ts               # NPSN lookup data
└── store/
    └── use-store.ts                   # Zustand: User, ViewType, navigation

mini-services/                         # Mini services (port terpisah)
prisma/
├── schema.prisma                      # Database schema
db/
├── custom.db                          # SQLite database file
```

---

## 🗄️ 6. Skema Database (Prisma Models)

### Model Utama

| Model | Deskripsi | Relasi Utama |
|-------|-----------|--------------|
| `School` | Sekolah | → users, classes, examAssignments, questions |
| `User` | Pengguna (multi-role) | → school, class, parent/children |
| `Class` | Rombel | → school, waliKelas, users |
| `Subject` | Mata Pelajaran | → topics, questions, timetables |
| `Topic` | Subtopik | → subject, parent/children, questions |
| `Question` | Bank Soal | → subject, topic, school, creator, reviewer |
| `ExamPackage` | Paket Tryout | → examItems, examSessions |
| `ExamItem` | Soal dalam Paket | → examPackage, question |
| `ExamSession` | Jadwal Tryout | → examPackage, assignments |
| `ExamAssignment` | Distribusi ke Kelas | → examSession, school, class |
| `StudentAttempt` | Pengerjaan Siswa | → user, answers |
| `StudentAnswer` | Jawaban per Soal | → studentAttempt |
| `Attendance` | Kehadiran | → studentId, classId |
| `CharacterReport` | 7 Kebiasaan | → studentId |
| `TeacherAssignment` | Penugasan Guru | → teacherId, subjectId, classId |
| `TeachingJournal` | Jurnal Mengajar | → teacherId, classId |
| `Material` | Materi Pelajaran | → school, subject, topic, class |
| `Timetable` | Jadwal Pelajaran | → class, subject, teacher |
| `Announcement` | Pengumuman | → school, creator |
| `Notification` | Notifikasi | → user |

### Model AI (Fitur 1)

| Model | Deskripsi |
|-------|-----------|
| `AiConfig` | Konfigurasi rate limit per sekolah |
| `AiUsageLog` | Log penggunaan AI (rate tracking) |
| `ChatbotSession` | Sesi chatbot siswa |
| `ChatMessage` | Pesan dalam sesi chatbot |

### Field Penting di Question
```
source      : "manual" | "ai"       → Sumber soal
reviewedBy  : String?                → ID guru yang review (null = belum direview)
reviewedAt  : DateTime?              → Waktu review
status      : "draft" | "published" | "archived"
```
> **Rule**: Soal AI (source="ai") TIDAK BOLEH published sebelum reviewedBy terisi.

---

## 🤖 7. PANDAI AI — Fitur & Rate Limits

### Sub-fitur PANDAI AI

| # | Sub-fitur | Role | API Endpoint |
|---|-----------|------|-------------|
| a | Auto-generate soal PG | GURU | `POST /api/ai/generate-questions` |
| b | Review soal AI | GURU | `PATCH /api/ai/review-question` |
| c | Chatbot siswa (RAG) | SISWA | `POST /api/ai/chatbot` |
| d | Analisis pola kesulitan | GURU | `POST /api/ai/analyze-difficulty` |
| e | Auto-deskripsi rapor | GURU | `POST /api/ai/generate-report-desc` |
| f | Rekomendasi soal personal | GURU/SISWA | `POST /api/ai/recommend-questions` |
| g | Ringkasan materi | GURU | `POST /api/ai/summarize-material` |

### Rate Limits Default (konfigurabel via AiConfig)

| Aksi | Per-User/Hari | Agregat Sekolah/Hari |
|------|---------------|---------------------|
| Generate soal (guru) | 10x | 500x total |
| Deskripsi rapor (guru) | 5x | 500x total |
| Chatbot (siswa) | 20x | 500x total |
| Analisis kesulitan (guru) | 10x | 500x total |
| Ringkasan materi (guru) | 10x | 500x total |
| Rekomendasi soal | 10x | 500x total |

### Bahasa AI Output
- **Default**: Bahasa Indonesia untuk semua output
- **Pengecualian**: Mapel "Bahasa Inggris" → output otomatis English
- Deteksi via `getSubjectLanguage(subjectName)` di `ai-helper.ts`

### RAG Chatbot
- Fetch 5 materi terbaru dari tabel `Material` (filter schoolId + subjectId)
- Materi digunakan sebagai konteks system prompt
- Conversation history: maksimal 20 pesan terakhir
- Jika tidak ada materi: "Tidak ada materi yang tersedia saat ini"

---

## 🎨 8. Design System (Soft UI / Neumorphism)

### Warna Utama
```
Navy primary:   #1F3864 → #2D5AA0 (gradient)
Amber accent:   #F59E0B
Background:     white (default)

Role colors:
  SUPER_ADMIN:  violet-500 → purple-600
  ADMIN_SCHOOL: emerald-500 → teal-600
  GURU:         sky-500 → blue-600
  SISWA:        amber-500 → orange-500
  ORANG_TUA:    rose-400 → pink-500
```

### Komponen Pattern
```tsx
// Card dengan hover lift
<Card className="rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">

// Gradient header
<div className="bg-gradient-to-r from-[#1F3864] to-[#2D5AA0] rounded-t-xl p-6">

// Stat cards
<div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
    <Icon className="h-5 w-5 text-emerald-500" />
  </div>
</div>

// Badge status
<Badge variant="secondary" className="bg-amber-100 text-amber-700">Menunggu Review</Badge>
```

### Shadcn/ui Components (yang sering dipakai)
Card, Button, Badge, Tabs, Select, Input, Textarea, Dialog, AlertDialog, ScrollArea, Separator, Skeleton, Sheet, DropdownMenu, Checkbox, Switch, Tooltip, Toast (sonner)

---

## 🧩 9. Pola Kode (Code Patterns)

### View Component Pattern
```tsx
'use client';
import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';

export function MyView() {
  const user = useAppStore((s) => s.user);
  const currentView = useAppStore((s) => s.currentView);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentView !== 'my-view') return;
    setLoading(true);
    fetch('/api/my-endpoint?schoolId=' + user?.schoolId)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => toast.error('Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [currentView, user?.schoolId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Judul Halaman</h1>
          <p className="text-muted-foreground">Deskripsi singkat</p>
        </div>
      </div>
      {/* content */}
    </div>
  );
}
```

### API Route Pattern
```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    // ... query logic
    return NextResponse.json(data);
  } catch (error) {
    console.error('Endpoint error:', error);
    return NextResponse.json({ error: 'Pesan error Indonesia' }, { status: 500 });
  }
}
```

### Prisma Include → Flat Mapping Pattern
> ⚠️ **PENTING**: Prisma `include` mengembalikan nested objects, tapi frontend mengharapkan flat structure.
```typescript
// ❌ Prisma returns: { creator: { name: "Ratna" } }
// ✅ Frontend expects: { creatorName: "Ratna" }

// Always map in API:
const questions = await db.question.findMany({
  include: { subject: true, creator: { select: { name: true } } },
});
const flat = questions.map(q => ({
  ...q,
  subjectName: q.subject.name,
  creatorName: q.creator.name,
}));
```

### Navigation Registration Checklist
Untuk setiap view baru, update 3 file:
1. **`src/store/use-store.ts`** — Tambah ViewType ke union type
2. **`src/components/layout/app-layout.tsx`** — Tambah ke NAV_CONFIG, VIEW_LABELS, buildBreadcrumbs
3. **`src/app/authenticated-app.tsx`** — Tambah React.lazy import

---

## 🔌 10. API Routes Reference

### Core
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login (username/email + password) |
| POST | `/api/auth/register` | Register pengguna baru |
| POST | `/api/auth/register-school` | Register sekolah baru |
| GET/POST | `/api/users` | CRUD users |
| GET/POST/PATCH | `/api/classes` | CRUD kelas + PATCH wali kelas |
| GET/POST | `/api/subjects` | CRUD mata pelajaran |
| GET/POST/PATCH/DELETE | `/api/questions` | CRUD bank soal |
| GET/POST | `/api/exams` | Exam packages + sessions |
| GET | `/api/attempts` | Student attempts |
| GET/POST/PATCH | `/api/attendance` | Kehadiran |
| GET/POST | `/api/character-reports` | 7 Kebiasaan |
| GET/POST | `/api/teacher-assignments` | Penugasan guru |
| GET/POST | `/api/teaching-journals` | Jurnal mengajar |
| GET/POST | `/api/materials` | Materi pelajaran |
| GET/POST/PATCH/DELETE | `/api/timetable` | Jadwal pelajaran |
| POST/DELETE | `/api/timetable/bulk` | Bulk upsert/delete jadwal |
| GET/POST/PATCH/DELETE | `/api/announcements` | Pengumuman |
| GET/PATCH/POST | `/api/notifications` | Notifikasi |
| POST | `/api/import/csv` | Import CSV |
| GET | `/api/import/template` | Download template CSV |
| GET | `/api/analytics` | Dashboard analytics |
| GET | `/api/scores` | Agregasi skor |
| GET | `/api/backup` | Backup database |

### AI (PANDAI AI)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/PATCH | `/api/ai/config` | Konfigurasi rate limit |
| POST | `/api/ai/generate-questions` | Generate soal AI |
| PATCH | `/api/ai/review-question` | Review soal AI |
| GET/POST/DELETE | `/api/ai/chatbot` | Chatbot siswa |
| POST | `/api/ai/analyze-difficulty` | Analisis kesulitan |
| POST | `/api/ai/generate-report-desc` | Deskripsi rapor |
| POST | `/api/ai/recommend-questions` | Rekomendasi soal |
| POST | `/api/ai/summarize-material` | Ringkasan materi |
| GET | `/api/ai/usage` | Statistik penggunaan |

---

## 📋 11. Roadmap Fitur Inovatif

| # | Fitur | Status | Prioritas |
|---|-------|--------|-----------|
| 🥇 | **PANDAI AI** | ✅ SELESAI | P1 — Kritis |
| 🥈 | **Rapor Digital Interaktif** | 🚧 Belum mulai | P2 — Tinggi |
| 🥉 | **Teka-Teki Harian / Gamifikasi** | 🚧 Belum mulai | P3 — Sedang |
| 4 | **Scan Absensi QR Multi-Layer** | 🚧 Belum mulai | P3 — Sedang |
| 5 | **Analisis Prediktif Drop-Out** | 🚧 Belum mulai | P4 — Rendah |
| 6 | **Konsultasi Guru-Ortu Terjadwal** | 🚧 Belum mulai | P4 — Rendah |
| 7 | **PANDAI Connect** | 🚧 Belum mulai | P5 — Rendah |

---

## 🛠️ 12. Commands

```bash
# Development
bun run dev            # Start dev server (port 3000, auto-restart)
bun run lint           # ESLint check
bun run db:push        # Push Prisma schema to SQLite
bun run db:generate    # Generate Prisma Client
bun run seed           # Seed database

# JANGAN:
bun run build          # Jangan dijalankan (hanya untuk production)
```

---

_Dokumen ini diproduksi otomatis dari eksplorasi codebase. Perbarui saat ada perubahan signifikan._
