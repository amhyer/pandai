# Task 12: Admin School Timetable & Import Views

## Files Created

### 1. `/src/components/views/admin-school-timetable.tsx`
- **TimetableView**: Jadwal Pelajaran management
  - Gradient header with CalendarDays icon, navy brand color
  - Grid view: rows=SENIN-JUMAT, columns=Slot 1-10
  - Color-coded cells (sky=wajib, emerald=pilihan)
  - Add dialog with dropdowns for Day, Slot, Subject, Teacher, Class
  - Delete confirmation dialog
  - Empty state when no entries
  - Uses GET/POST/DELETE `/api/timetable`

- **WaliKelasView**: Wali Kelas assignment
  - Gradient header with UserCheck icon
  - Table with class name, grade, year, student count, wali kelas name
  - Assign/change dialog with teacher dropdown
  - Uses GET/PUT `/api/classes`

### 2. `/src/components/views/admin-school-import.tsx`
- **ImportCsvView**: CSV Import for Siswa & Guru
  - Gradient header with FilePlus icon
  - Two tabs: Import Siswa / Import Guru
  - Drag-and-drop upload zone
  - File info display after upload
  - Preview table (first 5 rows of parsed CSV)
  - Client-side CSV parsing (vanilla JS)
  - Download template button
  - Success/error result display
  - Uses POST `/api/import/csv` with FormData

## Backend Changes

### Schema (`prisma/schema.prisma`)
- Added `Timetable` model with day, slotNumber, subject, teacher, class, school
- Added `waliKelasId` field and `WaliKelas` relation to `Class` model
- Added reverse relations on User and Subject models
- Ran `db:push` successfully

### API Routes
- `GET/POST/PUT/DELETE /api/timetable` — Full CRUD for timetable
- `POST /api/import/csv` — CSV import for siswa/guru
- `PUT /api/classes` — Added for wali kelas assignment
- `GET /api/classes` — Updated to include WaliKelas relation

### Wiring
- Added lazy imports for `timetable`, `wali-kelas`, `import-csv` in `authenticated-app.tsx`

## Lint Status
- All 6 modified files pass ESLint with 0 errors
- Pre-existing error in `admin-school-dapodik.tsx` (not related to this task)
