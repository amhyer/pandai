---
Task ID: 3
Agent: Sub-agent (guru-new-views)
Task: Create 6 Guru view components in guru-new-views.tsx

Work Log:
- Read worklog.md and use-store.ts to understand ViewType definitions, user structure, and navigation
- Read existing guru-views.tsx and authenticated-app.tsx to understand code patterns
- Checked all available UI components in src/components/ui/ (dialog, alert-dialog, label, textarea, etc.)
- Created `/home/z/my-project/src/components/views/guru-new-views.tsx` with 6 exported components:
  1. **GuruTugasView** — Tugas, Kuis & Ujian (manage tasks, quizzes, exams)
  2. **GuruKehadiranView** — Kehadiran Siswa (mark daily attendance)
  3. **GuruRekapKehadiranView** — Rekap Kehadiran (attendance summary/rekap)
  4. **GuruKarakterView** — Isi Laporan 7 Kebiasaan (input character reports)
  5. **GuruRekapKarakterView** — Rekap 7 Kebiasaan (character report analysis)
  6. **GuruJurnalView** — Jurnal Mengajar (teaching journal/diary)
- Updated `/home/z/my-project/src/app/authenticated-app.tsx` to replace 6 placeholder views with lazy imports from guru-new-views.tsx
- Fixed React 19 lint errors (react-hooks/preserve-manual-memoization, react-hooks/set-state-in-effect) by:
  - Removing all `useCallback` wrappers
  - Using `useRef` for fetch deduplication instead of useCallback memoization
  - Initializing state with mock data to avoid needing setLoading(true) in effects
  - Using AbortController in all async useEffect patterns
  - All setState calls happen after `await` (async callbacks), never synchronously in effect body
- Verified: 0 lint errors from guru-new-views.tsx (remaining 9 errors are pre-existing in other files)
- Verified: Dev server compiles successfully with 200 responses

Stage Summary:
- 6 fully interactive Guru view components created with mock data fallbacks
- All components use API-first approach with graceful fallback to mock data
- Indonesian language used for all labels and text
- Brand color #1F3864 used consistently
- Responsive design with mobile-first approach
- File passes all ESLint rules (React 19 strict mode)
- All 6 views registered in authenticated-app.tsx for lazy loading
