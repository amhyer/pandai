---
Task ID: 4
Agent: Main Agent
Task: Create 3 Siswa (Student) new view components in siswa-new-views.tsx

Work Log:
- Read worklog.md to understand project context and existing patterns
- Read use-store.ts to understand User interface (id, schoolId, name, classId, className)
- Read existing siswa-views.tsx for import and component pattern reference
- Created `/home/z/my-project/src/components/views/siswa-new-views.tsx` with 3 exported components

Components Created:

1. **SiswaMateriView** — Materi Pelajaran (~200 lines)
   - Hero banner with gradient background (#1F3864), class info, overall progress
   - 6 subject cards (Matematika, Fisika, Kimia, Biologi, Bahasa Indonesia, Bahasa Inggris) in responsive grid
   - Each card: icon, subject name, material count, completed count, progress bar
   - Click to expand/collapse material list for each subject
   - Material items: title, description, date, Dibaca/Belum badge, "Mulai Belajar" button
   - Search input to filter materials across subjects
   - Tab filter: Semua / Belum Dibaca / Selesai
   - API fetch from /api/materials with mock data fallback (22 mock materials)
   - Loading skeleton state
   - Empty state when search/filter yields no results

2. **SiswaTugasView** — Tugas & Ujian (~170 lines)
   - 4 stat cards: Total Tugas, Menunggu, Selesai, Terlambat
   - Tab filter: Semua / Tugas / Kuis / Ujian/Tryout
   - Card-based layout (grid 2 cols on md) for mobile-friendliness
   - Each card: type badge (Tugas/Kuis/Ujian), status badge, subject, due date
   - Urgent items highlighted with red left border + warning text
   - Score display for completed tasks
   - Action buttons: "Mulai Kerjakan" / "Lanjutkan" / "Lihat Hasil"
   - Interactive: clicking "Mulai Kerjakan" changes status to Dikerjakan
   - "Lihat Hasil" shows toast with score info
   - Empty state with contextual message per tab
   - 10 mock tasks with varied types, dates, statuses, and scores

3. **SiswaKehadiranView** — Kehadiran Saya (~230 lines)
   - Month selector with prev/next navigation and "Hari Ini" button
   - 4 summary stat cards: Hadir (green), Izin (blue), Sakit (amber), Alpa (red)
   - SVG circular progress indicator with percentage display
   - Dynamic motivational text based on percentage (≥90% trophy, ≥75% sparkles, else warning)
   - Summary text: "Kamu hadir X dari Y hari sekolah bulan ini"
   - Full calendar grid with color-coded cells:
     - Green = Hadir, Blue = Izin, Amber = Sakit, Red = Alpa
     - Gray = Weekend, Empty = No data
   - Today indicator with ring and dot
   - Click on day to see attendance status via toast
   - Color legend at bottom
   - API fetch from /api/attendance with mock data fallback (20 school days)

Technical Details:
- File starts with 'use client';
- All imports match requirements (useAppStore, shadcn/ui, sonner, cn, lucide-react)
- Brand color #1F3864 used consistently throughout
- Indonesian language for all labels
- API fetch with try/catch fallback to mock data
- Loading skeleton states for all 3 components
- Responsive design: mobile-first with sm:, md:, lg: breakpoints
- Zero lint errors (verified with bun run lint)
- Dev server compiles successfully

Stage Summary:
- 3 fully interactive student-facing view components created
- Total file size: ~620 lines
- All components production-ready with loading, error handling, responsive design
- No new packages installed
- No pre-existing lint errors introduced
