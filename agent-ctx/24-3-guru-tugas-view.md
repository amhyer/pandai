# Task 24-3: Rebuild GuruTugasView — Complete Assignment Management UI

## Agent: Main

## Work Log:
- Read worklog (R20-R22) to understand previous work and API patterns
- Read existing GuruTugasView (lines 278-499) — old Material-based implementation
- Read all Assignment API routes (CRUD, questions, submissions, grading)
- Read Prisma schema: Assignment, AssignmentQuestion, AssignmentSubmission, AssignmentAnswer models
- Read /api/classes and /api/questions routes for dropdown data
- Read fetchWithAuth utility
- Added imports: `fetchWithAuth` from `@/lib/fetch-auth`, `Checkbox` from `@/components/ui/checkbox`, icons: `X`, `Send`, `Lock`
- Completely rewrote GuruTugasView (~430 lines) with full Assignment API integration

## What was built:

### A. Assignment List
- Fetches from `GET /api/assignments` using `fetchWithAuth`
- Cards show: title, subject name, class name, deadline countdown, submission type badge (pg_only/essay_only/mixed), status badge (draft/published/closed)
- Stats: Total, Draft, Published, Closed
- Filter by status (semua/draft/published/closed) and search
- Responsive grid: cols-1 md:cols-2 xl:cols-3

### B. Create/Edit Dialog (Step 1)
- Fields: title, description (textarea), submission type selector (pg_only/essay_only/mixed), deadline (datetime-local), maxScore
- Dropdown: Select Class — fetches from `GET /api/classes?schoolId=XXX`
- Dropdown: Select Subject — fetches from `GET /api/subjects`
- Creates via POST /api/assignments, updates via PATCH /api/assignments
- Class/Subject/submissionType disabled when editing (published/closed can't be edited)

### C. Step 2: Question Selection
- Auto-navigates to Step 2 when creating pg_only or mixed assignments
- Fetches bank soal from `GET /api/questions?schoolId=XXX&subjectId=YYY&status=published`
- Shows available questions with checkboxes, search filter
- Already-added questions shown with remove capability
- "Tambah Soal" button → POST /api/assignments/[id]/questions
- "Selesai" button closes and refreshes list

### D. Publish/Close Actions
- Draft cards show green "Publikasi" button → PATCH /api/assignments { status: 'published' }
- Published cards show "Lihat Progres" + "Tutup" buttons
- "Tutup" button → PATCH /api/assignments { status: 'closed' }
- Edit/Delete disabled for published/closed assignments

### E. Progress Dashboard
- Click on BarChart3 icon or "Lihat Progres" button → opens progress dialog
- Fetches `GET /api/assignments/[id]/submissions` → { submissions, summary }
- Summary stats: Total Siswa, Belum Dikerjakan, Terkumpul, Dinilai
- Table with: No, Nama Siswa (avatar + NISN), Status badge, Nilai, Aksi
- max-h-96 overflow-y-auto for scrollable table

### F. Grade/Nilai Panel
- For submitted submissions: "Nilai" button opens grade dialog
- For graded submissions: "Lihat" button opens grade dialog (review)
- Shows each answer card: question type badge, question content, student answer, correct answer (for PG)
- Per-answer score input (disabled for auto-graded PG, editable for essay)
- Correct/Salah badge for auto-graded PG
- Overall feedback textarea
- "Simpan Nilai" → PATCH /api/assignments/[id]/submissions/[studentId]/grade
- On save, refreshes progress dialog

### Helper Components Added:
- `AssignmentItem`, `SubItem`, `AnsItem`, `BankQ`, `ClassOpt`, `SubjectOpt` interfaces
- `ASSIGN_STATUS` constant (draft=amber, published=emerald, closed=gray)
- `STUDENT_STATUS` constant (belum_dikerjakan=gray, dikerjakan=blue, submitted=amber, dinilai=emerald)
- `SUB_TYPE_LABEL` / `SUB_TYPE_COLOR` constants
- `AssignmentStatusBadge` component
- `SubTypeBadge` component
- `StudentStatusBadge` component
- `formatDatetime()` helper
- `getCountdownDatetime()` helper (hours-aware, more precise than old date-only version)

### Style Guidelines Followed:
- `bg-[#1F3864]` primary color throughout
- Cards: `rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`
- `max-h-96 overflow-y-auto` for submissions table
- `max-h-64 overflow-y-auto` for question bank list
- `max-h-36 overflow-y-auto` for added questions list
- `max-h-96 overflow-y-auto` for grade answers list
- Consistent use of existing shared components: PageHeader, StatCard, SoftStatCard, FilterPill, EmptyState, ViewSkeleton

### Not Modified:
- No other functions in guru-new-views.tsx were touched
- No new route files created
- No next/link imports

## Verification:
- `bun run lint` passes with 0 errors
- Dev server compiles successfully, no errors in dev.log
