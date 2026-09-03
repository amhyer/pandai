# Audit Arsitektur Next.js — PANDAI

**Target repositori:** `amhyer/pandai`  
**Branch yang dianalisis:** `arena/01a064ff-pandai`  
**Tanggal audit:** 2026-09-03  
**Metode:** static review kode, struktur folder, dependency, schema Prisma, route handler, serta penelusuran pola autentikasi/otorisasi dan input handling.

---

## 1. Ringkasan Eksekutif & Tech Stack Overview

### 1.1 Identifikasi Proyek

PANDAI adalah **Sistem Informasi Manajemen Sekolah Digital (SIMANTAP)** multi-tenancy yang ditujukan untuk SD/SMP/SMA/SMK. Fitur utamanya meliputi:

- Autentikasi & RBAC 6 role: `SUPER_ADMIN`, `ADMIN_SCHOOL`, `GURU`, `SISWA`, `ORANG_TUA`, `KEPALA_SEKOLAH`.
- Manajemen sekolah/kelas/subjek, bank soal, ujian/tryout, kehadiran, jurnal mengajar, kotak masukan, profil lulusan 8 dimensi, komponen nilai, rapor PDF.
- Integrasi Dapodik lokal dan API NPSN.
- Fitur AI (generate soal, analisis kesulitan, chatbot, rekomendasi, deskripsi rapor).
- Admin global dan backup/restore database.

Kualitas implementasi saat ini **berada antara prototype cepat dan production-ready**. Banyak domain logic sudah ditulis dan banyak endpoint sudah tersedia, tetapi kontrol akses dan validasi input belum konsisten.

### 1.2 Stack & Ekosistem

| Layer | Teknologi yang ditemukan | Catatan |
|---|---|---|
| Framework | Next.js `^16.1.1` (App Router) | Bersama React `^19.0.0`, TS `^5` |
| Runtime | Bun + Node (script dev memakai `next dev`) | Banyak script masih memakai `bun` |
| UI | Tailwind CSS `^4`, shadcn/ui / Radix UI (`@radix-ui/*` banyak), `lucide-react`, `framer-motion` | `components.json` ada |
| State | Zustand (`use-store.ts`) | TanStack Query ada di `package.json` tapi **tidak digunakan di source** |
| Data fetching | `fetch()` langsung di client + API Route | Tidak ada provider React Query |
| Database | Prisma `^6.11.1` | **Konfigurasi SQLite vs PostgreSQL tidak konsisten** |
| Auth | JWT (`jose`) di cookie `httpOnly` + bcrypt | `next-auth` ada di dependencies tapi tidak dipakai |
| Backup | SQLite file copy / `pg_dump` | Dibungkus `exec()` dengan shell |
| AI | `z-ai-web-dev-sdk` | Via Route Handler server-side |
| Charts/PDF | Recharts, jsPDF | `optimizePackageImports` untuk beberapa paket |
| Validasi | Hampir tidak memakai `zod` di route | `zod` ada di deps tapi tidak terpakai di route |

#### Temuan penting terkait stack

1. **`next-auth` dependency tidak dipakai sama sekali.** Hapus atau ganti dengan auth layer yang jelas (JWT kok bisa, tapi perlu disetarakan).
2. **`@tanstack/react-query` dan `@tanstack/react-table` hampir tidak terpakai.** Kalau memang belum dipakai, hapus untuk mengurangi bundle.
3. **`@mdxeditor/editor` ada di dependency tapi tidak dipakai di `src`.** Ini dependency berat (Lexical/CodeMirror). Segera hapus jika tidak dibutuhkan.
4. **Konfigurasi database tidak konsisten:**
   - `prisma/schema.prisma` → datasource `provider = "postgresql"`.
   - `.env.example` dan `README.md` → `DATABASE_URL=file:./db/custom.db` (SQLite).
   - Ada `prisma/schema.sqlite.prisma`, `schema.postgresql.prisma`, `schema.production.prisma`, `schema.sqlite-backup.prisma`.
   - Ini berisiko membuat `prisma db push` dan build di environment tertentu gagal atau menghasilkan artifact yang berbeda-beda.

### 1.3 Arsitektur Next.js

**Saat ini aplikasi adalah single-page/SPA-style App Router:**

- `src/app/page.tsx` adalah **satu halaman `'use client'`** yang menampilkan landing, login, atau dashboard berdasarkan state `useAppStore`.
- `src/app/authenticated-app.tsx` berisi **peta view dinamis** (`React.lazy` + `next/dynamic`) untuk seluruh fitur.
- Tidak ada route per fitur (`/admin/schools`, `/guru/bank-soal`, dsb.) yang sebenarnya — semua route di-redirect/dianggap sebagai stub.
- API disusun sebagai **Route Handler** (`src/app/api/**/route.ts`), bukan Server Actions.
- Tidak ada `src/middleware.ts`, tapi ada `src/proxy.ts` yang dipakai untuk **security headers** dan **rate limiting pada API**. File ini tidak melakukan proteksi halaman.

**Implikasi arsitektur:**

| Aspek | Evaluasi |
|---|---|
| Server Components | Hanya `layout.tsx`, `error.tsx`, `not-found.tsx` yang benar-benar server-side |
| Client Components | 62 file `.tsx/.ts` memakai `'use client'` dari 112 file `.tsx`; hampir seluruh aplikasi client-heavy |
| Route Handlers | 93 route handler; 68 di antaranya memakai helper auth (`requireAuth` / `requireRole`) |
| Server Actions | Tidak dipakai, semua mutasi lewat `fetch` ke API |
| Route protection | **Tidak ada proteksi page-level di server.** Hanya gating di client (`isAuthenticated` di Zustand). Data penting tetap harus atau sudah dilindungi di API |
| Rendering | Semua konten utama di-render client-side; landing page juga client-side |
| Caching | Tidak memakai `next/fetch` cache, ISR, atau `revalidateTag` untuk data app |
| Middleware | `proxy.ts` hanya rate limit + headers, bukan auth dan bukan route guard |

---

## 2. Analisis Struktur & Alur Data

### 2.1 Struktur Folder

```
src/
├── app/                     # App Router: page, layout, error, not-found, api
├── components/
│   ├── ui/                  # shadcn UI
│   ├── auth/
│   ├── dashboard/
│   ├── views/
│   └── ...
├── hooks/                   # 2 file saja
├── lib/                     # db, auth, scope, sanitize, dapodik, pdf, etc.
├── store/use-store.ts       # Zustand global
└── proxy.ts                 # rate limit + headers
```

**Kelebihan:**

- Pemisahan `lib` (domain/helper), `components/ui` (presentational), `components/views` (fitur), dan `app/api` (boundary) sudah cukup jelas.
- Reusable scope helpers di `src/lib/scope.ts` (`requireSchoolScope`, `getSchoolFilter`, `requireStudentScope`) adalah fondasi yang bagus untuk kontrol multi-tenant.

**Kekurangan / best practices yang belum diterapkan:**

1. **Monolith `page.tsx` (461 baris)** dan `authenticated-app.tsx` (190 baris) memuat seluruh routing UI. Ini sulit di-test, sulit di-lazy-load dengan benar, dan tidak memanfaatkan route-level cashing/streaming Next.js.
2. **Route “per fitur” hanya stub** yang `router.replace('/')`, sehingga tidak ada real routing. URL tidak menggambarkan resource (`/users`, `/schools`, `/questions`), buruk untuk SEO, deep-link, dan audit.
3. **Konsep role & view bercampur di banyak file**: `UserRole` di `store`, `ROLE_LABELS` di `constants`, `NAV_CONFIG` di `app-layout`, dan daftar komponen di `authenticated-app`. Mudah divergence.
4. **File `.bak`, `.bak2`, `.full` masih ada di `src/app`.** Ini tidak boleh masuk production.
5. **`src/agent-ctx/p05-08.md` ada di dalam `src/`** — kemungkinan bukan code yang seharusnya di-ship.
6. Belum ada `src/components/features/` atau `src/modules/` untuk memisahkan domain secara tegas.

### 2.2 Strategi Rendering & Caching

| Strategi | Status |
|---|---|
| SSG | Landing page feasible tetapi saat ini client-side |
| SSR | Tidak dipakai secara eksplisit; semua data via client fetch |
| ISR | Tidak dipakai untuk data bisnis |
| Route-level streaming (`Suspense`) | Ada fallback skeleton internal, tapi tidak memakai `loading.tsx` di level route |
| `fetch` caching | Tidak ada `next: { revalidate }` pada data bisnis |
| `revalidateTag` / `revalidatePath` | Tidak ada |
| `next/image` | Tidak digunakan sama sekali, juga tidak ada `<img>` |
| `next/font` | Ya, `Geist` dan `Geist_Mono` dipakai di `layout.tsx` |
| `next/script` | Tidak digunakan |
| Dynamic import | Banyak `React.lazy` di `authenticated-app.tsx` — bagus untuk code splitting, namun peta view besar di satu file |

**Rekomendasi utama:** pindahkan ke **route-per-feature** dan gunakan **Server Components untuk halaman/hooks data**, sehingga browser hanya menerima data yang memang perlu. SPA penuh ini mengirim banyak JavaScript di awal dan tidak dapat memanfaatkan caching server.

### 2.3 Alur Data & State

Alur saat ini:

```
Browser UI (Zustand state)
   │
   ├─ fetch('/api/auth/me')            → restore session
   ├─ fetch('/api/...')                → data fetch per fitur
   └─ update useAppStore               → re-render view

API Route Handler
   ├─ requireAuth/requireRole         → sesi JWT cookie
   ├─ Prisma query                     → DB
   └─ NextResponse.json                → kembali ke client
```

**Masalah dalam alur ini:**

1. Client menganggap dirinya sudah “authorized” berdasarkan **state di browser**. Ini hanya UX; keamanan nyata harus tetap di API.
2. Karena seluruh app di-render di client, **tidak ada RSC data fetching**, sehingga data tidak bisa di-stream saat pertama load dan selalu ada round-trip tambahan.
3. `useAppStore` dipakai sebagai “router” (`currentView`) sekaligus “auth state”. Pemisahan source of truth untuk auth dan navigation sebaiknya dibedakan.
4. Karena API Route Handler adalah source of truth yang paling kuat, **semua bug `requireAuth` di API menjadi sangat kritis**.

---

## 3. Audit Keamanan & Proteksi Celah Vulnerability (OWASP)

### 3.1 Matriks Temuan

| # | Temuan | File | Severity | Dampak |
|---:|---|---|---:|---|
| S-01 | Reset password publik tanpa autentikasi | `src/app/api/users/[id]/reset-password/route.ts` | **Critical** | Attacker dapat mereset password user mana pun |
| S-02 | CRUD admin sekolah publik tanpa auth | `src/app/api/schools/[id]/admin-account/route.ts` | **Critical** | Attacker dapat membuat/mengubah admin dan password school lain |
| S-03 | `exam-items` publik + expose answer/explanation | `src/app/api/exam-items/route.ts` | **Critical** | Answer key bocor ke publik |
| S-04 | Notifikasi publik via `userId` query/body | `src/app/api/notifications/route.ts`, `[id]/route.ts`, `mark-all-read/route.ts` | **Critical** | Privacy leak + IDOR |
| S-05 | Announcement publik + full CRUD | `src/app/api/announcements/route.ts` | **Critical** | Attackers dapat membuat/menghapus pengumuman & spam notifikasi |
| S-06 | Registrasi sekolah publik tanpa verifikasi | `src/app/api/auth/register-school/route.ts` | **High** | School squatting / claim NPSN, membuat admin sekolah |
| S-07 | SSRF pada Dapodik Connect | `src/app/api/dapodik/connect/route.ts` | **Critical** | Arbitrary server URL + default token di source |
| S-08 | Dapodik proxies tidak ada auth | `src/app/api/dapodik-proxy/route.ts`, `src/app/api/dapodik/proxy/route.ts` | **High** | Open proxy ke local service, informasi endpoint |
| S-09 | Kunci token default tertanam di kode | `src/app/api/dapodik/connect/route.ts` | **High** | `DEFAULT_TOKEN = '7FJ9KP0Q3W8H6R2D5T1V'` |
| S-10 | Dua sistem auth yang saling tidak berhubungan | `src/lib/auth.ts` (JWT cookie) vs `src/lib/auth-guard.ts` (Bearer `sessionToken`) | **High** | Route yang memakai `auth-guard` bisa tidak berfungsi / salah guard |
| S-11 | Weak password fallback | `src/app/api/users/reset-password/route.ts` | **High** | `newPassword || '123'` |
| S-12 | `change-password` tidak mengambil user dari session | `src/app/api/auth/change-password/route.ts` | **Medium** | IDOR + tidak konsisten dengan route lain |
| S-13 | Missing school-scope pada banyak GET | `src/app/api/exam-sessions/route.ts`, `questions`, `classes`, dsb. | **High** | User dapat membaca data sekolah lain |
| S-14 | Input tidak tervalidasi dengan schema | banyak route | **Medium** | Error handling, data tidak valid, potensi injection logic |
| S-15 | CSP terlalu longgar | `src/proxy.ts` | **Medium** | `'unsafe-inline'` + `'unsafe-eval'` di script-src |
| S-16 | `allowedDevOrigins: ["*"]` | `next.config.ts` | **Medium** | Over-permissive untuk non-dev |
| S-17 | `typescript.ignoreBuildErrors: true` | `next.config.ts` | **Medium** | Type error bisa lolos ke build |
| S-18 | `reactStrictMode: false` | `next.config.ts` | **Low** | Menutupi bug double-invoke / hydration |
| S-19 | `exec()` dengan `DATABASE_URL` di shell | `src/app/api/backup/route.ts` | **Medium** | Risk command injection jika env terkontaminasi; lebih baik gunakan `pg_dump` args array |
| S-20 | Tidak ada `Origin`/referer check untuk state-changing API | all API | **Medium** | SameSite `Lax` membantu, tapi perlu defense-in-depth |

### 3.2 Detail Temuan Kritis

#### S-01 — Reset password publik (IDOR / privilege escalation)

**File:** `src/app/api/users/[id]/reset-password/route.ts`

```ts
// BEFORE — tidak ada requireAuth/requireRole, tidak ada scope check
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const newPassword = body.newPassword;

  // ... hanya cek length 6, lalu update password user id mana pun
  const hashedPassword = await hashPassword(newPassword);
  await db.user.update({ where: { id }, data: { password: hashedPassword } });

  return NextResponse.json({
    success: true,
    newPassword,        // mengembalikan password baru ke attacker!
  });
}
```

**Fix:** gunakan `requireRole` dan pastikan `ADMIN_SCHOOL` hanya bisa reset user di school-nya sendiri. Jangan pernah mengembalikan password dalam response.

```ts
// AFTER
import { requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const authed = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { id } = await params;
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 });
    }

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, schoolId: true },
    });
    if (!target) return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });

    if (authed.role !== 'SUPER_ADMIN') {
      requireSchoolScope(authed, target.schoolId!);
    }

    await db.user.update({
      where: { id },
      data: {
        password: await hashPassword(newPassword),
        mustChangePassword: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal mereset password' }, { status: 500 });
  }
}
```

#### S-02 — Admin account route publik

**File:** `src/app/api/schools/[id]/admin-account/route.ts`

Seluruh `GET`, `POST`, dan `PATCH` tidak memanggil `requireRole`. `POST` bahkan membuat password default `'password123'` jika tidak diberikan, dan `PATCH` mengembalikan `newPassword` ke client.

**Fix singkat:**

```ts
import { requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const authed = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    const { id } = await params;
    if (authed.role !== 'SUPER_ADMIN') requireSchoolScope(authed, id);

    // validasi email/password dengan zod, jangan pakai password123 default
    // ...
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal memproses akun admin' }, { status: 500 });
  }
}
```

#### S-03 — `exam-items` bocorkan answer key

**File:** `src/app/api/exam-items/route.ts`

```ts
// BEFORE — publik, include question penuh
export async function GET(request: Request) {
  const items = await db.examItem.findMany({
    where: { examPackageId },
    include: { question: { include: { subject: true, topic: true } } },
  });
  return NextResponse.json(items); // answer + explanation ikut
}
```

**Fix:**

```ts
// AFTER — auth + sanitasi answer key + scope check
import { requireRole, AuthError } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authed = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']);
    const { searchParams } = new URL(request.url);
    const examPackageId = searchParams.get('examPackageId');
    if (!examPackageId) {
      return NextResponse.json({ error: 'examPackageId is required' }, { status: 400 });
    }

    const pkg = await db.examPackage.findUnique({
      where: { id: examPackageId },
      select: { schoolId: true },
    });
    if (!pkg) return NextResponse.json({ error: 'Paket ujian tidak ditemukan' }, { status: 404 });

    // Global package (schoolId null) boleh diakses semua sekolah;
    // package privat harus scope-matched.
    if (pkg.schoolId && authed.role !== 'SUPER_ADMIN' && authed.schoolId !== pkg.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const items = await db.examItem.findMany({
      where: { examPackageId },
      include: {
        question: {
          include: { subject: { select: { id: true, name: true } }, topic: { select: { id: true, name: true } } },
          // JANGAN include answer/explanation pada response ini
        },
      },
      orderBy: { orderNum: 'asc' },
    });

    // Hanya return field yang aman
    return NextResponse.json(items.map((i) => ({
      id: i.id,
      orderNum: i.orderNum,
      points: i.points,
      question: {
        id: i.question.id,
        content: i.question.content,
        options: i.question.options, // tetap hati-hati bila options mengandung isCorrect
        type: i.question.type,
        difficulty: i.question.difficulty,
      },
    })));
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal mengambil data soal paket' }, { status: 500 });
  }
}
```

**Catatan tambahan:** field `Question.options` adalah JSON string dan bisa mengandung `isCorrect`. Untuk endpoint siswa, sanitasi harus menghapus `isCorrect` dari tiap option:

```ts
const safeOptions = JSON.parse(i.question.options ?? '[]').map(
  ({ label, text }: any) => ({ label, text })
);
```

#### S-04 — Notifikasi publik + IDOR

**File:** `src/app/api/notifications/route.ts`, `notifications/[id]/route.ts`, `notifications/mark-all-read/route.ts`

Semua endpoint mempercayai `userId` dari query/body tanpa autentikasi, sehingga siapa pun bisa membaca/menandai menghapus notifikasi orang lain.

**Fix:**

```ts
// AFTER
import { requireAuth, AuthError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req); // JWT cookie -> userId asli
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const unreadOnly = searchParams.get('unread') === 'true';

    const where: Record<string, unknown> = { userId: user.userId }; // JANGAN dari query
    if (category && category !== 'semua') where.category = category;
    if (unreadOnly) where.isRead = false;

    const notifications = await db.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });

    return NextResponse.json({ data: notifications });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal mengambil notifikasi' }, { status: 500 });
  }
}
```

Untuk `PATCH /api/notifications/[id]` dan `DELETE`, tambahkan scope:

```ts
const notification = await db.notification.findUnique({ where: { id } });
if (!notification || notification.userId !== user.userId) {
  return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
}
await db.notification.update({
  where: { id },
  data: { isRead: true },
});
```

#### S-05 — Announcement publik

**File:** `src/app/api/announcements/route.ts`

Seluruh `GET/POST/PATCH/DELETE` publik. **Fix:** untuk `POST/PATCH/DELETE`, `requireRole(['SUPER_ADMIN', 'ADMIN_SCHOOL'])`, pastikan `schoolId` sesuai scope, dan `createdById` diambil dari session (bukan body). `GET` juga sebaiknya potong field sensitif bila perlu.

#### S-06 — Registrasi sekolah tanpa verifikasi

**File:** `src/app/api/auth/register-school/route.ts`

Endpoint ini membuat `School` + `Subscription` + `ADMIN_SCHOOL` sekaligus. Karena `NPSN` adalah informasi publik, attacker dapat **menyandera NPSN** yang belum terdaftar.

**Rekomendasi:**

- Tambahkan **invite/approval flow** (misal butuh `inviteToken` dari super admin).
- Atau batasi self-service sampai “pending approval” dan jangan langsung aktif.
- Gunakan `domain` email yang cocok dengan domain sekolah bila memungkinkan, tapi bukan satu-satunya kontrol.
- Tambahkan rate limit dan anti-abuse di `proxy.ts`.

#### S-07/S-08/S-09 — Dapodik SSRF & token default

**File:** `src/app/api/dapodik/connect/route.ts`

```ts
// BEFORE
const DEFAULT_TOKEN = '7FJ9KP0Q3W8H6R2D5T1V'; // secret di source!

function normalizeUrl(serverUrl: string): string {
  // user bisa berikan http://169.254.169.254/... atau http://internal.host:8000
}

export async function POST(request: Request) {
  const { serverUrl, token: userToken, action } = await request.json();
  const baseUrl = normalizeUrl(serverUrl || 'localhost:8881');
  const token = userToken || DEFAULT_TOKEN;
  // fetch ke arbitrary URL
}
```

**Fix:**

```ts
// AFTER
import { requireRole, AuthError } from '@/lib/auth';

const ALLOWED_DAPODIK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const ALLOWED_DAPODIK_PORTS = new Set(['5774', '8881']);

export async function POST(request: Request) {
  try {
    await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);

    const { serverUrl, token: userToken, action, npsn, bentuk } = await request.json();

    if (!userToken) {
      return NextResponse.json({ error: 'Token Dapodik wajib diisi' }, { status: 400 });
    }

    const baseUrl = normalizeUrl(serverUrl || 'localhost:8881');
    const parsed = new URL(baseUrl);

    if (!ALLOWED_DAPODIK_HOSTS.has(parsed.hostname) || !ALLOWED_DAPODIK_PORTS.has(parsed.port)) {
      return NextResponse.json({ error: 'Server Dapodik tidak diizinkan' }, { status: 403 });
    }

    // gunakan token dari request saja; tidak pernah fallback ke hardcoded secret
    // ...
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal menghubungi Dapodik' }, { status: 500 });
  }
}
```

Aturan SSRF yang disarankan untuk semua proxy:

1. Jangan biarkan client mengirimkan host secara bebas; ambil dari env (`process.env.DAPODIK_BASE_URL`).
2. `localhost`, `127.0.0.1`, `[::1]` saja bila memang perlu.
3. Blokir hostname yang ter-resolve ke IP privat (misal dengan DNS lookup).
4. Batasi port dan path.

#### S-10 — Dua sistem auth yang berbeda

`src/lib/auth.ts` memakai **JWT cookie**. `src/lib/auth-guard.ts` memakai **Bearer token + field `sessionToken` di DB**.

Kedua helper memiliki nama `requireAuth`. Route yang memakai `auth-guard`:

- `src/app/api/reports/downloads/route.ts`
- `src/app/api/users/reset-password/route.ts`

Masalahnya:

- `auth-guard` akan **selalu gagal** jika client hanya mengirim cookie (client app memakai cookie), karena `auth-guard` mencari `Authorization: Bearer ...`.
- `users/reset-password` (kini broken) akan menghasilkan 401 untuk user yang valid.
- Field `sessionToken` di `User` tidak pernah di-set saat login.

**Rekomendasi:** hapus `auth-guard.ts` atau refactor agar satu helper saja. Jika Bearer token memang diperlukan untuk `pull-dapodik.exe`, buat fungsi sendiiri yang menghasilkan token terpisah, masih dengan identitas valid dari server.

#### S-13 — Missing school scope pada GET

Contoh di `src/app/api/exam-sessions/route.ts`:

```ts
// BEFORE — user dapat mengkhususkan schoolId lain
const schoolId = searchParams.get('schoolId') || user.schoolId;
const where = { schoolId };
```

**Fix:**

```ts
// AFTER
import { getSchoolFilter } from '@/lib/scope';

const effectiveSchoolId = getSchoolFilter(user) || searchParams.get('schoolId');
// untuk non-super-admin, validasi tambahan:
if (user.role !== 'SUPER_ADMIN' && schoolIdParam && schoolIdParam !== user.schoolId) {
  return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
}
```

#### S-14 — Input validation

Hampir semua route menerima `request.json()` tanpa schema. Ini membuat error handling tidak terprediksi dan sulit menjaga invariants data (misalnya `orderNum`, `points`, `grade`, `JSON.parse`).

**Rekomendasi:** tambahkan helper `parseBody` dengan `zod` di semua route mutasi.

```ts
// lib/http.ts
import { z } from 'zod';

export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T>; error?: string }> {
  try {
    const json = await request.json();
    const result = schema.safeParse(json);
    if (!result.success) {
      return { data: {} as z.infer<T>, error: result.error.issues[0]?.message ?? 'Data tidak valid' };
    }
    return { data: result.data };
  } catch {
    return { data: {} as z.infer<T>, error: 'Body bukan JSON valid' };
  }
}
```

Contoh pemakaian:

```ts
const schema = z.object({
  name: z.string().min(1).max(100),
  grade: z.number().int().min(1).max(12),
  academicYear: z.string().max(20).optional(),
  waliKelasId: z.string().optional().nullable(),
});

const { data, error } = await parseBody(request, schema);
if (error) return NextResponse.json({ error }, { status: 400 });
```

#### S-15/S-16/S-17 — Config hardening

```ts
// BEFORE (next.config.ts)
typescript: { ignoreBuildErrors: true },
reactStrictMode: false,
allowedDevOrigins: ["*"],
```

```ts
// AFTER
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === '1' ? { output: 'standalone' as const } : {}),
  typescript: {
    ignoreBuildErrors: false, // build harus gagal bila ada type error
  },
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  serverExternalPackages: ['pdfkit', 'jspdf', 'mammoth'],
  experimental: {
    optimizePackageImports: ['recharts', 'framer-motion', 'date-fns', 'lucide-react', '@radix-ui/react-icons'],
  },
  // Jangan pernah pakai "*" di production; set domain internal/dev secara eksplisit.
  allowedDevOrigins: process.env.NODE_ENV === 'production'
    ? []
    : [process.env.NEXT_PUBLIC_DEV_ORIGIN ?? 'http://localhost:3000'],
};

export default nextConfig;
```

**CSP yang disarankan (setidaknya untuk production):**

```
default-src 'self';
script-src 'self'; /* sedapat mungkin hilangkan unsafe-inline/unsafe-eval */
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob:;
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

Bila inline script absolut tidak bisa dihindari, gunakan nonce/hash CSP alih-alih `'unsafe-inline'`.

---

## 4. Optimasi Performa & Kualitas Kode

### 4.1 Performance Bottlenecks

#### 4.1.1 `next/image` tidak digunakan

Tidak ada `<img>` maupun `next/image` di `src`. Tidak ada masalah besar saat ini karena app belum banyak pakai gambar. Namun bila landing page nanti memakai foto, wajib memakai `next/image` (`fill`, `sizes`, `loader` untuk remote) supaya otomatis `srcset`, `webp/avif`, dan lazy-loading.

#### 4.1.2 `next/font` — sudah benar

`src/app/layout.tsx` memakai `Geist` dan `Geist_Mono` via `next/font/google`. Sudah baik dan mengurangi `FOIT`.

#### 4.1.3 `next/script` — belum dipakai

Belum ada script eksternal. Jika nanti ada analytics, wajib `next/script` dengan strategy `afterInteractive` / `lazyOnload`, dan cek pola consent.

#### 4.1.4 Client Component Abuse

62 file memakai `'use client'`. Analisis cepat:

- **Pantas `'use client'`:** form, tabel interaktif, drag/drop, chart, layout yang pakai state, komponen Radix, sidebar toggle, `useAppStore`.
- **Tidak perlu `'use client'`:** banyak komponen yang sebenarnya hanya presentational dan melakukan fetch. Karena seluruh app sudah client-side, ini tidak langsung merusak, tapi membuat bundel utama sangat besar.

Contoh pola yang bisa dipindah ke Server Components / Server Actions:

```tsx
// BEFORE — client component dengan fetch
'use client';
export default function ClassList() {
  const [classes, setClasses] = useState([]);
  useEffect(() => {
    fetch('/api/classes').then((r) => r.json()).then(setClasses);
  }, []);
  return <ul>{classes.map((c: any) => <li>{c.name}</li>)}</ul>;
}
```

```tsx
// AFTER — Server Component + server side fetch (dalam route-per-feature)
import { requireRole } from '@/lib/auth';
import { getSchoolFilter } from '@/lib/scope';

export default async function ClassList() {
  // Hanya feasible jika di dalam Server Action/Page Server Component
  const classes = await db.class.findMany({ where: { schoolId: '...' } });
  return <ul>{classes.map((c) => <li key={c.id}>{c.name}</li>)}</ul>;
}
```

#### 4.1.5 Dynamic import & code splitting

`authenticated-app.tsx` sudah memakai `React.lazy` dan `Suspense`. Ini bagus.

Namun masalah: **`page.tsx` itu sendiri besar (461 baris)** dan memuat landing page, auth restore, dan dashboard wrapper. `AuthenticatedApp` di-load dengan `dynamic(..., { ssr: false })`, sehingga user tidak dapat melihat skeleton server-side sebelum JS selesai diunduh. Ini memperburuk TTFB/LCP dan SEO untuk landing.

**Rekomendasi:** pisahkan landing page ke Server Component biasa (tanpa `'use client'`), dan buat route group untuk dashboard:

```
src/app/(public)/page.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/register/page.tsx
src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/admin/schools/page.tsx
...
```

#### 4.1.6 Bundle size / dependency bloat

Dependency yang berisiko besar dan perlu diaudit:

- `@mdxeditor/editor` — **tidak terpakai di `src`**, sangat besar.
- `next-auth` — **tidak terpakai**.
- `@tanstack/react-query` — tidak terpakai (hanya deps).
- `@tanstack/react-table` — mungkin terpakai? Perlu dicek; kalau tidak, hapus.
- `xlsx`, `mammoth`, `jspdf`, `sharp` — dipakai oleh fitur import/PDF, tapi harus dynamic import di sisi server agar tidak membengkakkan client bundle.
- `react-syntax-highlighter` — tidak terpakai di `src`.

Rekomendasi prioritas:

```bash
bun remove next-auth @mdxeditor/editor
bun remove @tanstack/react-query @tanstack/react-table  # hanya jika benar-benar tidak dipakai
```

### 4.2 Error Handling & Boundary

| File | Status |
|---|---|
| `src/app/error.tsx` | ✅ Ada |
| `src/app/not-found.tsx` | ✅ Ada |
| `src/app/loading.tsx` | ❌ Tidak ada |
| `src/app/(dashboard)/error.tsx`, `loading.tsx`, `not-found.tsx` | ❌ Tidak ada |

**Rekomendasi:** tambahkan `loading.tsx` dengan skeleton, dan tambahkan Error Boundary per segment dashboard. Karena hampir semua view di-load via `React.lazy`, error pada satu view akan menjatuhkan seluruh aplikasi bila tidak diatur dengan lebih granular. Pertimbangkan `ErrorBoundary` per fitur + per route.

### 4.3 Menghilangkan file artefak

Hapus file yang tidak seharusnya masuk production:

```bash
rm src/app/page.tsx.bak src/app/page.tsx.bak2 src/app/page.tsx.full
```

---

## 5. Rekomendasi & Action Plan

### 5.1 Perbaikan Mendesak (Kritis / Security) — lakukan segera, dalam sprint pertama

| No | Tindakan | Target |
|---|---|---|
| 1 | Tambahkan `requireRole` + school scope ke `users/[id]/reset-password`, `schools/[id]/admin-account`, `exam-items`, `announcements`, `notifications/*`, `dapodik/*`, `dapodik-proxy` | Semua endpoint mutasi & sensitif |
| 2 | Hilangkan fallback password default `'password123'` dan `'123'` | `schools/[id]/admin-account`, `users/reset-password` |
| 3 | Hapus `DEFAULT_TOKEN` hardcoded dari kode | `dapodik/connect` |
| 4 | Hardening SSRF Dapodik: allowlist host/port, validasi URL, timeout, body size | `dapodik/connect`, `dapodik/proxy`, `dapodik-proxy` |
| 5 | Samakan sistem auth: hapus/implementasikan ulang `auth-guard.ts` agar konsisten dengan JWT cookie | `auth-guard.ts`, `reports/downloads`, `users/reset-password` |
| 6 | Sanitasi response soal: jangan pernah mengirim `answer`, `explanation`, `options[].isCorrect` ke siswa | `exam-items`, `questions`, `exam-session`, `attempts` |
| 7 | Enforce school scope di semua route yang menerima `schoolId` dari query/body | seluruh `/api` |
| 8 | Tambahkan validasi `zod` di semua route mutasi | seluruh `/api` |
| 9 | Jangan kembalikan password (termasuk temp password) di API response | semua route reset/akun |
| 10 | Hapus file backup/artefak (`page.tsx.bak`, `.full`, `agent-ctx` dalam `src`) dari source | repo |

### 5.2 Peningkatan Performa & Refactoring

**Prioritas 1 — Route-per-feature + Server Components:**

Ubah arsitektur dari:

```
page.tsx (SPA) -> authenticated-app.tsx -> React.lazy view
```

menjadi:

```
app/(public)/page.tsx
app/(public)/login/page.tsx
app/(public)/register/page.tsx
app/(dashboard)/dashboard/page.tsx
app/(dashboard)/admin/schools/page.tsx
app/(dashboard)/admin/classes/page.tsx
app/(dashboard)/guru/bank-soal/page.tsx
...
```

Setiap page memakai layout segment, `loading.tsx`, `error.tsx`, dan `not-found.tsx`. UI yang interaktif (`'use client'`) hanya di komponen leaf (form, tabel, chart), bukan seluruh page.

**Prioritas 2 — One-liner helper for API:**

Buat helper middleware/function untuk memangkas duplikasi auth.

```ts
// lib/route-handler.ts
import { z } from 'zod';
import { requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter } from '@/lib/scope';

export async function guardRoute(
  request: Request,
  roles: string[],
) {
  const user = await requireRole(request, roles);
  return {
    user,
    schoolFilter: getSchoolFilter(user),
    requireSchool: (schoolId?: string | null) => {
      if (!schoolId) return;
      if (user.role !== 'SUPER_ADMIN' && schoolId !== user.schoolId) {
        throw new AuthError('Akses ditolak — bukan sekolah Anda', 403);
      }
    },
  };
}
```

**Prioritas 3 — Database query & N+1:**

Banyak route menggunakan `findMany` + `_count`, lalu melakukan additional query di loop (misal `Promise.all` enrichment di `suspicious-access`). Untuk skala besar, review:

- Index Prisma untuk query yang sering dipakai (`schoolId`, `userId`, `classId`, `createdAt`).
- Gunakan `Promise.all` dengan hati-hati agar tidak melebihi pool DB.
- Gunakan raw query parameterized bila memerlukan agregasi kompleks, bukan loop per row.
- Untuk dashboard, buat endpoint agregasi yang mengembalikan ringkasan, bukan seluruh rows.

**Prioritas 4 — Cache layer:**

- Tambahkan `revalidateTag` / `revalidatePath` untuk data yang jarang berubah (misal data sekolah, bank soal global).
- Gunakan `unstable_cache` atau Redis (Upstash/Bun/Yellow/Redis) di production multi-instance.
- Untuk halaman publik, pakai `export const revalidate = 300` + Static Rendering bila memungkinkan.
- Hindari memakai in-memory `Map` di `rate-limit.ts` bila ingin scale multi-instance. Pindah ke Redis + `RateLimiter` atau platform-level enforcement.

### 5.3 Saran Fitur & Skalabilitas

1. **Multi-tenancy hardening**
   - Buat `requireTenantScope` universal agar semua query prisma otomatis dibatasi oleh `schoolId`.
   - Gunakan helper `Prisma.Extends`/Client Extension untuk `where.schoolId = auth.schoolId` pada model tenanted.
   - Pindahkan `schoolId` dari query body ke session.

2. **Auth session lebih kuat**
   - Tambahkan JWT refresh + revoke list, atau session table (misal `Session { jti, userId, expiresAt }`).
   - Update/modify JWT claims ketika role/school berubah; gunakan `sessionVersion` di user untuk memaksa logout pada password reset.
   - Tambahkan `logout` endpoint dan clear `sessionToken` jika mau memakai Bearer.

3. **API-boundary yang konsisten**
   - Standardisasi response envelope: `{ success, data, error }`.
   - Tambahkan `requestId` di response header untuk observability.
   - Tambahkan error logging terpusat (sudah ada `error-log.ts`, diperkuat).

4. **Monitoring & observability**
   - Pindah dari `console.error` ke logging terstruktur (JSON) + OpenTelemetry.
   - Pantau rate limit, 401/403, 4xx dari dapodik, dan pola penyalahgunaan API.

5. **Testing**
   - Tambahkan integrasi test untuk route auth kritis (login, reset password, school scope, exam answer leak, notifications IDOR).
   - Saat ini ada banyak script test manual (`test-all-groups.js`, `final-audit.sh`), tapi belum ada automated test suite yang terkait dengan CI sepenuhnya.

6. **Database migration**
   - Pilih satu database: **PostgreSQL** untuk production multi-school.
   - Hapus `schema.sqlite*`, `schema.production.prisma`, `*.bak` agar tidak membingungkan deploy.
   - Pastikan `.env.example` konsisten dengan datasource.

7. **CI/CD**
   - Set `typescript.ignoreBuildErrors` menjadi `false`.
   - Jalankan `eslint .`, `tsc --noEmit`, unit test, dan security scan (`npm audit`, `/api` smoke test) di workflow.
   - Jangan commit dummy `.db`, `.sqlite`, screenshot, atau file `agent-ctx` ke repo utama.

---

## Lampiran C — Status Implementasi Perbaikan (2026-09-03)

Berikut perbaikan yang sudah diimplementasikan pada branch kerja `arena/01a064ff-pandai` setelah audit ini dibuat.

### C.1 Auth & Tenancy
- ✅ `POST /api/users/[id]/reset-password` sekarang wajib `SUPER_ADMIN`/`ADMIN_SCHOOL`, dengan school-scope dan kebijakan password baru.
- ✅ `GET/POST/PATCH /api/schools/[id]/admin-account` sekarang diautentikasi + tenancy, tanpa password default.
- ✅ `GET/POST/PATCH/DELETE /api/exam-items` sekarang diautentikasi, dengan tenancy scope dan sanitasi `answer`/`explanation`/`options[].isCorrect`.
- ✅ `GET/POST /api/notifications`, `PATCH/DELETE /api/notifications/[id]`, dan `PATCH /api/notifications/mark-all-read` sekarang memakai session (`userId` dari cookie), bukan dari query/body.
- ✅ `GET/POST/PATCH/DELETE /api/announcements` sekarang diautentikasi dengan school-scope.
- ✅ `POST/DELETE /api/timetable/bulk` sekarang diautentikasi + school-scope + verifikasi class-school.
- ✅ `GET /api/dapodik/status`, `GET /api/dapodik-proxy`, `POST /api/dapodik/proxy`, `POST /api/dapodik/connect`, dan `POST /api/schools/lookup-local` sekarang diautentikasi.
- ✅ `GET /api/import/template` sekarang diautentikasi.
- ✅ `POST /api/exam-sessions` dan `GET /api/analytics/item-analysis` menggunakan school-scope.
- ✅ `reports/downloads` dipindahkan dari `auth-guard.ts` (Bearer token) ke `requireAuth` (JWT cookie) sehingga berfungsi dengan aplikasi.

### C.2 Privilege Escalation & Data Leak
- ✅ `POST /api/users` sekarang memvalidasi role yang boleh dibuat per actor (`ADMIN_SCHOOL` tidak bisa membuat `SUPER_ADMIN`/`ADMIN_SCHOOL`).
- ✅ Semua response `users` (GET/POST/PATCH/PUT) melewati `sanitizeUser()`, sehingga **password hash dan `sessionToken` tidak pernah dikirim** ke browser.
- ✅ `GET /api/questions` untuk `SISWA` menghapus `answer`, `explanation`, dan `options[].isCorrect`.
- ✅ `GET /api/exam-items` tidak lagi mengembalikan answer key.
- ✅ `POST /api/users/reset-password` dan reset admin tidak lagi mengembalikan raw password baru.

### C.3 Input Validation & Password Policy
- ✅ Password minimum dinaikkan menjadi **8 karakter** dan harus mengandung **huruf + angka** pada:
  - `/api/auth/register`
  - `/api/auth/register-school`
  - `/api/users` (POST/PATCH)
  - `/api/auth/change-password`
  - `/api/users/[id]/reset-password`
  - `/api/users/reset-password`
  - `/api/schools/[id]/admin-account`
  - UI form register / tambah akun / reset password.
- ✅ Self-registration siswa/ortu sekarang wajib `schoolCode`.

### C.4 SSRF & Command Injection
- ✅ Menghapus `DEFAULT_TOKEN` hardcoded pada `/api/dapodik/connect`.
- ✅ Allowlist host `localhost`, `127.0.0.1`, `[::1]` dan port `5774`/`8881` pada route Dapodik dan lookup lokal.
- ✅ `pg_dump` di `/api/backup` memakai `execFile` dengan argumen array, bukan shell string.

### C.5 Lainnya
- ✅ `src/lib/auth-guard.ts` dihapus karena tidak dipakai lagi (auth terpusat di `lib/auth.ts`).
- ✅ Batas ukuran file restore 500MB.
- ✅ CSP menambahkan `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`.
- ✅ `poweredByHeader: false` pada `next.config.ts`.
- ✅ `JWT_SECRET`/`PASSWORD_SALT` menolak placeholder & secret pendek (<32 karakter) di production.

### C.6 Housekeeping
- ✅ File backup `src/app/page.tsx.bak`, `.bak2`, dan `.full` dihapus dari repo.
- ✅ `src/app/loading.tsx` ditambahkan (App Router loading state).

### C.7 Anti school-squatting
- ✅ `POST /api/auth/register-school` sekarang membuat sekolah dengan status `pending` dan admin sekolah `isActive: false`.
- ✅ `POST /api/schools/[id]/approve` ditambahkan untuk persetujuan oleh `SUPER_ADMIN`; saat disetujui, sekolah menjadi `active` dan admin diaktifkan.
- ✅ `DELETE /api/schools` kini juga menonaktifkan akun admin sekolah saat sekolah dihapus.
- ✅ UI `SchoolManager` menampilkan status “Menunggu Persetujuan” dan tombol **Setujui**.
- ✅ Form registrasi admin sekolah menampilkan pesan bahwa akun akan aktif setelah persetujuan, lalu kembali ke login.

### C.8 Dependency mati, rate limiter, dan CI security
- ✅ Dependency mati dihapus dari `package.json` dan `bun.lock`: `@mdxeditor/editor`, `next-auth`, `@tanstack/react-query`, `@tanstack/react-table`, `react-syntax-highlighter`, `@reactuses/core`.
- ✅ `src/lib/rate-limit.ts` menyediakan rate limiter in-memory + **Upstash Redis REST** (multi-instance), dengan fallback ke memory saat Redis gagal/absent.
- ✅ Rate limiter terpasang di `src/app/api/auth/login/route.ts`, `src/lib/ai-helper.ts` (per-user AI burst), dan `src/proxy.ts` (AI + POST/PUT/DELETE per IP).
- ✅ `.env.example` didokumentasikan `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
- ✅ `tests/security-static.test.mjs` (zero-dependency) ditambahkan dan dijalankan di CI (`.github/workflows/ci.yml` job `security`); jalankan lokal dengan `npm run test:security` atau `node tests/security-static.test.mjs`. Cakupan: env ter-track, secret hardcoded, auth helper pada route sensitif, pemasangan rate limiter, sanitasi reset-password, sanitasi HTML, keamanan generator kredensial, validasi secret production, invariant alur persetujuan sekolah, dan keberadaan route boundaries per segmen fitur.
- ✅ README menambahkan bagian muatan multi-instance & rate limiting.

### C.9 Route-per-feature (tahap awal / incremental)
- ✅ Shared App Router route states dibuat: `src/components/app/app-route-loading.tsx`, `app-route-error.tsx`, `app-route-not-found.tsx`.
- ✅ Route boundaries `loading.tsx` / `error.tsx` / `not-found.tsx` ditambahkan untuk segmen fitur: `admin-school`, `guru`, `kepala-sekolah`, `siswa`, `ortu`, `accounts`, `download` + sub-segmen accounts/dapodik.
- 🔲 Refactor penuh dari SPA Zustand (`currentView`/`authenticated-app.tsx`) ke route-per-feature dengan Server Components dan halaman nyata per fitur masih perlu sprint terpisah, karena membutuhkan build/test yang bisa dijalankan untuk memverifikasi perilaku session & layout.

### C.10 Belum dikerjakan (bisa dijadikan sprint berikutnya)
- 🔲 Menyelesaikan refactor route-per-feature + Server Components (pindahkan dashboard/feature view ke route nyata, auth guard per segment).
- 🔲 Menambahkan Error Boundary per segment yang sudah dibuat ke CI via perubahan workflow `.github/workflows/ci.yml` (menunggu permission `workflows`).

---

## Lampiran A — Daftar Route “Tanpa Auth” yang Perlu Divalidasi

Dari penelusuran, 25 route tidak memanggil `requireAuth`/`requireRole`/`getCurrentUser`. Beberapa memang boleh publik (`/api/health`, `/api/npsn`, login/register), tetapi berikut harus segera ditangani:

| Route | Status sekarang | Aksi |
|---|---|---|
| `/api/users/[id]/reset-password` | 🔴 publik | Wajib `requireRole` + scope |
| `/api/schools/[id]/admin-account` | 🔴 publik | Wajib `requireRole` + scope |
| `/api/exam-items` | 🔴 publik, leak answer | Wajib auth + sanitasi |
| `/api/notifications/*` | 🔴 publik + IDOR | Wajib auth + session-derived userId |
| `/api/announcements` | 🔴 publik CRUD | Wajib auth |
| `/api/dapodik/connect` | 🔴 publik + SSRF | Wajib auth + allowlist |
| `/api/dapodik-proxy` | 🟠 publik | Wajib auth |
| `/api/dapodik/proxy` | 🟠 publik | Wajib auth |
| `/api/dapodik/status` | 🟠 publik | Harus dibatasi scope |
| `/api/dapodik/import` | 🟡 sudah `requireRole` | Tambahkan scope + validasi ukuran file |
| `/api/dapodik/sync` | 🟡 sudah `requireRole` | Tambahkan scope + rate limit |
| `/api/maintenance` | 🟡 publik read | Mungkin OK, tapi jangan expose setting lain |
| `/api/import/template` | 🟡 publik read | Mungkin OK, tapi lebih baik dilindungi |

## Lampiran B — Catatan Khusus “Route vs Halaman”

Karena aplikasi memakai `currentView` di Zustand, user yang mencoba deep-link `/admin-school/accounts` akan di-redirect ke `/` dan dibuka via state. Konsekuensinya:

- **Tidak ada server-side route protection.** Seorang user yang belum login tetapi tahu URL `/admin-school/accounts` tetap menerima HTML; setelah JS load, client menampilkan login.
- **Tidak ada server-rendered 404** untuk view yang tidak valid.
- **SEO & accessibility** untuk aplikasi internal tidak terlalu penting, tapi untuk landing page sangat krusial.
- **Caching behavior** antar fitur tidak bisa di-set per route.

**Rekomendasi:** gunakan segment protection (`layout.tsx` di folder `(dashboard)`), plus `proxy.ts` / `middleware.ts` untuk redirect before server rendering.

---

## Kesimpulan

Secara keseluruhan proyek ini sudah **memiliki fondasi domain dan fitur yang cukup kuat**, tetapi **belum aman untuk production** karena banyak endpoint kritis yang belum diautentikasi, kontrol multi-tenant yang tidak konsisten, dan arsitektur SPA yang tidak memanfaatkan kekuatan Next.js (Server Components, App Router route-level, `loading/error/not-found`, caching).

Prioritas yang harus diselesaikan sebelum deploy:

1. **Fix semua endpoint publik yang melakukan mutasi/berisi data sensitif.** (S-01—S-05)
2. **Hilangkan secret hardcoded dan SSRF di modul Dapodik.** (S-07—S-09)
3. **Satukan auth & universal school-scope guard.** (S-10, S-13)
4. **Hapus dependency mati & artefak file.** (bundle size, hygiene)
5. **Refactor ke route-per-feature dengan Server Components + `loading/error/not-found`.** (scalability & DX)
6. **Perkuat CI/CD & testing agar bug keamanan tidak terulang.**
