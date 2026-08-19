---
Task ID: 1
Agent: main
Task: R44 - Fitur F: Kotak Masukan (Saran/Kritik antar Role)

Work Log:
- Added Feedback model to prisma/schema.prisma (id, schoolId, fromUserId, fromRole, category, subject, message, status, response, respondedBy, respondedAt)
- Added relations to User (sentFeedback, respondedFeedback) and School (feedbacks)
- Pushed schema via `npx prisma db push`
- Created POST /api/feedback (any of 3 roles can send, auto-fills fromUserId/fromRole/schoolId)
- Created GET /api/feedback (ORANG_TUA: only own; GURU/KEPSEK/ADMIN: all school; SUPER_ADMIN: all)
- Created PATCH /api/feedback/[id] (GURU/KEPSEK/ADMIN/SUPER_ADMIN only; ORANG_TUA gets 403)
- Added ViewType entries: guru-kotak-masukan, ortu-kotak-masukan, kepsek-kotak-masukan
- Added sidebar nav items (Komunikasi section) for GURU, ORANG_TUA, KEPALA_SEKOLAH
- Added VIEW_LABELS and breadcrumb entries
- Added lazy imports in authenticated-app.tsx
- Created shared KotakMasukanView component with role-adaptive UI
- Fixed error logging (logError expects object, not positional args)
- Ran full 9-test verification suite: all PASS

Stage Summary:
- 4 commits pushed to main: 0d4ea5c (schema), ce87e7d (API), 5560072 (UI), afb2550 (fix+verify)
- 9/9 tests PASS: POST, GET guard, privacy, reply, 403, DB proof
- Server constraint: needs --max-old-space-size=450 + pre-compile all routes before testing

---
Task ID: 6a
Agent: main
Task: Protect API routes with JWT auth (batch 1: public + simple routes)

Work Log:
- Verified all 9 target API routes already had JWT auth protection applied (requireAuth/requireRole + AuthError try/catch pattern)
- Confirmed no X-User-Id/X-User-Role/X-School-Id header reads remain in any of these routes
- Public routes (register, register-school, schools/lookup) correctly left unchanged
- Fixed src/app/api/subjects/route.ts: Changed GET handler from `requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH', 'SISWA'])` to `requireAuth(req)` (task spec: any auth for GET)
- Fixed src/app/api/activity-logs/route.ts: Added missing `requireAuth` to import (was used in POST handler but not imported)
- ESLint passed with zero errors

Files verified (already correctly protected, no changes needed):
1. src/app/api/schools/route.ts — GET: SUPER_ADMIN,ADMIN_SCHOOL. POST/PATCH/DELETE: SUPER_ADMIN
2. src/app/api/users/route.ts — SUPER_ADMIN,ADMIN_SCHOOL. PUT (profile): any auth via requireAuth
3. src/app/api/classes/route.ts — GET: SUPER_ADMIN,ADMIN_SCHOOL,GURU,KEPALA_SEKOLAH. PUT: SUPER_ADMIN,ADMIN_SCHOOL
4. src/app/api/seed/route.ts — SUPER_ADMIN only
5. src/app/api/backup/route.ts — SUPER_ADMIN only
6. src/app/api/analytics/route.ts — SUPER_ADMIN,ADMIN_SCHOOL,KEPALA_SEKOLAH
7. src/app/api/teacher-assignments/route.ts — SUPER_ADMIN,ADMIN_SCHOOL (all methods)

Files modified (2):
1. src/app/api/subjects/route.ts — GET: requireRole → requireAuth (any auth)
2. src/app/api/activity-logs/route.ts — Added missing requireAuth import

Stage Summary:
- 9/9 routes verified, 2 minor fixes applied
- All routes now use JWT cookie-based auth (requireAuth/requireRole) with AuthError try/catch
- No X-User-* header reads remain in any batch-1 route
- Lint: PASS

---
Task ID: 6b
Agent: main
Task: Protect remaining API routes with JWT auth (batch 2)

Work Log:
- Audited all 22 target API routes for JWT auth protection status
- Confirmed zero X-User-Id/X-User-Role/X-School-Id header reads remain in any route (verified via grep)
- 20 of 22 routes already correctly protected with requireAuth/requireRole + AuthError try/catch pattern
- 1 route had NO auth at all: src/app/api/submissions/[id]/route.ts → added requireAuth + AuthError try/catch
- 1 route had a compile bug (duplicate `const createdBy`): src/app/api/import/questions/route.ts → removed client-provided createdBy, kept auth.userId
- 1 route in task list does not exist: src/app/api/assignments/[id]/submissions/[submissionId]/route.ts (no such file; submissions handled by submissions/route.ts with query params)
- ESLint passed with zero errors

Files already protected (no changes needed, 20):
1. src/app/api/feedback/route.ts — POST: requireAuth+role check, GET: requireAuth
2. src/app/api/feedback/[id]/route.ts — PATCH: requireAuth+role check
3. src/app/api/assignments/route.ts — GET: requireRole, POST/PATCH/DELETE: requireRole
4. src/app/api/assignments/[id]/route.ts — GET: requireRole
5. src/app/api/assignments/[id]/submissions/route.ts — GET/POST: requireRole
6. src/app/api/assignments/[id]/submissions/remedial/route.ts — POST: requireRole
7. src/app/api/attempts/route.ts — GET/POST: requireRole, PATCH: requireRole
8. src/app/api/attempts/remedial/route.ts — POST: requireRole
9. src/app/api/scores/route.ts — GET: requireRole
10. src/app/api/attendance/route.ts — GET: requireRole, POST: requireRole(GURU), PATCH: requireRole
11. src/app/api/character-reports/route.ts — GET/POST/PATCH/DELETE: requireRole
12. src/app/api/external-quiz-scores/route.ts — GET/POST/PATCH/DELETE: requireAuth/requireRole
13. src/app/api/kepsek/dashboard/route.ts — GET: requireRole(KEPALA_SEKOLAH,ADMIN_SCHOOL,SUPER_ADMIN)
14. src/app/api/materials/route.ts — GET: requireRole, POST/PATCH/DELETE: requireRole
15. src/app/api/questions/route.ts — GET: requireRole, POST/PATCH/DELETE: requireRole
16. src/app/api/exams/route.ts — GET: requireRole, POST/PATCH/DELETE: requireRole
17. src/app/api/timetable/route.ts — GET: requireRole, POST/PUT/DELETE: requireRole
18. src/app/api/teaching-journals/route.ts — GET: requireRole, POST/PATCH/DELETE: requireRole
19. src/app/api/import/csv/route.ts — POST: requireRole(SUPER_ADMIN,ADMIN_SCHOOL)
20. src/app/api/dapodik/import/route.ts — POST: requireRole(SUPER_ADMIN,ADMIN_SCHOOL)

Files modified (2):
1. src/app/api/submissions/[id]/route.ts — Added requireAuth + AuthError try/catch (was completely unprotected)
2. src/app/api/import/questions/route.ts — Removed duplicate `const createdBy` (compile bug); now only uses auth.userId

Files not found (1):
1. src/app/api/assignments/[id]/submissions/[submissionId]/route.ts — does not exist

Stage Summary:
- 22 routes audited, 2 files modified, 20 confirmed already protected
- All API routes now use JWT cookie-based auth with AuthError try/catch
- No X-User-* header reads remain in any route across the entire project
- Lint: PASS

---
Task ID: 1
Agent: main
Task: Fix 2 critical bugs — login crash + register role escalation

Work Log:
- Fixed login/route.ts: replaced `import { ratelimit }` (non-existent export) with `import { checkRateLimit, RATE_LOGIN }` and synchronous call pattern
- Fixed register/route.ts: added `ALLOWED_SELF_REGISTER_ROLES = ['SISWA', 'ORANG_TUA']` whitelist, blocking SUPER_ADMIN/GURU/ADMIN_SCHOOL/KEPALA_SEKOLAH from self-service registration (returns 403)
- Fixed dapodik/connector/download/route.ts: added missing `request` parameter to `requireAuth()` call (pre-existing build error)
- Fixed app-layout.tsx: added missing `'guru-bank-soal': 'Bank Soal'` entry to VIEW_LABELS (pre-existing build error)
- Ran `bun run build` — passed clean (all routes compiled)
- Ran standalone logic tests — checkRateLimit works, role whitelist blocks all privileged roles
- Ran production server with 4 curl verification tests — ALL PASSED

Stage Summary:
- Login no longer crashes — returns 200 with JWT cookie
- Register rejects SUPER_ADMIN/GURU/ADMIN_SCHOOL/KEPALA_SEKOLAH with 403
- /api/schools returns 401 without cookie (session-based auth works)
- X-User-Role header spoofing has no effect (returns 401)

---
Task ID: 2
Agent: main
Task: Fitur G - Profil Lulusan 8 Dimensi (full stack)

Work Log:
- Added CompetencyAssessment model to prisma/schema.prisma with 8-dimension support, unique constraint (student+dimension+term+assessor), school isolation
- Created src/lib/competency-dimensions.ts with constants, validation, rating labels
- Created POST/GET/PATCH /api/competency-assessments with role-based access (GURU writes, SISWA/ORTU read-only, school isolation)
- Created GET recap mode (recap=student for per-student averages, recap=class for per-class averages)
- Created DELETE /api/competency-assessments/[id]
- Added ViewType entries: guru-profil-lulusan, ortu-profil-lulusan, kepsek-profil-lulusan
- Added nav items for GURU, ORANG_TUA, KEPALA_SEKOLAH in app-layout.tsx
- Added VIEW_LABELS and breadcrumbs for all 3 views
- Created ProfilLulusanView component (1146 lines, role-adaptive: guru=input+rekap, ortu=read-only, kepsek=read-only rekap)
- Added JWT_SECRET to .env for production build support
- All 4 verification tests passed

Stage Summary:
- Schema commit: 8bbb869
- API commit: 0405e24
- UI commit: 7817f1e
- 4/4 verification tests passed with DB evidence
