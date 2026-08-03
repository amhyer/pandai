---
Task ID: 4
Agent: Guru Views Upgrade Agent
Status: Completed

Summary:
Upgraded 4 exported components in guru-views.tsx (GuruMateriView, GuruNilaiView, GuruAnalisisView, GuruLaporanView) with real API integration and applied soft, interactive design system across all 6 components.

API Integrations:
- GuruMateriView: GET/POST/DELETE /api/materials, GET /api/subjects
- GuruNilaiView: GET /api/exams, GET /api/attempts, GET /api/users, POST /api/attempts
- GuruAnalisisView: GET /api/attempts, GET /api/exams, GET /api/analytics
- GuruLaporanView: GET /api/users, GET /api/attempts, GET /api/exams

Key Features:
- Create material dialog with subject dropdown from API
- Delete material with AlertDialog confirmation
- View material detail dialog
- Editable score inputs with color coding
- CSS-only bar charts (SimpleBarChart, DistributionChart)
- Printable report generation with window.print()
- All data falls back to mock when API fails

Design System Applied:
- Cards: rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5
- Gradient icon backgrounds on page headers and stat cards
- Tables with even:bg-muted/30 striping and hover:bg-muted/50
- Buttons with transition-all hover:shadow-sm active:scale-[0.98]
- Filter pills rounded-full
- Brand #1F3864, accent amber-400/500

Lint: 0 errors in guru-views.tsx
