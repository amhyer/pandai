---
Task ID: 1
Agent: main
Task: Create production-ready deployment artifacts + smoke test for PANDAI PostgreSQL migration

Work Log:
- Assessed all API routes (attempts, scores, login, users, assignments, exams, questions, classes, schools, health)
- Fixed Dockerfile: correct bun.lock (not bun.lockb), removed better-sqlite3, simplified to 3-stage build
- Fixed next.config.ts: removed better-sqlite3 from serverExternalPackages
- Created .env.production template with PostgreSQL URL and JWT_SECRET placeholder
- Created .dockerignore to minimize Docker build context
- Updated docker-compose.yml: db uses ${POSTGRES_PASSWORD} var, app has healthcheck, seed service with profile
- Created scripts/smoke-seed.ts: bcrypt-hashed passwords, creates school/class/users/exam/assignment
- Created smoke-test.sh: 7 test groups (health, login, IDOR attempts, IDOR scores, NIK absence, race condition, unauth)
- Created deploy.sh: one-command VPS setup (install docker, build, seed, smoke test)
- Verified migration 20260821075723_init exists (1032 lines SQL, 36 tables)
- All shell scripts pass bash -n syntax check

Stage Summary:
- Key artifact: smoke-test.sh (7 test groups, 20+ assertions, exit code 0/1)
- Key artifact: deploy.sh (auto-generates passwords, builds docker, seeds, runs smoke tests)
- Key artifact: docker-compose.yml (db + app + seed services, password variable substitution)
- Key artifact: Dockerfile (3-stage: deps → builder → runner)
- Verified in previous session: prisma migrate dev against PostgreSQL 17 succeeded, next build succeeded
---
Task ID: audit-admin-sekolah
Agent: general-purpose

# ADMIN_SEKOLAH Code Path Audit Report

## FRONTEND COMPONENTS

### 1. admin-sekolah-dashboard.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 1 | 190 | ERROR | `fetchAnalytics` early-returns when `!user?.schoolId` but does NOT call `setLoading(false)`. The loading spinner renders forever. | Expected: loading ends with empty state. Actual: infinite loading skeleton. |
| 2 | 178-183 | WARN | `upcomingExams` is entirely hardcoded mock data with static dates (2025-06-XX). The "Lihat Semua" and each exam row navigate to `teacher-assignments` view — wrong destination for exam-related actions. | Expected: real exam data from API; navigation to an exam detail view. Actual: stale mock data; wrong navigation target. |
| 3 | 80 | INFO | `onClick ? '' : ''` is a no-op ternary — both branches produce empty string. | |
| 4 | 90 | INFO | Siswa `RoleBadge` has duplicate class: `border-amber-200 border`. | |

### 2. class-manager.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 5 | 212-218 | ERROR | `handleSubmit` only calls `toast.info(...)` — the class is never persisted to any API. Data is lost on refresh. | Expected: POST to /api/classes. Actual: toast shown, no persistence. |
| 6 | 306 | WARN | Academic year displayed as `new Date().getFullYear()/{new Date().getFullYear()+1}` is hardcoded in the template, ignoring `academicYear` from `ClassFormData`. | Expected: shows the academicYear from form or class data. Actual: always shows current year dynamically. |
| 7 | 262 | INFO | `formKey` variable is declared but never used in `ClassFormDialog`. | |

### 3. user-manager.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 8 | 500, 623, 633 | ERROR | `submitting` state is declared but never set to `true`. Both `GuruFormDialog` and `SiswaFormDialog` receive `isSubmitting={submitting}` which is always `false`. The submit button never disables during submission; double-clicks can create duplicate users. | Expected: button disabled and shows "Menyimpan...". Actual: button always active. |
| 9 | 621 | WARN | `schoolId={user?.schoolId \|\| ''}` sends empty string to API when user has no schoolId, potentially creating orphan records. | Expected: creation blocked or schoolId validated server-side. Actual: empty schoolId propagates. |
| 10 | 272 | WARN | NISN validation requires exactly 10 digits (`form.nisn.trim().length !== 10`). Real NISN values may vary in length and the form already clamps to 10 via input sanitization, so the error toast can never actually be reached for >10 digits but can incorrectly block valid NISNs. | |

### 4. admin-school-views.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 11 | 375-404 | ERROR | `ClassesView.handleSubmit` and `handleDelete` use `setTimeout` to simulate API calls — no real API is called. All changes (create, edit, delete) are purely local state, lost on refresh. | Expected: POST/PUT/DELETE to /api/classes. Actual: local-only mock. |
| 12 | 715-743 | ERROR | `ExamAssignmentsView.handleAssign` uses `setTimeout` and `PLACEHOLDER_*` mock data — no real API call. Assignments are local only. | Expected: POST to /api/exam-assignments. Actual: local-only mock. |
| 13 | 580-582 | WARN | Grade badge reuses `getDifficultyVariant()` (designed for question difficulty: Mudah/Sedang/Sukar) to color-code class grade levels (10/11/12). The function maps grades to difficulty strings then strips text labels, producing inconsistent colors. | Expected: dedicated grade color function. Actual: misused difficulty colors. |
| 14 | 959 | WARN | "Batalkan" on exam assignment only does `setAssignments(prev => prev.filter(...))` — no API call. Assignment reappears on refresh. | |
| 15 | 1427 | WARN | Download button in reports table calls `toast.success('Laporan berhasil diunduh')` but performs no actual download. | Expected: file download. Actual: misleading success toast. |
| 16 | 1012-1017 | WARN | `AnalyticsView` uses `setTimeout` + `PLACEHOLDER_ANALYSIS` — fully mocked, no real API. | |
| 17 | 1268-1270 | WARN | `ReportsView` uses `setTimeout` + `PLACEHOLDER_REPORTS` — fully mocked, no real API. | |

### 5. admin-school-new-views.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 18 | 398-456 | ERROR | `SubjectsView.handleSave`: On API success, the function returns early at line 412/428 WITHOUT calling `setSaving(false)`. The `saving` state stays `true` forever, locking the save button. The fallback path at line 455-456 calls `setSaving(false)` but only when API fails. | Expected: saving state reset in all paths. Actual: saving stuck to true on success. |
| 19 | 831 | ERROR | `TeacherAssignmentsView.fetchAssignments`: `mapped.length > 0 ? mapped : MOCK_ASSIGNMENTS` — if the API returns a legitimately empty array (school has no assignments yet), it falls back to MOCK data, making it impossible to see an empty state. | Expected: empty array shows empty state. Actual: mock data masks real empty state. |
| 20 | 846-853 | ERROR | `uniqueTeachers` is derived from `MOCK_TEACHERS` (hardcoded array) with `[]` dependency — the teacher dropdown always shows the same 6 mock teachers regardless of actual school data. | Expected: teachers fetched from API based on schoolId. Actual: hardcoded mock teachers. |
| 21 | 993-1006 | WARN | `handleBatchSave` sends POST requests sequentially in a `for...of` loop. No error handling for individual failures. If the 3rd of 5 requests fails, the first 2 are committed but no rollback occurs, leaving partial data. | Expected: atomic batch or proper error reporting per item. Actual: silent partial success. |
| 22 | 114 | INFO | `uniqueTeachers` `useMemo` has `[]` dependencies — static, never recalculates. | |
| 23 | 1348 | WARN | Teacher search input in batch dialog is disconnected from the Select dropdown — typing in the search input does not filter the Select options (Select uses `filteredTeachers` but the search state `teacherSearch` only affects `filteredTeachers`, not the visual select). | Expected: search filters the select options. Actual: search input is cosmetic. |
| 24 | 749 | WARN | `SubjectsView` delete AlertDialog: when cancelled, `deletingSubject` is not reset to null. The `handleDelete` function sets it to null at line 475, but if user cancels the dialog (via `setDeleteOpen(false)`), `deletingSubject` remains set, causing stale data on re-open. | |

### 6. admin-school-import.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 25 | 240-243 | WARN | `const data = await res.json()` is called OUTSIDE the `res.ok` check. If the server returns a non-JSON 500 error, `res.json()` will throw, jumping to the catch block, but the toast says "network error" when it might be a server error. | Expected: only parse JSON when content-type is JSON. Actual: potential unhandled JSON parse error. |
| 26 | 117 | INFO | `downloadTemplate` generates CSV without BOM (byte-order mark). Opening in Excel may not detect UTF-8 correctly for Indonesian characters like é, ü in names. | |

### 7. admin-school-timetable.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 27 | 219-225 | ERROR | Timetable `grid` map uses `\`${e.day}-${e.slotNumber}\`` as key. If multiple classes have timetable entries, only the LAST entry per day+slot is shown in the grid — all other classes' entries are silently overwritten. Multi-class timetable viewing is broken. | Expected: per-class filtering or multi-class display. Actual: data collision, only last class visible per slot. |
| 28 | 179 | WARN | `fetch(/api/subjects?schoolId=${schoolId})` — but GET /api/subjects (subjects/route.ts line 11-12) ignores the `schoolId` query parameter entirely, returning ALL subjects across all schools. | Expected: school-scoped subjects. Actual: global subject list. |
| 29 | 370 | WARN | Empty state is shown when `entries.length === 0` globally, not per selected class. The view has no class selector, so all timetable entries across all classes are mixed into one grid. | Expected: class filter. Actual: all entries mixed, no way to filter by class. |

### 8. admin-school-dapodik.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 30 | 419 | INFO | Connector line div has `style={{ display: 'none' }}` — the vertical connector line between workflow steps is always hidden (dead code). | |
| 31 | 332 | WARN | `const result = await res.json()` is called without try/catch for JSON parsing. A non-JSON error response will throw an unhandled error. | |

## API ROUTES

### 9. /api/classes (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 32 | (missing) | ERROR | No DELETE handler is exported. The frontend (`admin-school-views.tsx` line 407-420) calls `handleDelete` which expects a DELETE endpoint. The delete will always fail with 405 Method Not Allowed. | Expected: DELETE /api/classes?id=xxx works. Actual: 405 error, frontend falls through to local-only delete. |
| 33 | 13 | WARN | `where: any` — untyped Prisma query object bypasses type safety. | |
| 34 | 42 | WARN | `data: any` — untyped update object could allow arbitrary field updates. | |

### 10. /api/teacher-assignments (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 35 | 20-27 | WARN | N+1 query pattern: for each assignment, 3 separate DB queries are made (teacher, class, subject). With 100 assignments, this fires 300+ queries. | Expected: batch/inclusion query. Actual: O(n) individual queries. |
| 36 | 64 | WARN | PATCH handler: `...(academicYear && { academicYear })` — cannot clear academicYear to empty/null because empty string is falsy. Same for semester. | |

### 11. /api/timetable (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 37 | 29-30 | ERROR | Potential null dereference: `e.subject.name`, `e.subject.code`, `e.teacher.name`, `e.class.name` — if a related record was deleted (orphaned timetable entry), these will throw `Cannot read property 'name' of null`. | Expected: null-safe access. Actual: runtime crash on orphaned entries. |
| 38 | 67 | ERROR | `return NextResponse.json({ error: error.message \|\| '...' }, { status: 500 })` — exposes internal error messages (e.g., Prisma error details, stack traces) to the client. | Expected: generic error message. Actual: internal details leaked. |

### 12. /api/attendance (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 39 | 38-44 | WARN | N+1 query pattern: fetches student individually for each attendance record. | |
| 40 | 31 | WARN | `{ startsWith: month } as any` — type safety bypass with `as any`. If month param is malformed (e.g., "abc"), Prisma may throw an unhandled error. | |
| 41 | 71 | WARN | `deleteMany` before `createMany` (line 71) uses `recordedBy` as a condition but `recordedBy` is set from `auth.userId`. If the same class is re-submitted by a different teacher, the previous teacher's records won't be deleted, causing duplicates. | |

### 13. /api/subjects (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 42 | 73-76 | ERROR | PATCH handler uses `...(code && { code })` — cannot set `code` or `name` or `type` to empty string (all are falsy). More critically, cannot clear a field. Additionally, `code` uniqueness is not re-checked on update — changing a subject's code to another subject's existing code will cause a Prisma unique constraint error with no user-friendly message. | Expected: proper null handling and uniqueness re-check. Actual: silent constraint error. |
| 43 | 11-12 | WARN | GET /api/subjects ignores all query parameters including `schoolId` — returns all subjects globally. | |

### 14. /api/import/csv (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 44 | 47-57 | ERROR | Import loop has no transaction wrapping. If the import fails midway (e.g., DB error on row 50), rows 1-49 are committed but rows 50+ are not — partial import with no rollback. | Expected: atomic transaction. Actual: partial data committed on failure. |
| 45 | 50, 67 | WARN | `findUnique({ where: { nisn } })` / `findUnique({ where: { nip } })` — if the database has records with null nisn/nip and a new import has empty nisn/nip, this could match unexpectedly. | |

### 15. /api/dapodik/import (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 46 | 64 | ERROR | Missing schoolId returns HTTP 401 (Unauthorized) — incorrect status code. 401 implies authentication failure, but this is a validation error. Should be 400. | Expected: 400 Bad Request. Actual: 401 Unauthorized. |
| 47 | 66 | ERROR | School not found also returns 401 instead of 404. | Expected: 404 Not Found. Actual: 401 Unauthorized. |
| 48 | 69 | WARN | `importedUsers` array (containing plaintext temp passwords) is returned in the API response. While this may be intentional for display, it means temp passwords are logged in any HTTP proxy, CDN, or server log. | |

### 16. /api/dapodik/connector/download (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 49 | 9-10 | ERROR | `readFileSync` is synchronous and blocks the Node.js event loop. For a small file this is minor, but if the file doesn't exist, the raw `ENOENT` error is not caught properly (falls to generic catch but error message is not user-friendly). | Expected: async file read or proper ENOENT handling. Actual: sync read + generic error. |

### 17. /api/activity-logs (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 50 | 13-14 | WARN | `parseInt(searchParams.get('limit') \|\| '50')` — no NaN check. If `limit` param is something like "abc", `parseInt` returns `NaN` which is passed to Prisma's `take`, likely causing a Prisma validation error. | Expected: validated/fallback integer. Actual: potential Prisma error on bad input. |
| 51 | 27-30 | WARN | N+1 query pattern: fetches user individually for each log entry. | |
| 52 | 20 | WARN | Both `module` and `category` query params write to `where.module` — if both are provided, `category` overwrites `module`. | |

### 18. /api/grade-components (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 53 | 105, 114 | ERROR | PATCH handler destructures `{ id, ...data }` and passes `data` directly to `db.gradeComponent.update`. No field whitelist — a malicious or buggy client could overwrite `schoolId`, `createdBy`, or any other field. | Expected: field whitelist. Actual: arbitrary field overwrites possible. |

### 19. /api/student-grades (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 54 | 80 | ERROR | `(auth.role === 'SUPER_ADMIN' ? component.schoolId : auth.schoolId)!` — non-null assertion. If `component.schoolId` is null for SUPER_ADMIN or `auth.schoolId` is null for other roles, this will cause a runtime crash (null passed where string expected). | Expected: null check with proper error. Actual: potential runtime crash. |
| 55 | 103 | WARN | `parseFloat(score)` — no NaN check. If `score` is NaN (e.g., empty string passed), NaN is stored in the database. | |
| 56 | 116 | WARN | `date: date \|\| undefined` — if `date` is an empty string `""`, it's falsy and becomes `undefined`, which sets `date` to `null` in Prisma. This may be intentional but silently swallows explicit empty-date submissions. | |

## SUMMARY

| Severity | Count |
|----------|-------|
| ERROR | 18 |
| WARN | 29 |
| INFO | 5 |
| **Total** | **52** |

### Top Critical Issues (ERROR)
1. **Timetable grid data collision** (timetable.tsx:219) — multi-class timetables silently lose data
2. **Null dereference in timetable API** (timetable/route.ts:29) — orphaned entries crash the server
3. **No DELETE on /api/classes** (classes/route.ts) — frontend delete always fails
4. **Saving state stuck forever** (admin-school-new-views.tsx:412) — subject save button permanently disabled
5. **Import CSV no transaction** (import/csv/route.ts:47) — partial import on failure
6. **Loading state stuck forever** (admin-sekolah-dashboard.tsx:190) — infinite spinner when no schoolId
7. **Mock data fallback hides empty state** (admin-school-new-views.tsx:831) — can't distinguish real empty from API error
8. **Hardcoded mock teachers** (admin-school-new-views.tsx:846) — teacher dropdown always shows fake data
9. **Class create is a no-op** (class-manager.tsx:212) — data never persisted
10. **Submit button never disables** (user-manager.tsx:500) — double-submit creates duplicate users
---
Task ID: audit-guru
Agent: general-purpose

# GURU Code Path Audit Report

## FRONTEND COMPONENTS

### 1. guru-dashboard.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 1 | 184-190 | INFO | All `activities` are hardcoded mock data — never fetched from API. The "Aktivitas Terkini" section always shows the same 5 static entries. | Expected: real activity data. Actual: static mock. |
| 2 | 193-197 | INFO | All `topStudents` are hardcoded mock data — never fetched. The "Performa Siswa Terbaik" section is not functional. | Expected: real student performance data. Actual: hardcoded names and scores. |
| 3 | 222-224 | WARN | `examCount` and `avgStudentScore` are hardcoded to `3` and `72.5`. The stats cards show fake data regardless of the actual state. | Expected: real aggregated data from API. Actual: constant fake values. |
| 4 | 232-246 | WARN | `handleQuickCreate` only navigates to `guru-materi` view — it does NOT pass the selected subject or create any question. The `quickSubject` state is lost after navigation. | Expected: subject is pre-filled in the question editor. Actual: subject selection is discarded. |

### 2. guru-views.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 5 | 998-1015 | ERROR | `GuruSoalView` uses entirely hardcoded `MOCK_SOAL` array — no API call. Search, filter, and stats all operate on static data. Clicking "Buat Soal Baru" only shows `toast.info('Fitur pembuat soal segera hadir')`. The entire view is non-functional. | Expected: CRUD against /api/questions. Actual: read-only mock display. |
| 6 | 1120-1125 | ERROR | In `GuruSoalView`, edit and delete buttons only show `toast.info(...)` — no actual API call is made. Edits and deletes are no-ops. | Expected: PATCH/DELETE to /api/questions. Actual: informational toast only. |
| 7 | 1140-1155 | ERROR | `GuruTryoutView` uses entirely hardcoded `MOCK_TRYOUT` — no API call. Same as above: view/edit/delete are all no-ops. | Expected: real exam CRUD. Actual: static mock. |
| 8 | 1351-1368 | WARN | `handleActivateRemedial` in `GuruNilaiView` calls `POST /api/attempts/remedial` — this endpoint does not exist in the codebase (no file at that path). Will always 404. | Expected: remedial activation works. Actual: 404 error swallowed by catch. |
| 9 | 1920-1937 | ERROR | `questionAnalysis` table maps `attempts[idx]` to `qa.no` by index. If `filteredAttempts` is filtered and `questionAnalysis` has different length, the mapping is wrong — student names align to the wrong analysis rows. | Expected: analysis rows matched by question ID. Actual: positional index mismatch. |
| 10 | 2016-2023 | WARN | `handleGenerate` for reports uses `setTimeout(1200)` to fake a loading state then shows mock data. No real PDF generation or data fetch. | Expected: real report generation. Actual: simulated 1.2s delay. |
| 11 | 2139-2163 | ERROR | In the "Riwayat Laporan" tab, `attempts.length === 0` is used as the empty-state check, but the table content is `REPORT_TYPES.map(...)` — the "riwayat" (history) always shows the 4 static report types, never actual history. The empty state can never be triggered when attempts exist. | Expected: actual saved reports listed. Actual: static 4-row table always shown. |
| 12 | 2151 | INFO | Report date always shows `formatTanggal(new Date().toISOString())` — today's date, not the actual report creation date. |
| 13 | 1927 | WARN | `DAYA_BEDA_COLORS[qa.dayaBeda]` — if `qa.dayaBeda` is not one of 'Baik'/'Cukup'/'Kurang', the badge renders with `undefined` class. | Expected: fallback color. Actual: no styling applied. |
| 14 | 486-491 | WARN | `fetchSubjects` silently catches errors — if subjects API fails, the subject dropdown in the create dialog is empty with no user feedback. |

### 3. guru-new-views.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 15 | 287 | WARN | `GuruTugasView` initializes with `MOCK_TUGAS` as default state. If the API call at line 308 fails, the mock data persists silently — user cannot distinguish real vs mock data. | Expected: empty state on API failure. Actual: mock data shown. |
| 16 | 343-348 | ERROR | `handleSave` in `GuruTugasView`: on API success, `setSaving(false)` is called and the function returns immediately — but the fallback path at line 345-348 ALSO sets `setSaving(false)` and creates a local item. The early return at line 343 prevents the fallback from running, which is correct, BUT: if the API returns 200 but with an unexpected body format (not handled by the `res.ok` check), the data could be malformed. |
| 17 | 351-354 | ERROR | `handleDelete` in `GuruTugasView` only removes items from local state — no API call to `DELETE /api/materials`. Items reappear on refresh. | Expected: DELETE API call. Actual: local-only deletion. |
| 18 | 131 | WARN | `formatDate` uses `new Date(d)` — if `d` is `undefined` (e.g., from an item with no `dueDate`), `new Date(undefined)` produces `Invalid Date`, displayed as "Invalid Date". | Expected: fallback string. Actual: "Invalid Date" shown. |
| 19 | 135-143 | WARN | `getCountdown` uses `new Date(dueDate)` — same Invalid Date risk if `dueDate` is empty. |

### 4. guru-ai-views.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 20 | 278 | ERROR | `JSON.parse(q.options || '[]')` is called without try/catch. If the `options` field from the database contains malformed JSON (e.g., from a failed AI generation that partially wrote), this will throw a runtime error and crash the entire GenerateSoalTab component. | Expected: try/catch with fallback. Actual: unhandled JSON parse error. |
| 21 | 93 | INFO | `schoolId` and `userId` are passed as empty strings `''` when `user` is null (line 93-94). The AI tabs will send requests with empty strings, which may behave differently than missing values on the server. |
| 22 | 332-333 | WARN | `ReviewSoalTab.fetchQuestions` calls `/api/questions?schoolId=${schoolId}&status=draft` but then filters results client-side with `q.status === 'draft'` — redundant filter that could mask API bugs. |
| 23 | 149-150 | WARN | Subject fetch uses `.then(r => r.json()).then(setSubjects).catch(() => {})` — if the API returns non-JSON (e.g., 500 HTML), `r.json()` throws but is silently caught. Subjects dropdown is empty with no error feedback. |

### 5. guru-bank-soal-view.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 24 | 219-221 | WARN | `fetchQuestions` depends on `search` in its dependency array. Every keystroke in the search input triggers a full API call with debounce — no debounce is implemented. Rapid typing causes excessive API calls. | Expected: debounced search. Actual: API call per keystroke. |
| 25 | 283-289 | WARN | `addOption` uses `labels[prev.options.length]` — if options were manually reordered or deleted, the label could be wrong (e.g., after removing A and B, new option gets label 'C' instead of 'A'). | Expected: label always sequential. Actual: gap in labels after deletion. |
| 26 | 350-352 | WARN | Error response from PATCH/POST is parsed with `const err = await res.json()` without `.catch()`. If the server returns a non-JSON error, this secondary `.json()` call will throw. | Expected: safe error parsing. Actual: potential unhandled error. |

### 6. guru-assignment-view.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 27 | 335-349 | ERROR | `openEdit` sets `questionIds: []` — when editing an existing assignment, its question associations are lost. After saving, all existing questions are detached from the assignment. | Expected: existing questionIds pre-filled. Actual: questions silently removed on edit. |
| 28 | 545 | WARN | `openGrading` fetches submission using `?studentId=${student.id}` but the API endpoint `/api/assignments/${detailId}/submissions?studentId=...` may return null if the student hasn't started. The code handles null at line 549 but `setSubmissionDetail(null)` + the grading dialog opening is not guarded — the dialog could open with null data. | Expected: dialog only opens when submission exists. Actual: grading dialog opens on empty submission. |
| 29 | 565-576 | ERROR | `calcTotalScore` adds `ans.pointsEarned ?? 1` for correct PG answers. But `pointsEarned` from the API could be 0 (if the question has 0 points configured), and `?? 1` would give 1 point for a 0-point question. Also, if a student selected a wrong PG answer, `isCorrect` is false so it correctly skips, but if `isCorrect` is null (ungraded), it also skips — ungraded PG answers silently contribute 0. | Expected: uses the actual points from the question config. Actual: hardcoded fallback of 1 point. |
| 30 | 599-601 | WARN | After saving a grade, the code does `setDetailId(detailId); setDetail(null); setStudents([])` to trigger a re-fetch via the useEffect at line 468. This is an indirect and fragile refresh pattern — if the useEffect dependencies change, the refresh won't happen. | Expected: direct refetch function call. Actual: indirect state-reset-based refresh. |
| 31 | 371-378 | WARN | Duplicate validation: the check for empty questionIds appears twice (line 371 and 375) with slightly different messages. The second check (line 375) is redundant since it's a subset of the first. |

### 7. komponen-nilai-view.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 32 | 115-120 | INFO | `TERMS` array is hardcoded with 4 specific terms. As time passes, these will become stale. No dynamic term fetching. | Expected: terms from API or config. Actual: hardcoded 2024-2026 range. |
| 33 | 180 | ERROR | `const user = useAppStore((s) => s.user)!;` — non-null assertion. If the store hasn't hydrated yet (e.g., during SSR or initial render), `user` could be undefined and this would crash. | Expected: null guard. Actual: potential runtime crash. |
| 34 | 248 | WARN | `.then((data => {` — missing closing parenthesis. While this may work due to automatic semicolon insertion, it's a syntax fragility. |

### 8. rapor-view.tsx, profil-lulusan-view.tsx, kotak-masukan-view.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 35 | N/A | INFO | These files are part of the new-views.tsx module (character ratings, competency assessments, journals) which use `MOCK_*` data with optional API overlay. Same pattern as other views — mock fallback masks real empty state. | |

## API ROUTES

### 9. /api/questions (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 36 | 23 | WARN | `const where: any = {}` — untyped query object. Prisma field names are not validated at compile time. | |
| 37 | 60 | WARN | POST handler does not validate `content` is non-empty. A question with empty content can be created. | Expected: 400 if content missing. Actual: empty content question saved. |
| 38 | 19-20 | WARN | `parseInt(searchParams.get('page') || '1')` and `limit` — no NaN guard. If `page=abc` is passed, `parseInt` returns NaN, which propagates to Prisma skip/take. | Expected: validated integer. Actual: potential Prisma error. |
| 39 | 93 | WARN | PATCH handler does not verify the question belongs to the requesting user's school before updating. Any GURU can update any question if they know the ID (IDOR). | Expected: schoolId check. Actual: any authenticated GURU can edit. |

### 10. /api/assignments (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 40 | 135-141 | ERROR | PATCH handler blocks updates when `status !== 'draft'` AND submissions exist — but it only checks for the PRESENCE of submissions, not their status. A GURU cannot fix a typo in an assignment title even if all submissions were later deleted (but the submission records remain). Also, `description !== undefined` check means you CANNOT set description to empty/null to clear it. | Expected: allow safe field updates. Actual: overly restrictive + cannot clear fields. |
| 41 | 105-109 | WARN | Points are distributed evenly: `Math.floor(maxScore / questionIds.length)`. Remainder points are lost. E.g., maxScore=100, 3 questions → 33+33+33=99, 1 point lost. | Expected: distribute remainder. Actual: 1-point loss per assignment. |
| 42 | 174 | WARN | DELETE does not cascade-delete related `assignmentQuestion` and `assignmentSubmission` records. If the database doesn't have ON DELETE CASCADE, this will fail with a foreign key constraint error. | Expected: cascade or explicit cleanup. Actual: potential FK constraint error. |
| 43 | 26 | WARN | N+1 pattern: each of 200 assignments triggers 3 additional DB queries (teacher, subject, class). | |

### 11. /api/assignments/[id] (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 44 | 29 | ERROR | String literal has an unclosed template literal backtick: `return NextResponse.json({ error: 'Gagal mengambil tugas },` — missing closing quote. This causes a SYNTAX ERROR at build time, making the entire route file unusable. | Expected: valid string. Actual: syntax error. |

### 12. /api/assignments/[id]/submissions (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 45 | 96-113 | ERROR | Race condition: the transaction at line 96 checks for existing submission and creates a new one, but the `update` at line 116-119 is OUTSIDE the transaction. Between the transaction commit and the update, another request could create a duplicate submission (the P2002 catch handles this, but only for the upsert, not for the status update). | Expected: entire submit flow in one transaction. Actual: two-step with race window. |
| 46 | 129-133 | WARN | PG auto-scoring compares `answer === correctAnswer` as string comparison. If the `answer` field stores option IDs (UUIDs) instead of labels (A/B/C/D), the comparison will always fail, making all PG answers wrong. | Expected: consistent answer format. Actual: potential format mismatch. |
| 47 | 73 | WARN | POST allows `SISWA` role to submit, but the `studentId` comes from the request body — a student could submit answers for ANOTHER student by passing a different `studentId`. No verification that `studentId` matches the authenticated user. | Expected: studentId = auth.userId for SISWA. Actual: IDOR — student can submit as another student. |
| 48 | 100 | WARN | `existingSub.status === 'submitted' || existingSub.status === 'dinilai'` — if status is `'dikerjakan'`, the student can update their submission. But the update at line 118 also changes status, so a student could keep a submission in 'dikerjakan' status indefinitely past the deadline. | Expected: deadline enforcement. Actual: no deadline check on save. |

### 13. /api/assignments/[id]/submissions/[studentId]/grade (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 49 | 14 | WARN | `findFirst` without ordering — if multiple non-remedial submissions exist for a student (race condition from issue #45), the wrong one may be graded. | Expected: deterministic selection. Actual: non-deterministic. |
| 50 | 19 | WARN | Only allows grading when `status === 'submitted'`. If status was auto-set to 'dinilai' (for PG-only), the guru cannot update the score. | Expected: re-grade allowed. Actual: locked after auto-grade. |
| 51 | 31 | WARN | `totalScore = allAnswers.reduce(...)` calculates from `pointsEarned` on all answers. But the client sends a `score` field in the body which is used at line 35 (`score !== undefined ? score : totalScore`). If the client sends `score: 0`, it will be used instead of the calculated total — allowing a guru to set any score. | Expected: validation that score is reasonable. Actual: no bounds checking. |

### 14. /api/import/questions (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 52 | 195 | WARN | `.doc` files are accepted by the extension check but `mammoth` only supports `.docx`. Old-format `.doc` files will fail during text extraction with an unhelpful error. | Expected: reject .doc explicitly. Actual: .doc accepted but fails at extractText. |
| 53 | 250-274 | WARN | Questions are imported one-by-one in a loop without a transaction. If the 5th of 10 questions fails, 4 are committed with no rollback. | Expected: atomic batch import. Actual: partial import on failure. |
| 54 | 271 | WARN | `catch (err: any)` — uses `any` type. `err.message` may not exist on all error types. |

### 15. /api/ai/generate-questions (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 55 | 61 | ERROR | `JSON.parse(raw)` — if the AI returns malformed JSON or wraps it in markdown code blocks (```json ... ```), this will throw. The error message "AI gagal menghasilkan soal" doesn't tell the guru what went wrong. | Expected: robust JSON extraction (strip markdown, handle partial JSON). Actual: raw JSON.parse on LLM output. |
| 56 | 63-65 | WARN | After parsing, only checks `Array.isArray(questions) && questions.length === 0`. Does NOT validate that each question has the required fields (content, options, answer). Malformed questions from AI will cause Prisma create to fail at line 70. | Expected: schema validation before DB write. Actual: relies on Prisma constraint errors. |
| 57 | 70-88 | WARN | Questions are created one-by-one in a loop. If the 3rd of 5 fails, 2 are committed. No transaction wrapping. | Expected: transactional batch. Actual: partial commit on failure. |
| 58 | 91 | INFO | Token estimation is hardcoded at `count * 200`. Actual token usage may differ significantly, making rate limiting inaccurate. |

### 16. /api/ai/chatbot (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 59 | 153-154 | ERROR | Uses `z-ai-web-dev-sdk` directly with `import('z-ai-web-dev-sdk')` and `ZAIClass.create()` instead of going through the `aiCompletion` helper used by other AI routes. This bypasses any centralized configuration, error handling, or API key management in `ai-helper.ts`. | Expected: use centralized `aiCompletion`. Actual: direct SDK usage, inconsistent with other routes. |
| 60 | 124-129 | WARN | The `subjectId` variable is reassigned as a string from itself: `const subject = subjectId;`. This is a no-op that shadows the parameter. The `buildLanguageInstruction('bahasa indonesia')` ignores the actual subject entirely. | Expected: subject-specific language instruction. Actual: always uses generic Indonesian. |
| 61 | 85-94 | WARN | Session title is set from first message content. If the first message is very long, only first 50 chars are used. If the user creates many sessions without sending messages, `title` remains null/empty. |
| 62 | 195-216 | WARN | DELETE session: no verification that the session belongs to the requesting user. Any authenticated user can delete any session by ID (IDOR). | Expected: ownership check. Actual: any authenticated user can delete. |

### 17. /api/ai/review-question (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 63 | 21-22 | WARN | Verifies `schoolId` matches, but the `schoolId` comes from the request body (not from auth). A GURU from school A could review questions from school B by passing the correct schoolId in the body. | Expected: schoolId from auth token. Actual: client-controlled schoolId. |

### 18. /api/ai/generate-report-desc (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 64 | 23 | WARN | No verification that the `studentId` belongs to the same `schoolId`. A GURU from school A could generate report descriptions for students in school B. | Expected: school isolation check. Actual: cross-school access possible. |
| 65 | 79 | ERROR | Potential null dereference: `const subj = ans.question.subject;` then `subjectPerf[subj.id]`. If `ans.question` or `ans.question.subject` is null (orphaned answer), this will crash with `Cannot read properties of null`. | Expected: null-safe access. Actual: runtime crash on orphaned data. |
| 66 | 104 | ERROR | `cr.note` — if `note` field doesn't exist on the `characterReport` model, accessing it will be `undefined`. The ternary `cr.note ? ... : ''` would work, but TypeScript won't catch missing fields at runtime. More critically, `habitLabels` map uses keys like `proaktif`, `tujuan`, etc. which differ from `HABIT_LABELS` in pdf-report.ts (`bangun_pagi`, `beribadah`, etc.) — the AI report description and PDF report may show different habit names. | Expected: consistent habit key names. Actual: mismatched habit labels between AI and PDF. |

### 19. /api/scores (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 67 | 31 | WARN | ORANG_TUA access check: `student.parentId !== auth.userId && student.schoolId !== auth.schoolId` — uses OR logic (`&&` becomes AND). This means an ORANG_TUA is blocked if EITHER condition fails. Should be ORANG_TUA is allowed if EITHER parentId matches OR schoolId matches. | Expected: access if parent OR same school. Actual: blocked unless BOTH match. |
| 68 | 97 | ERROR | `classRank` calculation is fake: `Math.min(avgScore > 75 ? 3 : Math.ceil(avgScore / 20), totalClassmates)`. This doesn't actually rank the student among classmates — it's a formula that produces a number between 1-5, not a real rank. | Expected: actual rank among classmates. Actual: synthetic formula disguised as rank. |

### 20. /api/grades/final (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 69 | 175-178 | ERROR | `mode=class` fetches ALL students and calculates final grades sequentially in a `for...of` loop. For a class of 40 students, this fires 40+ serial DB queries. Should use batch/promise.all. | Expected: parallelized class-wide calculation. Actual: O(n) serial queries. |
| 70 | 199 | ERROR | Object.assign merges `r` (which includes `studentId` and `studentName`) with the manually constructed object (which also has `studentId` and `studentName`). The manual object's values override `r`'s, which is correct, but `Object.assign` is used instead of the spread operator, making the intent unclear. |

### 21. /api/ai/usage (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 72 | 8-9 | WARN | No ownership verification — any authenticated user can query any other user's usage by passing their userId. IDOR vulnerability. | Expected: can only view own usage (unless admin). Actual: cross-user usage query allowed. |

### 22. /api/materials (route.ts)

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 73 | (DELETE) | ERROR | The frontend calls `DELETE /api/materials?id=xxx` (guru-views.tsx line 586, guru-new-views.tsx implied). If the API doesn't support query-param-based DELETE or doesn't cascade, deletion fails silently. | Expected: reliable delete. Actual: potential FK constraint error. |

## PDF GENERATION (pdf-report.ts)

### 23. pdf-report.ts

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 74 | 100 | ERROR | `student.schoolId!` — non-null assertion. If a student has no schoolId, this crashes with `Cannot read properties of null`. | Expected: null check with error. Actual: runtime crash. |
| 75 | 104 | WARN | Same non-null assertion: `schoolId: student.schoolId!` in kepsek query. |
| 76 | 143 | WARN | Attendance query has no `term` filter — all attendance records across all terms are fetched and aggregated. A student's attendance from semester 1 will appear in the semester 2 rapor. | Expected: term-scoped attendance. Actual: cross-term aggregation. |
| 77 | 150-153 | WARN | Character report query has no `term` filter — same cross-term issue as attendance. | Expected: term-scoped. Actual: all historical data shown. |
| 78 | 199-405 | ERROR | No page-break handling in `generateRaporSiswaPDF`. If a student has many components (e.g., 15+), the table will overflow past the page boundary, overlapping with the signature section. The code at line 387 forces the signature to `pageH - 50` but the content above may already exceed that. | Expected: automatic page breaks when content exceeds page height. Actual: content/signature overlap for long reports. |
| 79 | 326-332 | WARN | 7 Kebiasaan layout uses fixed `col * 85` mm columns. With A4 width (210mm) and 20mm margins, only 2 columns fit (85*2=170 + 5 margin = 175). If the 4th habit (3rd row in col 0) exceeds `y + 18`, it moves to col 1 — but col 1 at `m + 90` = 110mm. The 3rd habit in col 1 starts at 110mm, and its text could extend beyond the page width (210 - 20 = 190mm content width). Long habit label+value text could overflow. | Expected: responsive column layout. Actual: potential text overflow. |
| 80 | 617-618 | WARN | In `generateLeggerPDF`, `compColW = Math.min(20, ...)` — with many components, columns become very narrow (down to ~20mm). Column headers are truncated at 6 chars (line 630), making them unreadable (e.g., "Tugas" → fine, but "Penilaian" → "Penila" → ambiguous). | Expected: landscape auto-pagination or abbreviations map. Actual: aggressive truncation. |
| 81 | 601 | WARN | Legger uses landscape A4 (297x210mm) but has only 10mm margins. With many components, the table can still exceed page width — no check. | Expected: width overflow detection. Actual: potential overflow. |
| 82 | 405 | WARN | `doc.output('arraybuffer') as unknown as Buffer` — unsafe type cast. `arraybuffer` returns ArrayBuffer, not Buffer. The `as unknown as Buffer` works at runtime in Node.js (because Buffer extends Uint8Array), but it's a type safety violation. |
| 83 | 687 | WARN | Same unsafe cast in `generateLeggerPDF`. |
| 84 | 381 | INFO | "Catatan Guru" section always shows "(Belum diisi)" in gray — no actual teacher notes are fetched or rendered. The field exists in the DB schema but is never populated. |

## CROSS-CUTTING CONCERNS

### Timer/Auto-Submit in Exams

| # | File | Line | Severity | Description | Expected vs Actual |
|---|------|------|----------|-------------|-------------------|
| 85 | N/A | N/A | INFO | No exam timer or auto-submit logic was found in any of the audited GURU files. Timer/auto-submit would be in the SISWA exam-taking component, which was not in the audit scope. However, the submission API (issue #47) has no server-side deadline enforcement, so even if a client-side timer exists, a student can submit after the deadline via API. | Expected: server-side deadline check. Actual: only client-side enforcement (if any). |

### AI Feature Integration After Anonymization

| # | File | Line | Severity | Description | Expected vs Actual |
|---|------|------|----------|-------------|-------------------|
| 86 | ai/generate-report-desc | 66 | ERROR | Habit key mismatch: AI route uses `proaktif`, `tujuan`, `prioritas`, `menang`, `mengerti`, `sinergi`, `asah` while PDF report uses `bangun_pagi`, `beribadah`, `berolahraga`, `makan_sehat`, `gemar_belajar`, `bermasyarakat`, `tidur_cepat`. The AI-generated description and the PDF rapor will reference completely different habit names. | Expected: single source of truth for habit keys. Actual: two incompatible key systems. |
| 87 | ai/generate-report-desc | 132 | WARN | AI is instructed "Jangan menyebutkan nama siswa atau jenis kelamin" but the prompt includes `student.class?.name` and attendance data which could implicitly reveal gender through Indonesian name patterns. | Expected: full anonymization. Actual: partial — class name may indirectly identify. |
| 88 | ai/chatbot | 153-154 | WARN | Chatbot bypasses `aiCompletion` helper, using the raw SDK directly. If API key rotation or model switching is implemented in `ai-helper.ts`, the chatbot won't pick up the changes. | Expected: centralized AI config. Actual: direct SDK usage. |

### Empty State Handling

| # | File | Line | Severity | Description | Expected vs Actual |
|---|------|------|----------|-------------|-------------------|
| 89 | guru-views.tsx (GuruSoalView) | 998-1015 | ERROR | Entire view operates on MOCK_SOAL — can never be empty because it's always 12 items. Empty state at line 1089-1094 is unreachable. | Expected: empty state shown when no real questions. Actual: always shows mock data. |
| 90 | guru-views.tsx (GuruTryoutView) | N/A | ERROR | Same issue — MOCK_TRYOUT is always 6 items. Empty state unreachable. | |
| 91 | guru-new-views.tsx (GuruTugasView) | 287 | WARN | Initializes with MOCK_TUGAS. Empty state only shows after successful API fetch that returns empty array. On API failure, mock data is shown. | |
| 92 | guru-dashboard.tsx | 184-197 | INFO | Activities and top students are always mock — no empty state needed but also no real data. | |

## SUMMARY

| Severity | Count |
|----------|-------|
| ERROR | 28 |
| WARN | 45 |
| INFO | 15 |
| **Total** | **88** |

### Top Critical Issues (ERROR)
1. **Syntax error in /api/assignments/[id]/route.ts line 29** — unclosed string literal breaks the build
2. **IDOR in submission POST** (submissions/route.ts:73) — student can submit answers as another student
3. **AI JSON.parse crash** (generate-questions/route.ts:61) — LLM output can crash the server
4. **Race condition in submission** (submissions/route.ts:96-119) — transaction doesn't cover status update
5. **Null dereference in PDF** (pdf-report.ts:100) — student without schoolId crashes PDF generation
6. **PDF content overflow** (pdf-report.ts:199-405) — no page-break for long reports
7. **Question edit loses associations** (guru-assignment-view.tsx:349) — questionIds cleared on edit
8. **CalcTotalScore wrong fallback** (guru-assignment-view.tsx:571) — `?? 1` gives 1 point for 0-point questions
9. **Mock data masks real empty state** (guru-views.tsx:998, 1140) — bank soal and tryout are non-functional
10. **Report history shows static data** (guru-views.tsx:2146) — history tab never shows real history
11. **Habit key mismatch** (ai/generate-report-desc:66 vs pdf-report.ts:8-16) — AI and PDF use different labels
12. **Chatbot bypasses AI helper** (ai/chatbot/route.ts:153) — inconsistent AI configuration
13. **Fake class rank** (scores/route.ts:97) — formula disguised as real rank
14. **ORANG_TUA access logic inverted** (scores/route.ts:31) — AND instead of OR
15. **Edit assignment clears questions** (guru-assignment-view.tsx:335-349)
16. **JSON.parse crash in AI views** (guru-ai-views.tsx:278) — no try/catch on options parse
---
Task ID: audit-siswa
Agent: general-purpose
Task: Functional audit of all SISWA code paths

# SISWA Code Path Audit Report

## Summary

Audited 14 files across frontend views, API routes, auth, middleware, and state management.
Found **47 issues** (10 ERROR, 25 WARN, 12 INFO).
Critical themes: missing exam/tryout engine implementation, no state persistence on refresh, IDOR in submission endpoint, no page-level route protection, RBAC mismatch on exams API.

---

## 1. siswa-dashboard.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 1 | 200 | WARN | Hardcoded mock streak value `const streak = 5;` | Expected: real streak from API. Actual: always shows 5 hari. |
| 2 | 215-216 | WARN | Non-OK API response silently swallowed — `if (res.ok)` branch only, no `else` to read error body | Expected: error details shown to user. Actual: only generic toast on catch. |
| 3 | 283, 303, 315, 327 | INFO | All `navigateTo('siswa-tugas' as ViewType)` calls use unsafe `as` cast | Expected: type-safe navigation. Actual: `as ViewType` masks potential invalid view names. |
| 4 | 528, 547, 562 | ERROR | All three quick-action buttons (Diagnostic, Latihan, Tryout) navigate to the same view `siswa-tugas` | Expected: distinct destinations for diagnostic/tryout/drill. Actual: all go to same task list, no way to start any exam. |
| 5 | 228-233 | WARN | Learning step logic never reaches step 4 (Rekomendasi) — returns 3 (Evaluasi) as max | Expected: all 5 steps reachable. Actual: step index 4 is dead code. |
| 6 | N/A | ERROR | **No exam engine / tryout engine / diagnostic test flow exists anywhere in the codebase** — no timer, no question rendering, no auto-submit, no state persistence for in-progress exams | Expected: full diagnostic → answer → submit → results flow. Actual: completely unimplemented. |

---

## 2. siswa-views.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 7 | 286-287 | ERROR | Subject grouping uses `attempt.answers[0]?.question?.subject` — first answer's subject only. Multi-subject exams are misattributed. | Expected: per-question subject breakdown or exam-level subject. Actual: entire attempt labeled by one question's subject. |
| 8 | 303-304 | WARN | `group.attempts.sort(...)` mutates array in-place inside `useMemo` | Expected: immutable sort. Actual: direct mutation may cause subtle React rendering bugs. |
| 9 | 677 | WARN | `attempt.answers[0]?.question?.subject?.name \|\| '-'` — table shows '-' when answers array is empty | Expected: show exam title or subject from exam package. Actual: shows '-' making row less informative. |
| 10 | 803 | INFO | `attempts.reduce((s, a) => s + a.duration, 0)` includes in_progress attempts whose duration may not be final | Expected: only completed attempt durations. Actual: inflates total time stat. |
| 11 | 1153-1158 | INFO | Division-by-zero guard exists (`> 0` check) but the ternary and nested expression is fragile and hard to read | Expected: clear safe division. Actual: correct but brittle. |
| 12 | 777-778 | INFO | Status filtering is client-side only; API returns all attempts | Expected: server-side filtering for performance. Actual: fetches all then filters client-side. |

---

## 3. siswa-new-views.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 13 | 160-213 | ERROR | **MOCK_TASKS and MOCK_SUBJECTS used as production fallback** — every API failure silently degrades to hardcoded fake data | Expected: error state shown to user. Actual: user sees fabricated data thinking it's real. |
| 14 | 269-270, 718-719 | WARN | `user?.schoolId \|\| ''` sends empty string to API instead of omitting the parameter | Expected: param omitted when undefined. Actual: API receives `?schoolId=` which may match unexpected records. |
| 15 | 301-302, 748-749 | WARN | `catch { setSubjects(MOCK_SUBJECTS); }` — errors silently swallowed, no error logging | Expected: error reported/logged. Actual: completely silent failure. |
| 16 | 370-376 | WARN | `handleRefresh` is fake — uses `setTimeout(r, 600)` then `setIsLoading(false)`, doesn't refetch from API | Expected: actual data refetch. Actual: fake loading spinner for 600ms. |
| 17 | 887-890 | ERROR | Empty request headers in `handleSubmitScore` fetch — `'Content-Type': 'application/json'` followed by two blank lines | Expected: clean headers object. Actual: malformed headers (cosmetic but signals copy-paste error). |
| 18 | 1319-1320, 1482-1501 | ERROR | Hardcoded class names (`'XII IPA 1'`) and period strings — `selectedClass` and `selectedPeriod` state never used in API calls | Expected: class/period filter actually filters data. Actual: purely decorative dropdowns with no effect. |
| 19 | 855-858 | WARN | `handleStartTask` only updates local state status to 'dikerjakan' — no API call, no persistence | Expected: server-side status update. Actual: status lost on refresh. |
| 20 | 862-865 | WARN | `handleViewResult` uses `toast.info()` to show score — no detail view or navigation | Expected: navigate to result detail. Actual: transient toast notification. |
| 21 | 679-689 | WARN | `getCountdown` uses `Math.ceil` for days diff — at 1 hour remaining shows "1 hari lagi" instead of "< 1 hari" | Expected: "< 1 hari" or "Beberapa jam lagi". Actual: shows "1 hari lagi" due to ceiling. |

---

## 4. siswa-ai-views.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 22 | 104 | WARN | `fetch('/api/subjects').then((r) => r.json()).then(setSubjects).catch(() => {})` — no `!res.ok` check, error silently swallowed | Expected: error handling for failed subject fetch. Actual: silent failure, empty subject list. |
| 23 | 112-113 | WARN | `fetchSessions` doesn't check `!res.ok` before `res.json()` — non-JSON error responses will crash `.json()` | Expected: guard before parsing. Actual: potential unhandled promise rejection on non-200. |
| 24 | 122-137 | ERROR | `fetchMessages` fetches the sessions list again instead of actual messages. Comment says "For now, we'll create a lightweight endpoint approach" — **message history is never loaded** | Expected: message history loaded on session click. Actual: all previous messages lost, chat appears empty. |
| 25 | 206-209 | ERROR | `data.message.id` and `data.message.content` accessed without null check — if API returns unexpected shape (e.g., `{error: ...}`), this crashes at runtime | Expected: defensive access with optional chaining. Actual: `Cannot read properties of undefined` runtime error. |
| 26 | 230-238 | ERROR | `handleSessionClick` clears all messages (`setMessages([])`) — **no message history is loaded or persisted** | Expected: previous messages shown. Actual: every session switch appears as empty chat. |
| 27 | 348 | INFO | `__none__` sentinel value for "no subject" may be sent as `subjectId` to API | Expected: omitted or null. Actual: string `__none__` sent to backend. |

---

## 5. siswa-assignment-view.tsx

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 28 | 208-209 | ERROR | `isQuestionPG` only returns true for `type === 'pg'` — `pg_kompleks` type is treated as essay (no radio buttons rendered) | Expected: `pg_kompleks` rendered as PG with radio options. Actual: rendered as essay textarea. |
| 29 | 307-309 | WARN | Loading existing answers maps by `a.questionId` — if assignment questions use a different ID scheme than submission answers, answers won't pre-fill | Expected: answers correctly pre-populate. Actual: potential mismatch depending on data model. |
| 30 | 399-414 | WARN | Autosave `useEffect` recreates `setInterval` every time `saving` or `submitting` changes — rapid state toggling could cause multiple intervals | Expected: stable single interval. Actual: interval churn on every save/submit state change. |
| 31 | 417-421 | WARN | `hasUnsavedRef.current = true` set on every `answers` or `view` change, including initial load from API — triggers unnecessary autosave on first 30s tick | Expected: only true after user modifies an answer. Actual: true immediately after API data loads. |
| 32 | 705, 960-963 | ERROR | **No real-time deadline timer or auto-submit** — `getCountdown` is computed once per render, not live. Student can work past deadline. | Expected: live countdown timer + auto-submit when time expires. Actual: static text that only updates on re-render. |
| 33 | 1334 | INFO | Component falls through to `return null` if view state is corrupted — blank screen with no error message | Expected: error fallback UI. Actual: blank render. |

---

## 6. api/attempts/route.ts

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 34 | 38-40 | ERROR | `answers: true` in Prisma include doesn't include `question.subject` relation — but frontend at siswa-views.tsx:286 expects `attempt.answers[0].question.subject.name` | Expected: nested include for question→subject. Actual: `question` and `subject` are undefined at runtime. |
| 35 | 56-57 | ERROR | `extra.activeScore = remedial.score` — sets activeScore to raw points (e.g., 45) but frontend displays it as percentage (shows "45%" instead of actual percentage) | Expected: percentage value. Actual: raw points value displayed as percentage. |
| 36 | 125 | ERROR | `question.answer?.toLowerCase().trim()` — if `question.answer` is null/undefined, the optional chain returns undefined and `.toLowerCase()` crashes | Expected: safe comparison. Actual: `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`. |
| 37 | 149-153 | WARN | Duplicate attempt check uses `findFirst` inside `$transaction` — not atomic against concurrent requests. Two simultaneous POSTs can both pass the check. | Expected: unique constraint or serializable transaction. Actual: race condition window. |
| 38 | 149 | ERROR | `where: { userId, examSessionId, status: 'in_progress' }` — when `examSessionId` is null (diagnostic test), this matches ANY in_progress attempt for the user, blocking new attempts | Expected: only match same exam session. Actual: blocks all new attempts if any in_progress exists. |
| 39 | 145 | INFO | TKA prediction `percentage * 8 + 200` always produces a value — 0% score gives TKA prediction of 200, which may be misleading | Expected: conditional prediction or null for very low scores. Actual: always shows a number. |
| 40 | 29 | INFO | `const where: any = {}` bypasses Prisma type safety | Expected: typed WhereInput. Actual: `any` loses type checking. |

---

## 7. api/exams/route.ts

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 41 | 9 | ERROR | GET endpoint requires `['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']` — **'SISWA' role is not included**, but `siswa-views.tsx:240-241` calls this API as a student | Expected: student can fetch exam list. Actual: student gets 403 Forbidden. |
| 42 | 108-111 | ERROR | PATCH updates both `examSession` and `examPackage` using the same `id` — if the ID belongs to one entity type, the other update will throw Prisma P2025 (not found) | Expected: separate ID handling per entity type. Actual: always tries both updates, one will fail. |
| 43 | 31-33 | WARN | `OR: schoolId ? [{ schoolId }, { schoolId: null }] : undefined` — when schoolId is empty string (falsy in JS but not null), the OR clause is skipped | Expected: empty string treated same as missing. Actual: inconsistent behavior. |

---

## 8. api/submissions/[id]/route.ts

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 44 | 9 | ERROR | **IDOR vulnerability** — only `requireAuth` is called with no ownership or role check. Any authenticated user (including students) can view any submission by ID | Expected: ownership check (student can only see own, guru only sees own school). Actual: any logged-in user can read any submission. |

---

## 9. api/assignments/[id]/submissions/remedial/route.ts

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 45 | 38-39 | WARN | `original.schoolId` and `original.classId` used without null check — if either is null, the create will set null which may violate schema constraints | Expected: null-safe handling. Actual: potential Prisma runtime error if schema requires non-null. |

---

## 10. api/assignments/[id]/questions/route.ts

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 46 | 31 | WARN | `Math.floor(totalPoints / questionIds.length)` — remainder points are silently lost (e.g., 100 / 3 = 33×3 = 99, 1 point evaporates) | Expected: distribute remainder or warn. Actual: silent point loss. |
| 47 | 39 | INFO | `answer: true` exposes correct answers in the POST response — only called by guru roles so intentional, but worth noting | Expected: N/A. Actual: answer key in response body. |

---

## 11. lib/auth.ts

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 48 | 14, 18-19 | WARN | Dev-mode fallback JWT secret `'dev_jwt_secret_do_not_use_in_prod'` — if `NODE_ENV` is accidentally not set to `production`, the weak key is used in production | Expected: no fallback in any env. Actual: weak key used if env var misconfigured. |
| 49 | 34 | WARN | Legacy password salt fallback `process.env.PASSWORD_SALT \|\| 'pandai_dev_salt_2024'` — hardcoded salt weakens legacy password verification | Expected: required env var. Actual: fallback salt usable in production. |
| 50 | 80-91 | INFO | `verifySession` returns `null` for all errors (expired, invalid, malformed) — no differentiation between expired vs invalid token | Expected: distinct error types for logging/monitoring. Actual: all failures are silent null. |
| 51 | 111 | WARN | Cookie regex `new RegExp(\`\${JWT_COOKIE_NAME}=([^;]+)\`)` — doesn't handle URL-encoded cookie values. JWT tokens with `=` chars could be truncated. | Expected: proper cookie parsing (e.g., `cookie` package). Actual: regex may match incorrectly. |

---

## 12. middleware.ts

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 52 | 110-115 | ERROR | **No page-level route protection** — middleware `matcher` only covers API routes. Unauthenticated users can access all SPA pages by direct URL | Expected: middleware redirects unauthenticated users from protected pages. Actual: any user can load the SPA shell and see cached state. |
| 53 | 12 | WARN | CSP allows `'unsafe-inline'` and `'unsafe-eval'` — significantly weakens XSS protection | Expected: strict CSP with nonce-based inline. Actual: permissive CSP. |
| 54 | 27 | INFO | `x-forwarded-for` header trusted for IP extraction — can be spoofed by clients | Expected: only trust when behind known proxy. Actual: first hop value used directly. |

---

## 13. store/use-store.ts

| # | Line | Severity | Description | Expected vs Actual |
|---|------|----------|-------------|-------------------|
| 55 | 151 | ERROR | **No state persistence** — all Zustand state is in-memory only. Page refresh resets `currentView` to `'landing'`, clears `user` to `null`, loses all unsaved work | Expected: persisted auth state at minimum. Actual: refresh = logout. |
| 56 | 161 | WARN | `isAuthenticated: !!user` is derived client-side, not validated against server session | Expected: server-validated auth state. Actual: client-only boolean, can be spoofed in devtools. |
| 57 | 175 | WARN | `navigateTo` accepts any `ViewType` with no role-based validation — a student could navigate to `guru-bank-soal` view | Expected: role-validated navigation. Actual: any view accessible regardless of role. |
| 58 | 163-165 | WARN | `logout` fires `fetch('/api/auth/logout')` with `.catch(() => {})` — if the API call fails, local state is cleared but server session persists | Expected: ensure server session is cleared or warn user. Actual: silent failure leaves orphan server session. |

---

## Cross-Cutting Issues (span multiple files)

| # | Severity | Description | Affected Files |
|---|----------|-------------|----------------|
| 59 | ERROR | **No exam/tryout/diagnostic engine exists** — there is no component that renders exam questions with a timer, allows answering, and submits. The entire diagnostic→answer→submit→results flow is unimplemented. | dashboard, all views, no engine file found |
| 60 | ERROR | **No browser-refresh state persistence for in-progress exams** — since no engine exists and Zustand has no persistence, any refresh during an exam would lose all progress | store, all views |
| 61 | ERROR | **No adaptive practice logic** — no code selects questions based on weak topics or adjusts difficulty | all files |
| 62 | WARN | **No tryout timer and auto-submit** — no `setInterval`-based timer or auto-submit-on-expiry logic found anywhere in the codebase | all files |
---
Task ID: audit-ortu-crosscut
Agent: general-purpose
Task: Audit ORANG_TUA views + cross-cutting issues across 18 files

# ORANG_TUA & Cross-Cutting Audit Report

## A. ORANG_TUA — orang-tua-dashboard.tsx

### OTU-D01 | ERROR | Hardcoded mock data on API failure masks real issues
**File:** orang-tua-dashboard.tsx, line 221-249
**Description:** When the fetch to `/api/users?parentId=${user.id}` fails (network error, 500, etc.), the catch block silently falls back to hardcoded mock children with hardcoded `avgScore: 72.5`, `totalExams: 8`, `attendance: 95`. The parent sees realistic but fake data and has no indication anything went wrong.
**Expected:** Show an error state or empty state with a retry button.
**Actual:** Shows fake mock child data indistinguishable from real data.

### OTU-D02 | ERROR | Stats are computed from hardcoded values, not API data
**File:** orang-tua-dashboard.tsx, lines 221-229
**Description:** The `fetchChildren` function maps API response data but OVERRIDES `avgScore`, `totalExams`, `attendance`, and `lastActive` with hardcoded literals (`72.5`, `8`, `95`, `'2 jam lalu'`). Even when the API returns real children, the summary stats and progress bars always show the same fake numbers.
**Expected:** Stats should come from the API or be fetched from a separate endpoint.
**Actual:** Every child always shows avgScore=72.5, attendance=95%, etc.

### OTU-D03 | WARN | Hydration mismatch from `new Date()` at render time
**File:** orang-tua-dashboard.tsx, lines 169-170
**Description:** `const today = new Date()` and `today.toLocaleDateString(...)` are called in the component body (not inside useEffect). This produces different values on server vs client, causing a React hydration mismatch warning in console.
**Expected:** Date should be initialized inside useEffect or use suppressHydrationWarning.
**Actual:** Potential hydration warning on every render.

### OTU-D04 | WARN | No error shown to user when fetch returns non-ok
**File:** orang-tua-dashboard.tsx, line 218-233
**Description:** When `res.ok` is false (e.g., 401 session expired, 403, 500), the code simply sets `children([])` with no toast or error indicator. The user sees an empty state with no explanation.
**Expected:** Show a toast or error message explaining the failure.
**Actual:** Silent failure showing "Belum ada data anak terdaftar".

### OTU-D05 | WARN | All child cards navigate to same view without child context
**File:** orang-tua-dashboard.tsx, lines 361-362
**Description:** Every child card's onClick calls `navigateTo('ortu-nilai')` without passing the child ID. When navigating to the detail views, there is no way to know which child's data to load; the detail views independently re-fetch children and pick the first one.
**Expected:** Child ID should be passed so detail views open with that specific child selected.
**Actual:** Always opens with the first child selected regardless of which card was clicked.

### OTU-D06 | INFO | `lastActive` is always hardcoded string
**File:** orang-tua-dashboard.tsx, line 228, line 407
**Description:** `lastActive` is set to the string `'2 jam lalu'` in both mock and API-mapped data. It never reflects actual activity.

### OTU-D07 | INFO | `h-4.5 w-4.5` is non-standard Tailwind class
**File:** orang-tua-dashboard.tsx, line 437, line 522
**Description:** `h-4.5 w-4.5` used for Bell and Star icons. This may not render as expected unless custom Tailwind config has half-step sizes.

---

## B. ORANG_TUA — orang-tua-views.tsx

### OTU-V01 | ERROR | `className` field mapping mismatch — always shows "-"
**File:** orang-tua-views.tsx, line 343
**Description:** The code maps `className: d.className || '-'` but the API returns children with nested class data like `{ class: { name: 'XII IPA 1' } }`. Compare with `orang-tua-dashboard.tsx` line 224 which correctly uses `c.class?.name` and `ortu-new-views.tsx` line 234 which uses `u.class?.name`. This means the `ChildSelector` pills will always show "-" as the class name for every child.
**Expected:** Should use `d.class?.name || '-'` to match the API response structure.
**Actual:** All children show "-" for class name in the selector pills.

### OTU-V02 | ERROR | Mock data fallback in every view hides real errors from users
**File:** orang-tua-views.tsx, lines 349-411 (OrtuNilaiView), 824-846 (OrtuMateriView), 1170-1197 (OrtuKehadiranView), 1577-1617 (OrtuKuisView), 1979-2007 (OrtuLaporanView)
**Description:** Every single view component's data fetch has a catch block that silently replaces the failed fetch with elaborate mock data. The user cannot distinguish between real data and mock data. This pattern exists in ALL 5 exported views.
**Expected:** Show error state with retry. Mock data should only exist in dev mode.
**Actual:** Network/500 errors are invisible; users see realistic fake data.

### OTU-V03 | ERROR | `periodFilter` state is never used in data fetching
**File:** orang-tua-views.tsx, line 309, line 477-491 (OrtuNilaiView)
**Description:** `periodFilter` is set via UI pills but the `fetchChildScores` function (line 361) does not pass `periodFilter` to the API. Changing the period filter has zero effect on displayed data.
**Expected:** Period filter should parameterize the API call.
**Actual:** Period filter pills are cosmetic only; data never changes.

### OTU-V04 | ERROR | `periodFilter` state is never used in OrtuLaporanView either
**File:** orang-tua-views.tsx, line 1911, line 2043-2057
**Description:** Same issue as OTU-V03 but in the reports view. The period filter changes UI state but does not affect `fetchRecentDownloads`.

### OTU-V05 | WARN | `useEffect` dependency on `user` object causes re-fetch loop risk
**File:** orang-tua-views.tsx, lines 325-327, 800-802, 1146-1148, 1553-1555, 1955-1957
**Description:** All 5 views have `useEffect(() => { fetchData(); }, [user]);` where `user` is an object. If the store re-creates the user object on any state change (common with zustand), this will cause infinite re-fetching. The effect should depend on `user?.id` instead.
**Expected:** Dependency should be `user?.id`.
**Actual:** Depends on the entire `user` object reference.

### OTU-V06 | WARN | `fetchChildScores` missing from useEffect dependency array
**File:** orang-tua-views.tsx, line 329-331
**Description:** `useEffect(() => { if (selectedChild) fetchChildScores(); }, [selectedChild]);` — `fetchChildScores` is defined inline and references `selectedChild` from closure, but the exhaustive deps rule would flag this. Not a runtime bug currently but fragile.

### OTU-V07 | WARN | Division by zero guard missing in rank percentage
**File:** orang-tua-views.tsx, line 530
**Description:** `Math.round((classRank / totalClassmates) * 100)` — if `totalClassmates` is 0 (API returns 0 or null), this produces `NaN` or `Infinity` displayed as "Top NaN%".
**Expected:** Guard with `totalClassmates > 0`.
**Actual:** Potential NaN display.

### OTU-V08 | WARN | Learning objective row only shows first match
**File:** orang-tua-views.tsx, line 693
**Description:** `recentScores.find((s) => s.learningObjective)?.learningObjective` only shows the first score's learning objective, even if multiple scores have different objectives.
**Expected:** Show all unique learning objectives or show the one for the specific score row.
**Actual:** Only first matching learning objective is displayed.

### OTU-V09 | WARN | `subjects` list has no empty state when no data
**File:** orang-tua-views.tsx, line 571-601
**Description:** The subject breakdown card has `max-h-[420px] overflow-y-auto` but no empty state when `subjects` is an empty array. Shows an empty scrollable container.
**Expected:** Show EmptyState component when subjects is empty.
**Actual:** Empty container with just the card header.

### OTU-V10 | WARN | `correctPct + wrongPct` may not equal 100%
**File:** orang-tua-views.tsx, lines 1775-1776
**Description:** If `total` (computed from `a.total || (a.correct + a.wrong)`) includes unanswered questions, then `correctPct + wrongPct < 100` and the distribution bar will not fill completely. This is misleading.
**Expected:** Either show unanswered as a third segment or note the gap.
**Actual:** Bar visually implies correct+wrong = 100% of total.

### OTU-V11 | INFO | `handleExport` and `handlePrint` are stubs
**File:** orang-tua-views.tsx, lines 443-449 (handlePrint), 1280-1285 (handleExport)
**Description:** These functions show a toast and either call `window.print()` or do nothing. No actual file download or PDF generation occurs for exports.

### OTU-V12 | INFO | Download/Print in OrtuLaporanView are stubs
**File:** orang-tua-views.tsx, lines 2010-2026
**Description:** `handleDownloadPDF` and `handlePrint` show toasts with setTimeout but perform no actual download or print operation.

---

## C. ORANG_TUA — ortu-new-views.tsx

### OTU-N01 | ERROR | Character report save shows success toast on network failure
**File:** ortu-new-views.tsx, lines 336-337
**Description:** In `handleSave`, the catch block calls `toast.success('Laporan berhasil disimpan!')` — it tells the user the save succeeded when it actually failed.
**Expected:** Should show `toast.error()` on catch.
**Actual:** User sees a success message despite the save failing.

### OTU-N02 | ERROR | Save fires N parallel requests without transaction
**File:** ortu-new-views.tsx, lines 319-333
**Description:** The save function loops through `filledRatings` and fires individual `fetch('/api/character-reports', { method: 'POST' })` calls with `await` in a for-loop. If any request fails partway through, some ratings are saved and others are not — partial save with no rollback.
**Expected:** Should use a single batch API endpoint or at least detect partial failure.
**Actual:** Silent partial saves are possible.

### OTU-N03 | WARN | Mock data fallback on catch for child loading
**File:** ortu-new-views.tsx, lines 241-249, 710-716
**Description:** Both `OrtuKarakterView` and `OrtuRekapKarakterView` fall back to mock children data on fetch failure, same pattern as OTU-V02.

### OTU-N04 | WARN | `getInitials` crashes on empty string
**File:** ortu-new-views.tsx, line 101-108
**Description:** If `name` is an empty string, `''.split(' ')` returns `['']`, then `''.split(' ')[0]` is `''`, and `''.toUpperCase()` is `''` — this works but produces an empty avatar. The overload in `orang-tua-views.tsx` line 164-171 handles this with `(name || '-')` fallback, but `ortu-new-views.tsx` does not.
**Expected:** Should handle empty/null name.
**Actual:** Empty avatar circle rendered if name is empty.

### OTU-N05 | WARN | Trend data is hardcoded, not from API
**File:** ortu-new-views.tsx, line 748
**Description:** In `OrtuRekapKarakterView`, the trend for each habit is set to `['up', 'stable', 'down', 'up', 'stable', 'down', 'up'][idx]` — a static rotation, not computed from actual data. The "Tren" column in the summary table shows fake trends.
**Expected:** Trend should be calculated by comparing current vs previous period data.
**Actual:** Shows deterministic fake trend pattern.

### OTU-N06 | WARN | `viewMode` and `comparisonPeriod` state are unused
**File:** ortu-new-views.tsx, lines 671-672
**Description:** `viewMode` ('weekly' | 'monthly') and `comparisonPeriod` ('current' | 'previous') are set via UI toggles but never passed to any API call or used to filter/display data differently.
**Expected:** These should affect the data being displayed.
**Actual:** Toggles are purely cosmetic; data never changes.

### OTU-N07 | WARN | Month navigation has no bounds checking
**File:** ortu-new-views.tsx, lines 684-693
**Description:** `prevMonth()` and `nextMonth()` allow unlimited navigation to any past or future month. There's no restriction to prevent selecting months before the child was enrolled or far in the future.
**Expected:** Should have reasonable bounds.
**Actual:** Can navigate to year 2020 or 2030.

### OTU-N08 | INFO | `DOMPurify.sanitize` used on recommendations but input is hardcoded
**File:** ortu-new-views.tsx, line 1296
**Description:** `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rec) }}` is used but `rec` comes from template literals built from `weakest.name` and `strongest.name` which come from the `SEVEN_HABITS` constant. The sanitization is unnecessary overhead but not harmful.

---

## D. CROSS-CUTTING — app-layout.tsx

### CC-L01 | ERROR | Notification bell always shows red dot regardless of actual notifications
**File:** app-layout.tsx, line 895
**Description:** `<span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />` is always rendered. Every user always sees a pulsing red notification dot even when there are no notifications.
**Expected:** Dot should only appear when there are unread notifications.
**Actual:** Permanent false-positive notification indicator.

### CC-L02 | ERROR | Logout only clears client-side state, does not call server
**File:** app-layout.tsx, lines 738-741
**Description:** `handleLogout` calls `logout()` (zustand store action) and shows a toast. It does NOT call `fetch('/api/auth/logout', { method: 'POST' })`. The server-side session cookie remains valid. If the cookie is httpOnly, the client cannot clear it. A session fixation/ghost session remains on the server.
**Expected:** Should call `/api/auth/logout` API to invalidate the server session.
**Actual:** Only client store is cleared; server session persists.

### CC-L03 | WARN | Breadcrumb Fragment key uses `crumb.label` which may not be unique
**File:** app-layout.tsx, line 859
**Description:** `key={crumb.label}` — if two breadcrumbs have the same label (e.g., two views with label "Laporan"), React will warn about duplicate keys.
**Expected:** Use index or a more unique key.
**Actual:** Potential duplicate key warning.

### CC-L04 | WARN | Sidebar section collapse state not persisted across navigations
**File:** app-layout.tsx, line 637
**Description:** `const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});` — All sidebar sections start expanded and collapse state resets on every re-render/navigation.
**Expected:** Persisted or at least consistent within a session.
**Actual:** Sections reset to expanded on view change.

### CC-L05 | WARN | Mobile menu button overlaps with content on small screens
**File:** app-layout.tsx, lines 805-812, 840
**Description:** The mobile menu button is `fixed left-4 top-3 z-40 lg:hidden` and the header has a `<div className="w-10 lg:hidden" />` spacer. On very small screens (< 360px width), the fixed button may overlap the breadcrumb text or user dropdown.
**Expected:** Button should be part of the header flow or have proper z-index management.
**Actual:** Potential overlap on very narrow viewports.

### CC-L06 | INFO | `NAV_CONFIG` constant (lines 442-449) is declared but never used
**File:** app-layout.tsx, line 442-449
**Description:** `const NAV_CONFIG: RoleNav` is defined with empty arrays for all roles but is never referenced. `buildNavConfig()` is used instead. Dead code.

---

## E. CROSS-CUTTING — register-form.tsx

### CC-R01 | ERROR | ORANG_TUA role cannot self-register through UI
**File:** register-form.tsx, line 18
**Description:** `type RegisterRole = 'SISWA' | 'GURU' | 'ADMIN_SCHOOL'` — the ORANG_TUA role is not included in the register form. `ROLE_CARDS` on line 39-43 also only shows 3 options. Meanwhile, `/api/auth/register` route (line 11) explicitly allows `'ORANG_TUA'` in `ALLOWED_SELF_REGISTER_ROLES`. Parents have no way to create an account through the UI.
**Expected:** ORANG_TUA should be a registration option if the API allows it.
**Actual:** Parents cannot register; only Siswa, Guru, and Admin Sekolah can.

### CC-R02 | WARN | NPSN input accepts non-numeric characters
**File:** register-form.tsx, line 460-473
**Description:** The NPSN input has `type="text"` and only validates via `!q` (empty check). Users can type letters, special characters, etc. NPSN should be 8 digits.
**Expected:** Should validate that input is exactly 8 numeric digits before searching.
**Actual:** Any string is accepted and sent to the API.

### CC-R03 | WARN | Terms & conditions checkbox uses custom styling that may break accessibility
**File:** register-form.tsx, lines 826-844
**Description:** The checkbox uses `peer sr-only` with a custom div overlay. The `<label>` wraps everything but contains `<span>` elements with `cursor-pointer` for links that don't actually navigate anywhere (no href or onClick). Screen readers may not associate the label correctly with the hidden input.
**Expected:** Links should have onClick handlers or hrefs.
**Actual:** "Syarat & Ketentuan" and "Kebijakan Privasi" links look clickable but do nothing.

### CC-R04 | WARN | Role change does not reset password fields
**File:** register-form.tsx, lines 319-327
**Description:** `handleRoleChange` resets name, email, and Dapodik state when switching to ADMIN_SCHOOL, but does NOT reset password/confirmPassword when switching roles. If a user types a password for SISWA then switches to GURU, the password persists.
**Expected:** Could clear password fields on role change.
**Actual:** Password persists across role changes.

### CC-R05 | INFO | Checkbox `opacity-0` animation with peer-checked may have timing issues
**File:** register-form.tsx, line 834
**Description:** The check icon has `opacity-0 peer-checked:opacity-100 transition-opacity` but no transition duration specified, causing instant show/hide that looks jarring.

---

## F. CROSS-CUTTING — error.tsx

### CC-E01 | WARN | Error boundary has no "Go Home" or "Login" link
**File:** error.tsx, line 15
**Description:** The error page only has a "Coba Lagi" button that calls `reset()`. If the error is persistent (e.g., session expired, auth issue), the user is trapped with no way to navigate to login or home.
**Expected:** Should include a link to / or a login redirect option.
**Actual:** User can only retry; no escape hatch.

### CC-E02 | INFO | No error details shown to help with debugging
**File:** error.tsx, lines 10-18
**Description:** Only shows a generic message. In development, showing the error message or digest would help developers.

---

## G. CROSS-CUTTING — not-found.tsx

### CC-N01 | WARN | 404 page uses `<Link href="/">` which may not work with SPA routing
**File:** not-found.tsx, line 10
**Description:** The app uses client-side zustand-based navigation (`navigateTo`), but the 404 page uses Next.js `<Link href="/">`. If the app is a single-page app where `/` renders the authenticated layout, this link may show a blank page or redirect to login instead of the expected landing page.
**Expected:** Should use the app's navigation mechanism.
**Actual:** May navigate to an unexpected state.

---

## H. CROSS-CUTTING — middleware.ts

### CC-M01 | ERROR | No authentication/authorization check in middleware
**File:** middleware.ts, lines 23-107
**Description:** The middleware only handles rate limiting and security headers. It does NOT check for authentication cookies/tokens or redirect unauthenticated users. Protected pages like `/dashboard` or any authenticated route can be accessed without a valid session by directly navigating to the URL.
**Expected:** Should verify session cookie and redirect to login if invalid.
**Actual:** No auth gate at middleware level; relies entirely on client-side routing.

### CC-M02 | WARN | Security headers only applied to `/api/*` routes
**File:** middleware.ts, lines 109-116
**Description:** The `config.matcher` only matches API routes. Security headers (CSP, X-Frame-Options, etc.) are NOT applied to page routes. Page routes are served without security headers.
**Expected:** Security headers should be on all responses.
**Actual:** Only API responses have security headers.

### CC-M03 | INFO | `x-forwarded-for` header can be spoofed
**File:** middleware.ts, line 27
**Description:** `request.headers.get('x-forwarded-for')?.split(',')[0]` trusts the first hop of X-Forwarded-For. Without a trusted proxy configuration, clients can set this header to bypass rate limiting by rotating IPs.

---

## I. CROSS-CUTTING — API Routes

### CC-A01 | ERROR | `/api/auth/register` does not validate email format server-side
**File:** /api/auth/register/route.ts, line 17
**Description:** The server only checks `if (!email || !password || !name)`. It does NOT validate email format, password strength beyond length, or that `name` is a reasonable string. An attacker could register with `email: "not-an-email"`, `name: "<script>alert(1)</script>"`, etc.
**Expected:** Server-side email regex validation and input sanitization.
**Actual:** Any string accepted as email/name.

### CC-A02 | WARN | `/api/auth/register-school` does not validate email format
**File:** /api/auth/register-school/route.ts, line 10
**Description:** Same issue as CC-A01. No email format validation on the server.

### CC-A03 | WARN | `/api/auth/register-school` school code collision is handled weakly
**File:** /api/auth/register-school/route.ts, line 40
**Description:** If `NPSN-XXXX` collides, the fallback is `NPSN-<full-npsn>`. But if `npsn` itself is only 4 digits, then `lastFour = schoolData.npsn.slice(-4)` equals the full NPSN, so `schoolCode` and `finalCode` would be identical. The collision check is effectively dead code for 4-digit NPSNs.

### CC-A04 | WARN | `/api/auth/logout` has no CSRF protection
**File:** /api/auth/logout/route.ts, line 4
**Description:** The logout endpoint accepts POST without any CSRF token verification. A malicious page could trigger logout via a form POST.

### CC-A05 | INFO | `/api/health` exposes database error message
**File:** /api/health/route.ts, line 17
**Description:** Returns `error.message` in the response body. While health endpoints are typically internal, exposing DB error messages could leak infrastructure details.

---

## J. CROSS-CUTTING — rate-limit.ts

### CC-RL01 | WARN | In-memory rate limiter is ineffective in multi-instance/serverless deployments
**File:** rate-limit.ts, lines 1-5, 12
**Description:** Uses a `Map` stored in module scope. In serverless (Vercel) or multi-instance deployments, each instance has its own Map. An attacker hitting different instances gets `maxRequests * instanceCount` per window. Comment acknowledges this but it's a production concern.

### CC-RL02 | INFO | Memory leak potential for rate limit store
**File:** rate-limit.ts, lines 15-21
**Description:** `maybeCleanup()` only runs when store size >= 200. If the rate is low but there are many unique IPs (e.g., botnet), the store could grow to 199 entries with stale data before cleanup triggers.

---

## K. CROSS-CUTTING — error-log.ts

### CC-EL01 | WARN | Redundant ternary in level computation
**File:** error-log.ts, line 39
**Description:** `level: opts.statusCode && opts.statusCode >= 500 ? (opts.statusCode >= 500 ? 'error' : 'warn') : 'error'` — The outer condition `opts.statusCode >= 500` is checked twice. The inner ternary `opts.statusCode >= 500 ? 'error' : 'warn'` is only reached when the outer condition is already `>= 500`, so `'warn'` is dead code. All errors with statusCode end up as 'error'.
**Expected:** Should probably be: `statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'error'`.
**Actual:** 'warn' is unreachable; all logged errors get level 'error'.

---

## L. CROSS-CUTTING — layout.tsx

### CC-LO01 | WARN | External icon URL for favicon may fail offline
**File:** layout.tsx, line 22
**Description:** `icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg"` — The favicon is loaded from an external CDN. If the CDN is down or blocked (common in Indonesian school networks), the favicon will 404.
**Expected:** Should have a local fallback favicon.
**Actual:** Depends on external CDN availability.

---

## M. CROSS-CUTTING — use-mobile.ts

### CC-UM01 | WARN | `useIsMobile` returns `false` on server and initial render
**File:** use-mobile.ts, line 6, 18
**Description:** `useState<boolean | undefined>(undefined)` initialized to `undefined`, then `return !!isMobile` returns `false` for `undefined`. Combined with `useEffect` running after paint, this means mobile-specific layouts may flash desktop layout briefly on mobile devices (FOUC).
**Expected:** Could use CSS media queries instead to avoid flash.
**Actual:** Brief desktop layout flash on mobile page load.

---

## N. CROSS-CUTTING — constants.ts

### CC-C01 | WARN | Legacy `getSalt()` falls back to hardcoded dev salt in production if env unset
**File:** constants.ts, lines 93-100
**Description:** If `PASSWORD_SALT` env var is not set in production, `getSalt()` returns `'pandai_dev_salt_2024'` after logging a console.error. The `hashPassword` and `verifyPassword` functions are marked `@deprecated` but are still imported and used by `/api/auth/register/route.ts` and `/api/auth/register-school/route.ts` (line 3 in both files).
**Expected:** Production should fail fast if salt is missing, not fall back to a known dev value.
**Actual:** Could use insecure dev salt in production if env is misconfigured.

---

## SUMMARY

| Severity | Count |
|----------|-------|
| ERROR    | 14    |
| WARN     | 30    |
| INFO     | 10    |
| TOTAL    | 54    |

### Top 5 Critical Issues
1. **OTU-V01** — className mapping bug shows "-" for all children in all 5 detail views
2. **OTU-N01** — Character report save shows success toast on failure (data loss)
3. **CC-L02** — Logout doesn't call server; session persists (security)
4. **CC-M01** — No authentication middleware; all routes publicly accessible (security)
5. **CC-R01** — ORANG_TUA cannot self-register (blocked user onboarding)

### Top Cross-Cutting Concerns
1. **Mock data fallback pattern** (OTU-D01, OTU-V02, OTU-N03) — Users see fake data on any network error
2. **Hydration mismatch** (OTU-D03) — `new Date()` in component body
3. **Security headers not on pages** (CC-M02) — Only API routes get CSP/X-Frame-Options
4. **No server-side input validation** (CC-A01, CC-A02) — Email/name accepted as any string
5. **Dead/unused UI controls** (OTU-V03, OTU-V04, OTU-N06) — Period filter, view mode, comparison period do nothing

---
Task ID: 1
Agent: main
Task: Verify backend APIs for exam-taking

Work Log:
- Checked GET /api/exams returns ExamSession list for SISWA role
- Verified POST /api/attempts auto-scoring (PG questions)
- Found missing endpoint for fetching exam questions by session
- Created GET /api/exam-session/[sessionId] with security measures
- Added answer/explanation stripping for SISWA role (including isCorrect in options JSON)
- Added review=true mode for post-submission answer review

Stage Summary:
- New endpoint: /api/exam-session/[sessionId]
- Security: strips answer, explanation, isCorrect for SISWA during exam
- Review mode: returns answers when review=true (for result screen)

---
Task ID: 2-a
Agent: main
Task: Build Screen 1 - Daftar Tryout Tersedia

Work Log:
- Created SiswaTryoutView with internal screen state management
- Tabs: Tersedia, Selesai, Mendatang
- Stats cards showing total, available, completed, average score
- Cards for each session with status badges and action buttons

---
Task ID: 2-b
Agent: main
Task: Build Screen 2 - Layar Mengerjakan

Work Log:
- Pre-exam screen showing session details and warning
- Timer with auto-submit on expiry
- Question navigation sidebar with answered/unanswered indicators
- RadioGroup for PG questions with visual selection feedback
- Progress bar showing answered count
- Confirm dialog before submit

---
Task ID: 2-c
Agent: main
Task: Build Screen 3 - Layar Hasil

Work Log:
- Score card with percentage, predikat, TKA prediction
- Stats grid: Benar, Salah, Tidak Dijawab, Waktu
- Per-question answer review with correct/wrong indicators
- Toggleable pembahasan (explanation) section
- Fetches question data via review mode API

---
Task ID: 3
Agent: main
Task: Connect to navigation

Work Log:
- Added siswa-tryout to ViewType in store/use-store.ts
- Registered view in authenticated-app.tsx
- Updated sidebar: Tryout TKA now points to siswa-tryout
- Added VIEW_LABELS and breadcrumb entries

---
Task ID: 4
Agent: main
Task: E2E verification and fixes

Work Log:
- Found POST /api/attempts not including answers in response (Prisma 6 behavior)
- Fixed by adding include: { answers: true } to create call
- Verified full E2E flow via Agent Browser: login → list → start → answer 5Q → submit → result
- Result shows 100% score, Sangat Baik predikat, all 5 answers correct with pembahasan
- Selesai tab shows completed attempt
- Created scripts/verify/r50-exam-taking-ui.sh (8/8 checks pass)

Stage Summary:
- Critical fix: include: { answers: true } in POST /api/attempts
- E2E verified via Agent Browser
- Verification script: 8/8 pass
---
Task ID: kepsek-sidebar-fix
Agent: main
Task: Akses akun kepala sekolah dan identifikasi masalah yang belum berjalan

Work Log:
- Logged in as Kepala Sekolah (kepsek.sdn1 / password123) via agent-browser
- Tested all 7 sidebar menu items:
  1. Beranda (dashboard) - WORKS: shows summary cards + rekap table with tabs
  2. Rekap Per Kelas - BROKEN: showed dashboard content, not rekap kelas view
  3. Rekap Per Guru - BROKEN: showed dashboard content, not rekap guru view
  4. Rekap 7 Kebiasaan - BROKEN: showed dashboard content, not rekap karakter view
  5. Kotak Masukan - WORKS
  6. Profil Lulusan - WORKS
  7. Laporan & Rapor - WORKS
- Root cause: authenticated-app.tsx lines 121-123 mapped all 3 kepsek-rekap-* views to same KepalaSekolahDashboard component without tab sync
- Fix: Modified KepalaSekolahDashboard to subscribe to currentView from zustand store and derive activeTab from it
- Also made header dynamic (shows contextual title/description) and summary cards only show on main dashboard
- Verified fix via browser: all 3 rekap views now show correct content with proper headings

Stage Summary:
- Fixed file: src/components/dashboard/kepala-sekolah/kepala-sekolah-dashboard.tsx
- Key change: Added useEffect to sync activeTab with currentView from store
- Key change: isDashboardView flag to conditionally render summary cards and contextual header
- All 7 sidebar menu items for Kepala Sekolah now work correctly
