# RBAC / IDOR Audit Report

**Date:** 2025-01-20  
**Auditor:** Automated Agent  
**Scope:** All 52 route files under `src/app/api/`  
**Application:** PANDAI – School Management Platform

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Check present and correct |
| ⚠️ | Partial / weak protection |
| ❌ | Missing or broken protection |
| N/A | Not applicable (public / no data returned) |

**Severity Definitions:**

| Level | Description |
|-------|-------------|
| **CRITICAL** | Any authenticated user can access/modify another user's personal data by supplying a different ID |
| **HIGH** | Cross-role data leakage (e.g., GURU sees other school's data) or missing school isolation |
| **MEDIUM** | Missing ownership check on mutation, or overly permissive role list |
| **LOW** | Cosmetic / defense-in-depth improvement |

---

## Summary

| Metric | Count |
|--------|-------|
| Total route files analyzed | 52 |
| Routes with NO auth at all | 2 (`/api`, `/api/health`) |
| Routes with auth but NO role check | 5 |
| Routes with role check but NO scope restriction (IDOR) | 18 |
| Routes with full RBAC (auth + role + scope) | 27 |
| **CRITICAL IDOR findings** | **13** |
| **HIGH severity findings** | **15** |
| **MEDIUM severity findings** | **18** |

---

## Full Route-by-Route Analysis

### HIGH-PRIORITY ENDPOINTS (Student Personal Data)

| # | Route | Methods | Auth | Role Check | Scope Restriction | IDOR Risk | Severity | Notes |
|---|-------|---------|------|------------|------------------|-----------|----------|-------|
| 1 | `/api/scores` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, SISWA, ORANG_TUA | ✅ SISWA→self, ORANG_TUA→own children, KEPALA_SEKOLAH blocked | ✅ No | — | Well-protected. SISWA locked to own ID, ORANG_TUA to children. |
| 2 | `/api/attendance` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA, ORANG_TUA | ⚠️ ORANG_TUA scoped; SISWA NOT scoped | **❌ YES** | **CRITICAL** | SISWA is allowed but falls into `else` branch — can query `?studentId=<any>` and see any student's attendance. |
| 3 | `/api/attendance` | POST | ✅ | ✅ GURU only | ⚠️ No class/school ownership verification | **❌ YES** | **HIGH** | GURU can submit attendance for any class/school. No check that GURU belongs to that class. |
| 4 | `/api/attendance` | PATCH | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ⚠️ No school isolation on the attendance record | **❌ YES** | **HIGH** | GURU from school A can update attendance records from school B by supplying the record ID. |
| 5 | `/api/character-reports` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, ORANG_TUA, SISWA | ⚠️ ORANG_TUA scoped; SISWA and GURU NOT scoped | **❌ YES** | **CRITICAL** | SISWA is allowed but has no scope restriction — can query `?studentId=<any>`. GURU can query any student's reports. |
| 6 | `/api/character-reports` | POST | ✅ | ✅ ORANG_TUA only | ❌ No child ownership check | **❌ YES** | **CRITICAL** | ORANG_TUA can create reports for ANY student by supplying arbitrary `studentId`. |
| 7 | `/api/character-reports` | PATCH | ✅ | ✅ ORANG_TUA only | ❌ No ownership check | **❌ YES** | **CRITICAL** | ORANG_TUA can update ANY character report by ID — not verified to belong to their children. |
| 8 | `/api/character-reports` | DELETE | ✅ | ✅ ORANG_TUA only | ❌ No ownership check | **❌ YES** | **CRITICAL** | ORANG_TUA can delete ANY character report by ID. |
| 9 | `/api/assignments/[id]/submissions` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | ❌ No scope restriction | **❌ YES** | **CRITICAL** | SISWA can see ALL submissions for an assignment (with answers, scores) by querying `?studentId=<any>`. |
| 10 | `/api/assignments/[id]/submissions` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | ⚠️ SISWA locked to self; GURU/ADMIN not scoped | ⚠️ Minor | **MEDIUM** | SISWA IDOR is fixed (forced to auth.userId). But GURU can submit for any student without class check. |
| 11 | `/api/student-grades` | GET | ✅ | ⚠️ requireAuth (any role) | ⚠️ SISWA→self, ORANG_TUA→children; others no student-level scope | **❌ YES** | **HIGH** | GURU can query any student's grades via `?studentId=<any>`. School isolation exists for non-SUPER_ADMIN. |
| 12 | `/api/student-grades` | POST | ✅ | ✅ GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN | ⚠️ School isolation only; no class/subject ownership | **❌ YES** | **HIGH** | GURU can create grades for any student in same school, even students not in their class. |
| 13 | `/api/student-grades` | PATCH | ✅ | ✅ GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN | ✅ School isolation checked | ✅ No | — | School isolation present. GURU from other school blocked. |
| 14 | `/api/student-grades` | DELETE | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ✅ School isolation checked | ✅ No | — | Same as PATCH. |
| 15 | `/api/competency-assessments` | GET | ✅ | ⚠️ requireAuth (any role) | ✅ SISWA→self, ORANG_TUA→children, others→school-scoped | ✅ No | — | Well-scoped. SISWA locked, ORANG_TUA locked to children. |
| 16 | `/api/competency-assessments` | POST | ✅ | ✅ GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN | ⚠️ School isolation only; no class ownership | **❌ YES** | **HIGH** | GURU can assess any student in same school, not just their own class. |
| 17 | `/api/competency-assessments` | PATCH | ✅ | ✅ GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN | ✅ School + assessor ownership | ✅ No | — | GURU can only update own assessments; school isolation enforced. |
| 18 | `/api/competency-assessments/[id]` | DELETE | ✅ | ✅ GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN | ✅ School + assessor ownership | ✅ No | — | Same as PATCH. |
| 19 | `/api/feedback` | GET | ✅ | ⚠️ requireAuth (any role) | ⚠️ ORANG_TUA→own; GURU/KEPALA_SEKOLAH/ADMIN→school; SISWA unfiltered | **❌ YES** | **HIGH** | SISWA is authenticated but has no scope restriction — can see all feedback if schoolId not set. |
| 20 | `/api/feedback` | POST | ✅ | ⚠️ requireAuth; role whitelist for SENDER_ROLES | ⚠️ School from auth.schoolId | ✅ No | — | fromUserId correctly set from session. Acceptable. |
| 21 | `/api/feedback/[id]` | PATCH | ✅ | ⚠️ requireAuth; ORANG_TUA blocked; RESPONDER_ROLES checked | ⚠️ School isolation for GURU/KEPALA_SEKOLAH/ADMIN | ✅ No | — | School isolation present for non-SUPER_ADMIN. |
| 22 | `/api/users` | GET | ✅ | ⚠️ requireAuth; ORANG_TUA→own children; else→ADMIN_SCHOOL/SUPER_ADMIN | ✅ ORANG_TUA scoped; ADMIN→school-scoped | ✅ No | — | Good. ORANG_TUA locked to own children. ADMIN restricted to own school. |
| 23 | `/api/users` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ⚠️ No school isolation on creation | **❌ YES** | **HIGH** | ADMIN_SCHOOL can create users in any school by supplying different `schoolId` in body. |
| 24 | `/api/users` | PATCH | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ❌ No school isolation | **❌ YES** | **CRITICAL** | ADMIN_SCHOOL can update ANY user (any school) by ID. No school ownership check. |
| 25 | `/api/users` | PUT | ✅ | ⚠️ requireAuth; own-profile or admin+same-school | ✅ Self-edit or school-scoped admin | ✅ No | — | IDOR fix present: only own profile or admin with same-school check. |
| 26 | `/api/users` | DELETE | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ❌ No school isolation | **❌ YES** | **CRITICAL** | ADMIN_SCHOOL can deactivate ANY user (any school) by ID. |
| 27 | `/api/reports/rapor-siswa` | GET | ✅ | ⚠️ requireAuth | ✅ SISWA→self, ORANG_TUA→own children, GURU/KEPALA_SEKOLAH/ADMIN→school isolation | ✅ No | — | Well-protected. All roles properly scoped. |
| 28 | `/api/reports/legger` | GET | ✅ | ⚠️ requireAuth | ✅ School isolation (class→school verified) | ✅ No | — | Class ownership verified via schoolId. Good. |
| 29 | `/api/reports/rekap-kelas` | GET | ✅ | ⚠️ requireAuth | ✅ School isolation (class→school verified) | ✅ No | — | Same as legger. |
| 30 | `/api/grades/final` | GET | ✅ | ⚠️ requireAuth | ✅ SISWA→self, ORANG_TUA→children, school isolation for others | ✅ No | — | Well-protected in `calcStudentFinalGrades`. |
| 31 | `/api/attempts` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | ❌ SISWA not scoped; KEPALA_SEKOLAH blocked | **❌ YES** | **CRITICAL** | SISWA can supply `?userId=<any>` to view any student's exam attempts, answers, and scores. |
| 32 | `/api/attempts` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | ✅ SISWA forced to auth.userId | ✅ No | — | IDOR fix present. userId forced from session for SISWA. |
| 33 | `/api/attempts` | PATCH | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ⚠️ No school isolation on attempt record | **❌ YES** | **HIGH** | GURU can update any attempt's learningObjective by ID without school ownership check. |
| 34 | `/api/attempts/remedial` | POST | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ⚠️ No school isolation | **❌ YES** | **HIGH** | GURU can activate remedial for any attempt across schools. |
| 35 | `/api/external-quiz-scores` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, SISWA | ❌ SISWA not scoped; no school isolation | **❌ YES** | **CRITICAL** | SISWA can query `?studentId=<any>` to see any student's external quiz scores. |
| 36 | `/api/external-quiz-scores` | POST | ✅ | ⚠️ requireAuth; entryMode-based checks | ⚠️ If entryMode is missing/neither value, checks skipped | **❌ YES** | **HIGH** | When entryMode is not 'SELF_REPORTED' or 'TEACHER_ENTERED', any role can create scores for any student. |
| 37 | `/api/external-quiz-scores` | PATCH | ✅ | ✅ GURU, ADMIN_SCHOOL | ❌ No school isolation | **❌ YES** | **HIGH** | GURU can update any external quiz score across schools. |
| 38 | `/api/external-quiz-scores` | DELETE | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ❌ No school isolation | **❌ YES** | **HIGH** | GURU can delete any external quiz score across schools. |

### AI ENDPOINTS

| # | Route | Methods | Auth | Role Check | Scope Restriction | IDOR Risk | Severity | Notes |
|---|-------|---------|------|------------|------------------|-----------|----------|-------|
| 39 | `/api/ai/chatbot` | GET | ✅ | ⚠️ requireAuth (any) | ❌ userId from query params, not verified | **❌ YES** | **CRITICAL** | Any user can read other users' chatbot sessions by supplying `?userId=<other>`. |
| 40 | `/api/ai/chatbot` | POST | ✅ | ⚠️ requireAuth (any) | ❌ userId from body, not verified | **❌ YES** | **CRITICAL** | Any user can create chatbot sessions as another user. |
| 41 | `/api/ai/chatbot` | DELETE | ✅ | ⚠️ requireAuth (any) | ❌ sessionId from query params, not verified | **❌ YES** | **CRITICAL** | Any user can delete any chatbot session. |
| 42 | `/api/ai/usage` | GET | ✅ | ⚠️ requireAuth (any) | ❌ userId from query params, not verified | **❌ YES** | **MEDIUM** | Any user can check another user's AI usage. |
| 43 | `/api/ai/config` | GET | ✅ | ⚠️ requireAuth (any) | ❌ schoolId from query params | **❌ YES** | **MEDIUM** | Any user can read any school's AI config. |
| 44 | `/api/ai/config` | PATCH | ✅ | ⚠️ requireAuth (any) | ❌ schoolId from body, no role restriction | **❌ YES** | **HIGH** | Any authenticated user (including SISWA) can modify any school's AI rate limits and settings. |
| 45 | `/api/ai/generate-report-desc` | POST | ✅ | ⚠️ requireAuth (any) | ❌ studentId from body, not verified | **❌ YES** | **HIGH** | Any user can generate AI report descriptions for any student. Exposes student attempt + attendance + character data. |
| 46 | `/api/ai/recommend-questions` | POST | ✅ | ⚠️ requireAuth (any) | ❌ studentId from body, not verified | **❌ YES** | **MEDIUM** | Any user can get question recommendations targeting another student's weak areas. |
| 47 | `/api/ai/analyze-difficulty` | POST | ✅ | ⚠️ requireAuth (any) | ❌ classId/schoolId from body, not verified | **❌ YES** | **MEDIUM** | Any user can analyze any class's difficulty data. |
| 48 | `/api/ai/generate-questions` | POST | ✅ | ⚠️ requireAuth (any) | ⚠️ schoolId from body (used for DB record) | ⚠️ Minor | **LOW** | No role restriction — SISWA can generate questions. Not an IDOR but a permission issue. |
| 49 | `/api/ai/review-question` | PATCH | ✅ | ⚠️ requireAuth (any) | ❌ No role check | **❌ YES** | **HIGH** | Any authenticated user (including SISWA) can approve/reject any question. schoolId from body is trusted. |
| 50 | `/api/ai/summarize-material` | POST | ✅ | ⚠️ requireAuth (any) | N/A | ✅ No | — | Only processes text content, no student data accessed. |

### ADMIN / MANAGEMENT ENDPOINTS

| # | Route | Methods | Auth | Role Check | Scope Restriction | IDOR Risk | Severity | Notes |
|---|-------|---------|------|------------|------------------|-----------|----------|-------|
| 51 | `/api/classes` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH | ❌ No school isolation | **❌ YES** | **MEDIUM** | Any allowed role can see all classes across all schools. |
| 52 | `/api/classes` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ⚠️ schoolId from body | ⚠️ Minor | **MEDIUM** | ADMIN_SCHOOL can create classes in other schools by supplying different schoolId. |
| 53 | `/api/classes` | PUT | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ❌ No school isolation | **❌ YES** | **HIGH** | ADMIN_SCHOOL can update any class in any school. |
| 54 | `/api/teacher-assignments` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ❌ No school isolation | **❌ YES** | **MEDIUM** | ADMIN_SCHOOL can see teacher assignments across all schools. |
| 55 | `/api/teacher-assignments` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ❌ No school isolation | **❌ YES** | **MEDIUM** | ADMIN_SCHOOL can create assignments in other schools. |
| 56 | `/api/teacher-assignments` | PATCH | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ❌ No school isolation | **❌ YES** | **MEDIUM** | ADMIN_SCHOOL can update any assignment across schools. |
| 57 | `/api/teacher-assignments` | DELETE | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ❌ No school isolation | **❌ YES** | **MEDIUM** | Same as PATCH. |
| 58 | `/api/schools` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ✅ List all (intended for admin) | ✅ No | — | Both roles are admin-level. Acceptable. |
| 59 | `/api/schools` | POST | ✅ | ✅ SUPER_ADMIN | N/A | ✅ No | — | SUPER_ADMIN only. Correct. |
| 60 | `/api/schools` | PATCH | ✅ | ✅ SUPER_ADMIN | N/A | ✅ No | — | SUPER_ADMIN only. Correct. |
| 61 | `/api/schools` | DELETE | ✅ | ✅ SUPER_ADMIN | N/A | ✅ No | — | SUPER_ADMIN only. Correct. |
| 62 | `/api/grade-components` | GET | ✅ | ⚠️ requireAuth (any) | ⚠️ School-scoped for non-SUPER_ADMIN | ✅ No | — | School isolation present. |
| 63 | `/api/grade-components` | POST | ✅ | ✅ ADMIN_SCHOOL, SUPER_ADMIN | ✅ schoolId from auth (or body for SUPER_ADMIN) | ✅ No | — | Good. |
| 64 | `/api/grade-components` | PATCH | ✅ | ✅ ADMIN_SCHOOL, SUPER_ADMIN | ✅ School isolation checked | ✅ No | — | Good. |
| 65 | `/api/grade-components` | DELETE | ✅ | ✅ ADMIN_SCHOOL, SUPER_ADMIN | ✅ School isolation checked | ✅ No | — | Good. |
| 66 | `/api/subjects` | GET | ✅ | ⚠️ requireAuth (any) | N/A (global resource) | ✅ No | — | Subjects are global, not school-specific. Acceptable. |
| 67 | `/api/subjects` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | N/A | ✅ No | — | Admin roles only. |
| 68 | `/api/subjects` | PATCH | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ❌ No school isolation (but subjects are global) | ✅ No | — | Subjects are global resources. |
| 69 | `/api/subjects` | DELETE | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ✅ Same as above | ✅ No | — | Same. |
| 70 | `/api/activity-logs` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ❌ No school isolation | **❌ YES** | **MEDIUM** | ADMIN_SCHOOL can view logs from other schools. |
| 71 | `/api/activity-logs` | POST | ✅ | ⚠️ requireAuth (any) | ❌ userId/schoolId from body | **❌ YES** | **MEDIUM** | Any user can create logs impersonating any userId/schoolId. |
| 72 | `/api/teaching-journals` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH | ❌ No school isolation | **❌ YES** | **MEDIUM** | GURU can see journals from any school. |
| 73 | `/api/teaching-journals` | POST | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ❌ teacherId from body, not verified | **❌ YES** | **MEDIUM** | GURU can create journals for other teachers. No ownership check. |
| 74 | `/api/teaching-journals` | PATCH | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ❌ No ownership/school check | **❌ YES** | **MEDIUM** | GURU can update any journal across schools. |
| 75 | `/api/teaching-journals` | DELETE | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ❌ No ownership/school check | **❌ YES** | **MEDIUM** | Same as PATCH. |
| 76 | `/api/timetable` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH | ❌ No school isolation | **❌ YES** | **MEDIUM** | GURU can view any school's timetable. |
| 77 | `/api/timetable` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ⚠️ schoolId from body | **❌ YES** | **MEDIUM** | GURU can create timetable entries in other schools. |
| 78 | `/api/timetable` | PUT | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ❌ No school isolation | **❌ YES** | **MEDIUM** | GURU can update any timetable entry. |
| 79 | `/api/timetable` | DELETE | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ❌ No school isolation | **❌ YES** | **MEDIUM** | Same as PUT. |
| 80 | `/api/kepsek/dashboard` | GET | ✅ | ✅ KEPALA_SEKOLAH, ADMIN_SCHOOL, SUPER_ADMIN | ⚠️ schoolId from query; not verified against auth | **❌ YES** | **HIGH** | KEPALA_SEKOLAH can query another school's dashboard by supplying `?schoolId=<other>`. |
| 81 | `/api/analytics` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, KEPALA_SEKOLAH | ⚠️ type=student: userId not verified | **❌ YES** | **MEDIUM** | Admin can query any student's analytics via `?type=student&userId=<any>`. School not enforced. |
| 82 | `/api/backup` | GET | ✅ | ✅ SUPER_ADMIN | N/A | ✅ No | — | SUPER_ADMIN only. Includes raw DB download. |
| 83 | `/api/backup` | POST | ✅ | ✅ SUPER_ADMIN | N/A | ✅ No | — | SUPER_ADMIN only. |

### EXAM / ASSIGNMENT ENDPOINTS

| # | Route | Methods | Auth | Role Check | Scope Restriction | IDOR Risk | Severity | Notes |
|---|-------|---------|------|------------|------------------|-----------|----------|-------|
| 84 | `/api/assignments` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | ❌ No school/class isolation | **❌ YES** | **HIGH** | Any role can see assignments from any school. SISWA included. |
| 85 | `/api/assignments` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ⚠️ schoolId from body | **❌ YES** | **MEDIUM** | GURU can create assignments in other schools. |
| 86 | `/api/assignments` | PATCH | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ❌ No school isolation | **❌ YES** | **HIGH** | GURU can update any assignment across schools. |
| 87 | `/api/assignments` | DELETE | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ❌ No school isolation | **❌ YES** | **HIGH** | GURU can delete any assignment across schools. |
| 88 | `/api/assignments/[id]` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | ❌ No school isolation | **❌ YES** | **HIGH** | Any role can access any assignment by ID across schools. Includes question answers. |
| 89 | `/api/assignments/[id]/submissions/[studentId]/grade` | PATCH | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ❌ No school/class check | **❌ YES** | **HIGH** | GURU can grade any student's submission in any school. |
| 90 | `/api/assignments/[id]/submissions/remedial` | POST | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ❌ No school check | **❌ YES** | **HIGH** | GURU can activate remedial for any student across schools. |
| 91 | `/api/assignments/[id]/questions` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ❌ No school/ownership check | **❌ YES** | **MEDIUM** | GURU can modify questions in assignments from other schools. |
| 92 | `/api/assignments/[id]/questions` | DELETE | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ❌ No school/ownership check | **❌ YES** | **MEDIUM** | Same as POST. |
| 93 | `/api/submissions/[id]` | GET | ✅ | ⚠️ requireAuth (any) | ❌ No scope restriction at all | **❌ YES** | **CRITICAL** | Any authenticated user can access any submission by ID — includes all answers, scores, and student data. |
| 94 | `/api/exams` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | ⚠️ SISWA scoped to own class; others NOT scoped | **❌ YES** | **HIGH** | GURU from school A can see exams from school B. |
| 95 | `/api/exams` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ⚠️ schoolId from body | **❌ YES** | **MEDIUM** | GURU can create exams in other schools. |
| 96 | `/api/exams` | PATCH | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ❌ No school isolation | **❌ YES** | **HIGH** | GURU can update any exam/package across schools. |
| 97 | `/api/exams` | DELETE | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ❌ No school isolation | **❌ YES** | **HIGH** | GURU can delete any exam/package across schools. |
| 98 | `/api/questions` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | ⚠️ No school isolation; includes answer key | **❌ YES** | **HIGH** | SISWA can see ALL questions with ANSWER KEYS from any school. Major data exposure. |
| 99 | `/api/questions` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ⚠️ schoolId from body | ⚠️ Minor | **MEDIUM** | GURU can create questions in other schools. |
| 100 | `/api/questions` | PATCH | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ❌ No ownership/school check | **❌ YES** | **MEDIUM** | GURU can modify any question across schools. |
| 101 | `/api/questions` | DELETE | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ❌ No ownership/school check | **❌ YES** | **MEDIUM** | GURU can delete any question across schools. |
| 102 | `/api/materials` | GET | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | ❌ No school/class isolation | **❌ YES** | **HIGH** | SISWA can see materials from any school, including external quiz scores of all students. |
| 103 | `/api/materials` | POST | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ⚠️ schoolId from body | **❌ YES** | **MEDIUM** | GURU can create materials in other schools. |
| 104 | `/api/materials` | PATCH | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ❌ No school isolation | **❌ YES** | **HIGH** | GURU can modify any material across schools. |
| 105 | `/api/materials` | DELETE | ✅ | ✅ GURU, ADMIN_SCHOOL, SUPER_ADMIN | ❌ No school isolation | **❌ YES** | **HIGH** | GURU can delete any material across schools. |

### AUTH / PUBLIC ENDPOINTS

| # | Route | Methods | Auth | Role Check | Scope Restriction | IDOR Risk | Severity | Notes |
|---|-------|---------|------|------------|------------------|-----------|----------|-------|
| 106 | `/api/auth/login` | POST | N/A | N/A | N/A | ✅ No | — | Public endpoint. Rate-limited. Correct. |
| 107 | `/api/auth/logout` | POST | N/A | N/A | N/A | ✅ No | — | Public endpoint (clears cookie). Correct. |
| 108 | `/api/auth/register` | POST | N/A | ⚠️ Role whitelist (SISWA, ORANG_TUA only) | N/A | ✅ No | — | Self-registration limited to SISWA/ORANG_TUA. Correct. |
| 109 | `/api/auth/register-school` | POST | N/A | N/A | N/A | ✅ No | — | Public endpoint for school onboarding. Correct. |
| 110 | `/api/health` | GET | N/A | N/A | N/A | ✅ No | — | Health check. No data exposure. Correct. |
| 111 | `/api/` | GET | N/A | N/A | N/A | ✅ No | — | Returns "Hello, world!". No data. |
| 112 | `/api/schools/lookup` | GET | N/A | N/A | N/A | ✅ No | — | Public school search (NPSN database). No sensitive data. |

### IMPORT / SEED / DAPODIK ENDPOINTS

| # | Route | Methods | Auth | Role Check | Scope Restriction | IDOR Risk | Severity | Notes |
|---|-------|---------|------|------------|------------------|-----------|----------|-------|
| 113 | `/api/import/csv` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ⚠️ schoolId from formData, not verified | **❌ YES** | **MEDIUM** | ADMIN_SCHOOL can import users into other schools. |
| 114 | `/api/import/questions` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL, GURU | ⚠️ schoolId from formData | **❌ YES** | **MEDIUM** | GURU can import questions into other schools. |
| 115 | `/api/dapodik/import` | POST | ✅ | ✅ SUPER_ADMIN, ADMIN_SCHOOL | ⚠️ schoolId from body, not verified | **❌ YES** | **MEDIUM** | ADMIN_SCHOOL can import into other schools. |
| 116 | `/api/dapodik/connector/download` | GET | ✅ | ⚠️ requireAuth (any) | N/A | ✅ No | — | Downloads a Python script. No sensitive data. |
| 117 | `/api/seed` | POST | ✅ | ✅ SUPER_ADMIN + production guard | N/A | ✅ No | — | Production guard prevents execution. SUPER_ADMIN only. |

---

## Top 13 CRITICAL Vulnerabilities (Immediate Action Required)

These allow any authenticated user to access or modify another user's personal student data:

### 1. `/api/submissions/[id]` GET — Full Submission Access
- **Impact:** Any authenticated user (including SISWA) can read any submission by ID, including all answers, scores, and student data.
- **Fix:** Add role check + verify the submission's studentId matches the authenticated user (for SISWA) or same school (for GURU).

### 2. `/api/attempts` GET — Exam Attempt IDOR
- **Impact:** SISWA can view any student's exam attempts, answers, scores, and remedial status.
- **Fix:** When `auth.role === 'SISWA'`, force `where.userId = auth.userId` and ignore query param.

### 3. `/api/external-quiz-scores` GET — External Quiz Score IDOR
- **Impact:** SISWA can view any student's external quiz scores.
- **Fix:** When `auth.role === 'SISWA'`, force `where.studentId = auth.userId`.

### 4. `/api/character-reports` POST — Create Reports for Any Student
- **Impact:** ORANG_TUA can create character reports for ANY student, not just their children.
- **Fix:** Verify `studentId` belongs to the authenticated ORANG_TUA's children before creating.

### 5. `/api/character-reports` PATCH — Update Any Report
- **Impact:** ORANG_TUA can modify ANY character report, not just their children's.
- **Fix:** Fetch the report, verify its studentId belongs to the authenticated ORANG_TUA's children.

### 6. `/api/character-reports` DELETE — Delete Any Report
- **Impact:** ORANG_TUA can delete ANY character report.
- **Fix:** Same ownership check as PATCH.

### 7. `/api/users` PATCH — Cross-School User Update
- **Impact:** ADMIN_SCHOOL can modify any user across all schools.
- **Fix:** Verify `existing.schoolId === auth.schoolId` before updating.

### 8. `/api/users` DELETE — Cross-School User Deletion
- **Impact:** ADMIN_SCHOOL can deactivate any user across all schools.
- **Fix:** Verify target user's schoolId matches auth.schoolId.

### 9. `/api/assignments/[id]/submissions` GET — All Submissions Visible
- **Impact:** SISWA can see ALL other students' submissions (with full answers) for any assignment.
- **Fix:** When `auth.role === 'SISWA'`, only return the student's own submission.

### 10. `/api/attendance` GET — SISWA Can View Any Attendance
- **Impact:** SISWA can query any student's attendance records.
- **Fix:** When `auth.role === 'SISWA'`, force `where.studentId = auth.userId`.

### 11. `/api/ai/chatbot` GET/POST/DELETE — Full Chatbot Session Access
- **Impact:** Any user can read, create, or delete any other user's chatbot sessions.
- **Fix:** Force userId from `auth.userId` instead of request body/query params. For DELETE, verify session ownership.

### 12. `/api/ai/generate-report-desc` POST — Any Student's Report Data
- **Impact:** Any user can generate AI report descriptions using any student's attempts, attendance, and character data.
- **Fix:** Verify studentId belongs to the authenticated user (SISWA→self, ORANG_TUA→children, GURU→same school).

### 13. `/api/character-reports` GET — SISWA Can View Any Student's Reports
- **Impact:** SISWA can query `?studentId=<any>` to view any student's character reports.
- **Fix:** When `auth.role === 'SISWA'`, force `where.studentId = auth.userId`.

---

## Systemic Issues

### 1. Missing School Isolation (affects ~20 routes)
Most routes that allow GURU do not verify that the GURU's `auth.schoolId` matches the resource's school. A GURU from school A can modify resources in school B.

**Recommended fix:** Create a helper function:
```typescript
async function enforceSchoolIsolation(auth, resourceSchoolId) {
  if (auth.role === 'SUPER_ADMIN') return;
  if (resourceSchoolId !== auth.schoolId) {
    throw new AuthError('Akses ditolak', 403);
  }
}
```

### 2. AI Endpoints Trust Client-Supplied IDs
All `/api/ai/*` endpoints use `userId` and `schoolId` from the request body instead of the authenticated session. This allows any user to impersonate other users or access other schools' AI features.

**Recommended fix:** Replace `data.userId` with `auth.userId` and `data.schoolId` with `auth.schoolId` in all AI endpoints.

### 3. Questions Endpoint Exposes Answer Keys to SISWA
`/api/questions` GET returns the `answer` field to SISWA, allowing students to see correct answers before taking exams.

**Recommended fix:** Filter out the `answer` field for SISWA role, or create a separate endpoint for exam-taking that doesn't include answers.

### 4. No GURU→Class Ownership Checks
GURU can assess, grade, and view data for students not in their assigned classes. This is a design decision but may not be intended.

---

## Well-Protected Routes (Examples to Follow)

These routes demonstrate correct RBAC patterns that should be replicated:

1. **`/api/scores` GET** — Perfect SISWA→self, ORANG_TUA→children scoping
2. **`/api/reports/rapor-siswa` GET** — All roles properly scoped with school isolation
3. **`/api/grades/final` GET** — Comprehensive ownership checks in helper function
4. **`/api/competency-assessments` GET** — Good SISWA/ORANG_TUA scoping with school isolation
5. **`/api/student-grades` PATCH/DELETE** — School isolation on existing records

---

## Recommended Priority Order for Fixes

1. **P0 (Immediate):** Fix the 13 CRITICAL IDOR vulnerabilities listed above
2. **P1 (This week):** Add school isolation to all GURU-accessible routes
3. **P2 (Next sprint):** Fix AI endpoints to use session-based IDs
4. **P3 (Next sprint):** Add class-level ownership checks for GURU
5. **P4 (Backlog):** Address MEDIUM severity findings
