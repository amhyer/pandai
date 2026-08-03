---
Task ID: 1
Agent: Main
Task: Make all displays interactive, soft, and precise across the entire application

Work Log:
- Fixed notification bell in header to navigate to notifications view
- Enhanced main content area with soft gradient background and max-width container
- Fixed ProfileView: corrected role labels (SUPER_ADMIN, ADMIN_SCHOOL, etc.), connected save to PUT /api/users API, fixed schoolName field
- Upgraded shared-views (Profile, Notifications, Broadcasts) with gradient headers, animated accent borders, staggered entry animations, soft empty states
- Upgraded guru-views (Materi, Nilai, Analisis, Laporan) with real API integration, CSS bar charts, gradient stat cards, interactive dialogs
- Upgraded siswa-views: removed unused DiagnosticView/PracticeView/LeaderboardView, connected Nilai/Riwayat to real APIs with color-coded scores and timeline
- Upgraded super-admin-views: removed unused QuestionsGlobalView, added CSS bar charts, animated numbers, debounced search, sortable tables
- Upgraded orang-tua-views: CSS donut charts, color-coded attendance, timeline exam history, print-ready reports
- Upgraded admin-school-new-views: card grid layouts, timeline activity logs, backup progress animation
- Upgraded guru-new-views: colored task cards, quick attendance buttons, 7-habit character cards with unique pastels
- Upgraded siswa-new-views: subject filter pills, countdown timers, calendar grid, percentage ring
- Upgraded ortu-new-views: child selector pills, star rating with hover effects, per-habit bar charts, recommendations
- Upgraded all 5 dashboards with gradient icon backgrounds, warm greetings, quick action grids, gamification (siswa streak)
- Upgraded login page: split layout, gradient demo buttons with role colors
- Upgraded register page: visual role selection cards
- Upgraded landing page: scroll animations, count-up stats, expanded feature cards
- Created /api/scores endpoint for student score aggregation
- Fixed /api/attempts route: removed invalid question relation include
- Fixed class-manager.tsx: added missing useEffect import

Stage Summary:
- All 9 view files upgraded with consistent soft design system
- All 5 dashboards upgraded with interactive elements
- Login, register, and landing pages redesigned
- Notification bell now functional
- Profile save connected to real API
- All unused/dead exports removed from view files
- Design system: rounded-xl cards, gradient headers, hover lift effects, pill filters, color-coded scores
- Total files modified: ~20 component files + 1 new API route
