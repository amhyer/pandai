# Worklog

---
Task ID: 4
Agent: api-audit
Task: Phase 10 - API Endpoint Audit

# API Endpoint Audit Report
**Files scanned:** 50 route.ts files under src/app/api/
**Total handler functions:** ~130+
**No-auth public endpoints:** 7 (/api, /api/health, /api/auth/login, /api/auth/logout, /api/auth/register, /api/auth/register-school, /api/schools/lookup)
**Authenticated endpoints:** ~43 route files

## Critical Findings (8)

### CRITICAL-1: /api/backup — execAsync with env-interpolated DATABASE_URL
POST calls `execAsync(\`pg_dump \"${DATABASE_URL}\" > ...\`)` — the DATABASE_URL from env is interpolated into a shell command. While not user-controlled, this is a dangerous pattern.

### CRITICAL-2: /api/audit/suspicious-access — $queryRawUnsafe
Uses `$queryRawUnsafe` with parameterized placeholders. SQL itself is hardcoded so actual injection risk is LOW, but the `unsafe` API is a code smell.

### CRITICAL-3: /api/seed — Destructive endpoint in dev
Deletes ALL data. Protected by NODE_ENV=production check and SUPER_ADMIN role, but in dev/staging this is extremely dangerous.

### CRITICAL-4: /api/ai/generate-questions — JSON.parse on AI output without try/catch
`JSON.parse(raw)` on line 61 has NO try/catch around the JSON parse. Malformed AI output will cause unhandled 500 errors.

### CRITICAL-5: /api/analytics — Hardcoded fake monthly growth data
The `global` analytics endpoint returns HARDCODED fake monthly growth data (lines 83-87) — not actual data.

### CRITICAL-6: /api/attendance POST — Deletes all records before re-inserting
`await db.attendance.deleteMany(...)` deletes ALL attendance for a class/date before inserting. If subsequent createMany fails, data is lost. Not wrapped in a transaction.

### CRITICAL-7: /api/activity-logs POST — Any authenticated user can write arbitrary logs
Any logged-in user can POST arbitrary userId, schoolId, action, detail to the activity log. Could inject fake audit trail entries.

### CRITICAL-8: /api/classes GET — Missing school scope enforcement
ADMIN_SCHOOL/GURU can pass any schoolId param and see other schools' classes. No schoolId filtering from auth.

## Medium Findings (14)

| ID | Endpoint | Issue |
|----|----------|-------|
| MED-1 | /api/subjects | No school isolation on CRUD (global model by design but risky) |
| MED-2 | /api/assignments GET | No school scope enforcement on query |
| MED-3 | /api/assignments POST/PATCH/DELETE | No school scope check on mutations |
| MED-4 | /api/assignments/[id] GET | No school/ownership check on single assignment |
| MED-5 | /api/assignments/[id]/questions | No school scope check |
| MED-6 | /api/questions GET | schoolId from query trusted; GURU can see other schools' questions |
| MED-7 | /api/questions POST/PATCH/DELETE | No school scope on mutations |
| MED-8 | /api/exams all | No school scope enforcement |
| MED-9 | /api/exam-session/[sessionId] | Non-SISWA has no school verification |
| MED-10 | /api/materials all | No school scope check |
| MED-11 | /api/teaching-journals all | No school scope |
| MED-12 | /api/teacher-assignments all | No school scope |
| MED-13 | /api/timetable all | No school scope |
| MED-14 | /api/scores GET | Fake classRank formula (not real ranking) |

## Low Findings (6)

| ID | Issue |
|----|-------|
| LOW-1 | Inconsistent error response format across endpoints |
| LOW-2 | /api/external-quiz-scores GET: KEPALA_SEKOLAH in requireRole list but immediately blocked |
| LOW-3 | /api/dapodik/import POST: Wrong HTTP status (401 instead of 400/404) |
| LOW-4 | /api/dapodik/connector/download: Exposes server filesystem to any auth user |
| LOW-5 | /api/feedback: Error response leaks internal error.message |
| LOW-6 | /api/route.ts: Root API returns data without auth (info disclosure) |

## Complete Endpoint Table

| # | Endpoint | Methods | Auth | Roles | School Scope | Input Validation | IDOR/Injection | Notes |
|---|----------|---------|------|-------|-------------|-----------------|---------------|-------|
| 1 | /api | GET | NO | - | N/A | N/A | None | Hardcoded hello |
| 2 | /api/health | GET | NO | - | N/A | N/A | None (tagged raw) | DB health check |
| 3 | /api/auth/login | POST | NO | - | N/A | username, password required | None | Rate-limited 5/60s |
| 4 | /api/auth/logout | POST | NO | - | N/A | N/A | None | Clears cookie |
| 5 | /api/auth/register | POST | NO | SISWA, ORANG_TUA | schoolCode lookup | email, password (6+), name, role whitelist | None | Self-service only |
| 6 | /api/auth/register-school | POST | NO | Auto ADMIN_SCHOOL | NPSN validation | email, password (6+), name, schoolData | None | Creates school+admin |
| 7 | /api/users | GET/POST/PUT/PATCH/DELETE | YES | All roles (varies) | YES on all mutations | name required; NISN/NIP uniqueness | IDOR fixed | Auto-creates ORANG_TUA for SISWA |
| 8 | /api/classes | GET/POST/PUT | YES | GET: +GURU, KEPALA_SEKOLAH; CUD: SUPER, ADMIN | GET: **NO**; POST: partial; PUT: **NO** | name, grade required; dup check | **CRITICAL-8** | |
| 9 | /api/subjects | GET/POST/PATCH/DELETE | YES | SUPER_ADMIN, ADMIN_SCHOOL | **NO (global)** | name, code required; uniqueness | None | Global by design |
| 10 | /api/schools | GET/POST/PATCH/DELETE | YES | GET: +ADMIN_SCHOOL; CUD: SUPER | N/A | name, code required | None | |
| 11 | /api/schools/lookup | GET | NO | - | N/A | q required; NPSN regex | None | DAPODIK live + local DB |
| 12 | /api/assignments | GET/POST/PATCH/DELETE | YES | GET: +SISWA; CUD: SUPER, ADMIN, GURU | **NO** | title, deadline, schoolId | **MED-2,3** | |
| 13 | /api/assignments/[id] | GET | YES | SUPER, ADMIN, GURU, KEPALA_SEKOLAH, SISWA | **NO** | N/A | **MED-4** | |
| 14 | /api/assignments/[id]/questions | POST/DELETE | YES | SUPER, ADMIN, GURU | **NO** | questionIds array; submission lock | **MED-5** | |
| 15 | /api/assignments/[id]/submissions | GET/POST | YES | +SISWA, KEPALA_SEKOLAH | Partial (student IDOR) | studentId, action (draft/submit) | Student IDOR fixed | Auto-grades PG |
| 16 | /api/.../submissions/[studentId]/grade | PATCH | YES | GURU, ADMIN, SUPER | YES (requireSchoolScope) | score, feedback, essayScores | IDOR fixed | |
| 17 | /api/.../submissions/remedial | POST | YES | GURU, ADMIN, SUPER | YES (requireSchoolScope) | studentId required | IDOR fixed | |
| 18 | /api/questions | GET/POST/PATCH/DELETE | YES | GET: +SISWA, KEPALA_SEKOLAH; CUD: SUPER, ADMIN, GURU | **NO** | search, pagination; POST: minimal | **MED-6,7**; SISWA: answer stripped | |
| 19 | /api/exams | GET/POST/PATCH/DELETE | YES | GET: +SISWA; CUD: SUPER, ADMIN, GURU | SISWA: scoped; others **NO** | action param | **MED-8** | |
| 20 | /api/exam-session/[sessionId] | GET | YES | +SISWA, KEPALA_SEKOLAH | SISWA: class check; others **NO** | review param | **MED-9**; SISWA: answer stripped | |
| 21 | /api/attempts | GET/POST/PATCH | YES | GET: +SISWA; POST: +KEPALA_SEKOLAH; PATCH: GURU, ADMIN, SUPER | GET/PATCH: scoped; POST: userId forced | answers array; dedup | KEPALA_SEKOLAH blocked on GET | |
| 22 | /api/attempts/remedial | POST | YES | GURU, ADMIN, SUPER | YES | attemptId required | IDOR fixed | |
| 23 | /api/scores | GET | YES | SUPER, ADMIN, GURU, SISWA, ORANG_TUA | SISWA: own; ORANG_TUA: children; KEPALA: blocked | studentId required | IDOR fixed | **Fake classRank (MED-14)** |
| 24 | /api/grade-components | GET/POST/PATCH/DELETE | YES | GET: any; CUD: ADMIN, SUPER | GET: auth.schoolId; CUD: verified | weight 0-100 | IDOR fixed | |
| 25 | /api/teaching-journals | GET/POST/PATCH/DELETE | YES | GET: +KEPALA_SEKOLAH; CUD: GURU, ADMIN, SUPER | **NO** | teacherId, date, topic | **MED-11** | |
| 26 | /api/reports/legger | GET | YES | any auth | YES (class->school) | classId, term; format | IDOR fixed | |
| 27 | /api/reports/rekap-kelas | GET | YES | any auth | YES (class->school) | classId, term | IDOR fixed | |
| 28 | /api/reports/rapor-siswa | GET | YES | any auth | YES (per-role checks) | studentId, term; format | Full ownership chain | |
| 29 | /api/kepsek/dashboard | GET | YES | KEPALA_SEKOLAH, ADMIN, SUPER | YES (requireSchoolScope) | schoolId | IDOR fixed | |
| 30 | /api/kepsek/class-map | GET | YES | KEPALA_SEKOLAH, ADMIN, SUPER | YES (requireSchoolScope) | schoolId | IDOR fixed | KKM hardcoded 70 |
| 31 | /api/attendance | GET/POST/PATCH | YES | GET: +SISWA, ORANG_TUA, KEPALA_SEKOLAH; POST: GURU; PATCH: +ADMIN | GET: scoped; POST: requireSchoolScope; PATCH: verified | POST: date, schoolId, records; PATCH: id, status | IDOR fixed | **CRITICAL-6** |
| 32 | /api/character-reports | GET/POST/PATCH/DELETE | YES | GET: +ORANG_TUA, SISWA; CUD: ORANG_TUA only | GET: scoped per role; CUD: requireStudentScope | habit whitelist; rating 1-4 | IDOR fixed | |
| 33 | /api/materials | GET/POST/PATCH/DELETE | YES | GET: +SISWA; CUD: GURU, ADMIN, SUPER | **NO** | POST: title required; URL validation | **MED-10** | |
| 34 | /api/teacher-assignments | GET/POST/PATCH/DELETE | YES | SUPER, ADMIN | **NO** | teacherId, schoolId required | **MED-12** | |
| 35 | /api/external-quiz-scores | GET/POST/PATCH/DELETE | YES | GET: SUPER, ADMIN, GURU, SISWA; POST: any auth; PATCH: ADMIN; DELETE: GURU, ADMIN, SUPER | GET: scoped; POST: mode-based; PATCH/DELETE: verified | score 0-100 | IDOR fixed | LOW-2 (dead KEPALA_SEKOLAH) |
| 36 | /api/grades/final | GET | YES | any auth | YES (per-student school check) | term required; mode or studentId | IDOR fixed | Normalized calculation |
| 37 | /api/student-grades | GET/POST/PATCH/DELETE | YES | GET: any; POST/PATCH: +KEPALA_SEKOLAH; DELETE: GURU, ADMIN, SUPER | GET: scoped per role; CUD: verified | POST: studentId, componentId, score; PATCH: id, score | IDOR fixed | |
| 38 | /api/feedback | GET/POST | YES | GET: any (SISWA: empty); POST: ORANG_TUA, GURU, etc. | GET: schoolId; POST: auth.schoolId | category whitelist; subject/message length limits | IDOR fixed | |
| 39 | /api/feedback/[id] | PATCH | YES | GURU, KEPALA_SEKOLAH, ADMIN, SUPER | YES (school check) | status whitelist; response length | IDOR fixed | |
| 40 | /api/timetable | GET/POST/PUT/DELETE | YES | GET: +KEPALA_SEKOLAH; CUD: SUPER, ADMIN, GURU | **NO** | POST: all fields; PUT: id | **MED-13** | |
| 41 | /api/competency-assessments | GET/POST/PATCH | YES | GET: any; POST/PATCH: GURU, ADMIN, KEPALA_SEKOLAH, SUPER | GET: scoped; POST: requireStudentScope; PATCH: school + assessor check | dimension whitelist; rating 1-4; term, date required | IDOR fixed | |
| 42 | /api/competency-assessments/[id] | DELETE | YES | GURU, ADMIN, KEPALA_SEKOLAH, SUPER | YES (school + assessor check) | N/A | IDOR fixed | |
| 43 | /api/ai/chatbot | GET/POST/DELETE | YES | any auth | YES (requireSchoolScope) | POST: action, sessionId, content; session ownership | IDOR fixed | Rate-limited |
| 44 | /api/ai/generate-questions | POST | YES | any auth | **NO** | schoolId, userId, subjectId, count | **CRITICAL-4** (JSON.parse) | Rate-limited |
| 45 | /api/ai/analyze-difficulty | POST | YES | any auth | **NO** | schoolId, userId, classId, subjectId | None | Rate-limited |
| 46 | /api/ai/recommend-questions | POST | YES | any auth | **NO** | schoolId, userId, studentId, subjectId | None | Rate-limited |
| 47 | /api/ai/generate-report-desc | POST | YES | any auth | YES (requireStudentScope + requireSchoolScope) | studentId, schoolId | IDOR fixed | Rate-limited |
| 48 | /api/ai/review-question | PATCH | YES | SUPER, ADMIN, GURU, KEPALA_SEKOLAH | YES (requireSchoolScope + question school) | questionId, action (approve/reject) | IDOR fixed | |
| 49 | /api/ai/config | GET/PATCH | YES | GET: not SISWA/ORANG_TUA; PATCH: not GURU either | YES (requireSchoolScope) | schoolId; PATCH: field whitelist | IDOR fixed | |
| 50 | /api/ai/summarize-material | POST | YES | any auth | **NO** | schoolId, userId, title, content (min 50 chars) | None | Rate-limited |
| 51 | /api/ai/usage | GET | YES | any auth | YES (requireSchoolScope) | schoolId | IDOR fixed (userId forced) | |
| 52 | /api/backup | GET/POST | YES | SUPER_ADMIN only | N/A | action param | **CRITICAL-1** ($queryRawUnsafe, exec) | |
| 53 | /api/seed | POST | YES | SUPER_ADMIN; production blocked | N/A | N/A | **CRITICAL-3** (destructive) | |
| 54 | /api/import/csv | POST | YES | SUPER_ADMIN, ADMIN_SCHOOL | **NO** (schoolId from form) | file, type (siswa/guru), schoolId | None | NISN/NIP uniqueness |
| 55 | /api/import/questions | POST | YES | SUPER_ADMIN, ADMIN_SCHOOL, GURU | **NO** | file (.docx only), subjectId | None | mammoth parser |
| 56 | /api/dapodik/connector/download | GET | YES | any auth | N/A | N/A | None | **LOW-4** (filesystem) |
| 57 | /api/dapodik/import | POST | YES | SUPER_ADMIN, ADMIN_SCHOOL | schoolId verified | schoolId, data structure | None | **LOW-3** (wrong status codes) |
| 58 | /api/submissions/[id] | GET | YES | any auth | YES (requireStudentScope or school) | N/A | IDOR fixed | |
| 59 | /api/activity-logs | GET/POST | YES | GET: SUPER_ADMIN, ADMIN_SCHOOL; POST: any | GET: school filter; POST: **none** | POST: action required | **CRITICAL-7** (arbitrary log write) | |
| 60 | /api/analytics | GET | YES | SUPER_ADMIN, ADMIN_SCHOOL, KEPALA_SEKOLAH, GURU | **NO** (schoolId from query) | schoolId, type | None | **CRITICAL-5** (hardcoded data) |
| 61 | /api/audit/suspicious-access | GET | YES | SUPER_ADMIN, ADMIN_SCHOOL, KEPALA_SEKOLAH | schoolFilter: SUPER_ADMIN only | windowMinutes, threshold | **CRITICAL-2** ($queryRawUnsafe) | |

---
Task ID: 5
Agent: database-audit
Task: Phase 11 - Database Schema Audit

# Database Schema Audit Report
**File:** prisma/schema.prisma (803 lines)
**Provider:** SQLite
**Generator:** prisma-client-js
**Total Models:** 36
**Total Enums Defined:** 0

---

## 1. ALL MODELS AND FIELDS

| # | Model | Fields | Key Characteristics |
|---|-------|--------|---------------------|
| 1 | School | 25 fields | Root tenant; Dapodik fields; many reverse relations |
| 2 | Subscription | 8 fields | Links to School |
| 3 | User | 20 fields | 5-level RBAC; self-relation ParentChild; many reverse relations |
| 4 | Class | 7 fields | WaliKelas relation to User; schoolId required |
| 5 | Subject | 5 fields | GLOBAL (no schoolId); @unique code |
| 6 | Topic | 5 fields | Self-relation TopicHierarchy |
| 7 | Question | 17 fields | Bank soal; schoolId nullable (global vs private) |
| 8 | ExamPackage | 9 fields | Tryout package; optional gradeComponentId link |
| 9 | ExamItem | 4 fields | Junction: ExamPackage ↔ Question |
| 10 | ExamSession | 9 fields | Schedule for tryout; schoolId/classId nullable |
| 11 | ExamAssignment | 4 fields | Junction: ExamSession → Class |
| 12 | StudentAttempt | 17 fields | Exam attempt; self-relation RemedialChain |
| 13 | StudentAnswer | 6 fields | Per-question answer in attempt |
| 14 | DiagnosticResult | 7 fields | **ORPHAN** — no relations, no API routes |
| 15 | Attendance | 8 fields | Date as String; no FK relations |
| 16 | TeacherAssignment | 7 fields | No FK relations at all |
| 17 | TeachingJournal | 8 fields | No FK relations at all |
| 18 | CharacterReport | 8 fields | No FK relations; habit + rating fields |
| 19 | ActivityLog | 5 fields | No FK relations |
| 20 | Material | 14 fields | No FK relations; dueDate as String |
| 21 | ExternalQuizScore | 8 fields | No FK relations to Material/User/School |
| 22 | AiConfig | 10 fields | schoolId @unique but NO @relation to School |
| 23 | AiUsageLog | 5 fields | No FK relations |
| 24 | ChatbotSession | 5 fields | No FK relations to User/School/Subject |
| 25 | ChatMessage | 4 fields | Only relation: Cascade to ChatbotSession |
| 26 | ErrorLog | 9 fields | No FK relations |
| 27 | Timetable | 7 fields | Proper FK relations to Subject/User/Class |
| 28 | Assignment | 11 fields | No FK relations except GradeComponent |
| 29 | AssignmentQuestion | 5 fields | Junction: Assignment ↔ Question |
| 30 | AssignmentSubmission | 11 fields | Self-relation RemedialAssignment |
| 31 | AssignmentAnswer | 6 fields | Junction: Submission ↔ AssignmentQuestion |
| 32 | GradeComponent | 9 fields | Weight system; links to School/Subject/Class/User |
| 33 | StudentGrade | 13 fields | Denormalized fields; source tracking |
| 34 | Feedback | 10 fields | Sender/Responder relations to User |
| 35 | CompetencyAssessment | 11 fields | 8-dimension profile; Assessor/Student relations |
| 36 | AuditLog | 8 fields | No FK relations to User |

---

## 2. RELATIONS ANALYSIS

### Models WITH proper @relation definitions:
- School ↔ Subscription, User, Class, ExamPackage, Question, Feedback, CompetencyAssessment, GradeComponent, StudentGrade
- User ↔ School, Class, self-ParentChild, Question (creator), StudentAttempt, Class (waliKelas), Timetable (teacher), Feedback (sender/responder), CompetencyAssessment (assessor/assessed), GradeComponent (creator), StudentGrade (student)
- Class ↔ School, User, ExamAssignment, Timetable, CompetencyAssessment, GradeComponent
- Subject ↔ Topic, Question, Timetable, GradeComponent
- Topic ↔ Subject, self-TopicHierarchy, Question
- Question ↔ Subject, Topic, School, User (creator), ExamItem, StudentAnswer, AssignmentQuestion
- ExamItem ↔ ExamPackage (Cascade), Question
- ExamAssignment ↔ ExamSession (Cascade), School, Class
- ExamPackage ↔ School (optional), GradeComponent (optional), ExamItem, ExamSession
- ExamSession ↔ ExamPackage, ExamAssignment
- StudentAnswer ↔ StudentAttempt (Cascade), Question
- AssignmentQuestion ↔ Assignment (Cascade), Question, AssignmentAnswer
- AssignmentSubmission ↔ Assignment (Cascade), self-RemedialAssignment, AssignmentAnswer
- AssignmentAnswer ↔ AssignmentSubmission (Cascade), AssignmentQuestion
- GradeComponent ↔ School, Subject, Class, User (creator), StudentGrade (Cascade), ExamPackage, Assignment
- StudentGrade ↔ User (student), GradeComponent (Cascade), School
- Feedback ↔ User (fromUser), User (responder), School
- CompetencyAssessment ↔ User (student), User (assessor), School, Class
- ChatMessage ↔ ChatbotSession (Cascade)
- Timetable ↔ Subject, User (teacher), Class

### CRITICAL: Models with MISSING @relation annotations (16 models affected):

| Model | FK Fields WITHOUT @relation | Severity |
|-------|---------------------------|----------|
| **StudentAttempt** | examPackageId, examSessionId, schoolId, classId | **CRITICAL** — examPackageId has NO relation on either side; ExamPackage/ExamSession lack reverse `studentAttempts` |
| **DiagnosticResult** | userId, schoolId, subjectId, topicId | **CRITICAL** — Zero relations defined; completely orphaned |
| **Attendance** | studentId, classId, schoolId, recordedBy | HIGH |
| **TeacherAssignment** | teacherId, subjectId, classId, schoolId | HIGH |
| **TeachingJournal** | teacherId, classId, subjectId, schoolId | HIGH |
| **CharacterReport** | studentId, classId, schoolId, reporterId | HIGH |
| **ActivityLog** | userId, schoolId | MEDIUM |
| **Material** | subjectId, topicId, classId, schoolId, teacherId | HIGH |
| **ExternalQuizScore** | materialId, studentId, schoolId, classId, enteredBy | HIGH |
| **AiConfig** | schoolId (has @unique but NO @relation; School has no aiConfigs reverse) | MEDIUM |
| **AiUsageLog** | userId, schoolId | MEDIUM |
| **ChatbotSession** | userId, schoolId, subjectId | MEDIUM |
| **ErrorLog** | userId, schoolId | LOW (log table) |
| **Assignment** | subjectId, classId, teacherId, schoolId | HIGH |
| **AssignmentSubmission** | studentId, schoolId, classId | HIGH |
| **AuditLog** | userId | LOW (log table) |
| **ExamSession** | schoolId, classId, createdBy | HIGH |
| **ExamPackage** | createdBy | MEDIUM |
| **CompetencyAssessment** | subjectId | MEDIUM |
| **StudentGrade** | classId | MEDIUM |

**Impact:** 50+ FK fields store IDs as plain Strings with zero referential integrity. No Prisma `include`/join works. Dangling FKs are undetectable at DB level.

### No Circular Dependencies Found
Self-relations are intentional: ParentChild (User), RemedialChain (StudentAttempt), RemedialAssignment (AssignmentSubmission), TopicHierarchy (Topic).

### Orphan Model:
- **DiagnosticResult** — Has NO @relation on any field. NO reverse relation from any other model. NO dedicated API route (only seed cleanup). NO frontend usage. This model is completely dead code.

---

## 3. UNIQUE CONSTRAINTS

| Model | Unique Constraint | Issue |
|-------|------------------|-------|
| School | code @unique | ✓ Correct |
| School | npsn @unique (nullable) | ✓ Correct |
| User | username @unique (nullable) | ✓ Correct |
| User | email @unique (nullable) | ✓ Correct |
| User | nisn @unique (nullable) | ✓ Correct |
| User | nip @unique (nullable) | ✓ Correct |
| Subject | code @unique | ✓ Correct |
| AiConfig | schoolId @unique | ⚠️ No @relation defined (see above) |
| Timetable | [day, slotNumber, classId, schoolId] | ✓ Correct |
| AssignmentQuestion | [assignmentId, questionId] | ✓ Correct |
| AssignmentAnswer | [submissionId, questionId] | ✓ Correct |
| StudentGrade | [studentId, componentId, source, sourceId] | ⚠️ **BUG**: sourceId is nullable. In SQLite, NULLs are distinct in UNIQUE constraints, allowing duplicate rows when sourceId=NULL (e.g., multiple MANUAL grades for same student+component) |
| CompetencyAssessment | [studentId, dimension, term, assessedBy] | ✓ Correct |

---

## 4. FOREIGN KEY CONSTRAINTS

### Proper @relation FKs (21 fields across 12 models):
All use `@relation(fields: [...], references: [id])` syntax. ✓

### Manual (Unenforced) FKs — 50+ fields:
Plain `String` fields storing IDs with no `@relation`. No DB-level FK constraint. No Prisma relation. Full list in Section 2 above.

---

## 5. NULLABLE FIELDS THAT SHOULD NOT BE NULLABLE

| Model | Field | Current | Should Be | Reason |
|-------|-------|---------|-----------|--------|
| Attendance | classId | String? | String | Attendance is always for a specific class |
| Attendance | schoolId | String? | String | Every attendance record belongs to a school |
| TeachingJournal | classId | String? | String | Journals are per-class |
| TeachingJournal | schoolId | String? | String | Every journal belongs to a school |
| TeacherAssignment | schoolId | String? | String | Teachers are assigned within a school |
| CharacterReport | schoolId | String? | String | Character reports are school-scoped |
| ExamSession | schoolId | String? | String | Exam sessions belong to a school |
| ExamSession | classId | String? | String | Exam sessions target a specific class |
| AssignmentSubmission | schoolId | String? | String | Submissions belong to a school |
| ExternalQuizScore | schoolId | String? | String | Scores belong to a school |
| ExternalQuizScore | classId | String? | String | Scores are per-class |
| User | schoolId | String? | String | Acceptable ONLY for SUPER_ADMIN; otherwise should be required |

---

## 6. MISSING INDEXES

| Model | Missing Index On | Query Pattern |
|-------|-----------------|---------------|
| Class | schoolId | Filter classes by school (very frequent) |
| Subscription | schoolId | Look up subscription for school |
| ExamPackage | schoolId, status | Filter packages by school/status |
| ExamSession | schoolId, classId, status, createdBy | Schedule queries |
| ExamAssignment | schoolId, classId | Assignment listing |
| StudentAttempt | examPackageId, examSessionId | Find attempts for a package/session |
| Attendance | recordedBy | Find attendance recorded by a teacher |
| CharacterReport | reporterId | Find reports by a reporter |
| AuditLog | action | Filter by action type |
| ExternalQuizScore | classId, enteredBy | Filter by class or entry user |
| StudentGrade | classId | Filter grades by class |
| Assignment | subjectId | Filter assignments by subject |

---

## 7. ENUM TYPES vs STRING USAGE

**Zero enums are defined.** 35+ fields use `String` where `enum` should be used:

| Field | Current Values | Should Be Enum |
|-------|----------------|----------------|
| School.status | active, suspended, deleted | SchoolStatus |
| School.plan | free, starter, pro | PlanType |
| User.role | SUPER_ADMIN, ADMIN_SCHOOL, GURU, SISWA, ORANG_TUA, KEPALA_SEKOLAH | **UserRole** (most critical) |
| User.jk | L, P | Gender |
| Subject.type | wajib, pilihan | SubjectType |
| Question.type | pg, pg_kompleks, isian, esai | QuestionType |
| Question.cognitiveLevel | C1-C6 | CognitiveLevel |
| Question.difficulty | mudah, sedang, sulit | Difficulty |
| Question.status | draft, published, archived | QuestionStatus |
| Question.source | manual, ai | QuestionSource |
| ExamPackage.status | draft, ... | ExamPackageStatus |
| ExamSession.status | scheduled, active, ended | ExamSessionStatus |
| StudentAttempt.status | in_progress, submitted, graded | AttemptStatus |
| DiagnosticResult.level | kuat, cukup, lemah | DiagnosticLevel |
| Attendance.status | hadir, izin, sakit, alpa | AttendanceStatus |
| Material.type | materi, tugas, quiz | MaterialType |
| Material.status | published, draft | PublishStatus |
| Material.scoreEntryMode | SELF_REPORTED, TEACHER_ENTERED | ScoreEntryMode |
| ExternalQuizScore.entryMode | SELF_REPORTED, TEACHER_ENTERED | ScoreEntryMode |
| ChatMessage.role | user, assistant | ChatRole |
| ErrorLog.level | error, warn, fatal | ErrorLevel |
| Assignment.submissionType | pg_only, essay_only, mixed | SubmissionType |
| Assignment.status | draft, published, closed | AssignmentStatus |
| AssignmentSubmission.status | belum_dikerjakan, dikerjakan, submitted, dinilai | SubmissionStatus |
| StudentGrade.source | MANUAL, TRYOUT, TUGAS | GradeSource |
| Feedback.fromRole | ORANG_TUA, GURU, KEPALA_SEKOLAH | Role (reuse UserRole) |
| Feedback.category | saran, kritik, apresiasi | FeedbackCategory |
| Feedback.status | baru, dibaca, ditindaklanjuti | FeedbackStatus |
| CompetencyAssessment.dimension | 8 values | CompetencyDimension |
| AuditLog.action | READ, CREATE, UPDATE, DELETE | AuditAction |
| AuditLog.logStatus | success, denied | AuditLogStatus |
| Timetable.day | SENIN-JUMAT | DayOfWeek |
| CharacterReport.filledBy | ORANG_TUA, GURU | FilledByRole |
| CharacterReport.habit | 7 values | HabitType |
| Subscription.status | active, ... | SubscriptionStatus |
| Subscription.plan | free, ... | PlanType |

**SQLite Note:** Prisma supports enums on SQLite since Prisma 5.x via `String` backing. However, using raw `String` provides zero validation — any value can be stored.

---

## 8. DATE FIELDS STORED AS STRING vs DateTime

| Model | Field | Current Type | Format | Risk |
|-------|-------|-------------|--------|------|
| Attendance | date | **String** | YYYY-MM-DD | No date comparison, sorting relies on string collation |
| TeachingJournal | date | **String** | YYYY-MM-DD | Same |
| CharacterReport | date | **String** | YYYY-MM-DD | Same |
| Material | dueDate | **String?** | YYYY-MM-DDTHH:mm | Same; also loss of timezone info |
| Assignment | deadline | **String** | YYYY-MM-DDTHH:mm | Same; also loss of timezone info |
| StudentGrade | date | **String?** | YYYY-MM-DD | Same |
| CompetencyAssessment | date | **String** | YYYY-MM-DD | Same |
| School | established | **String?** | Tahun (year) | Low risk — it's just a year |

**Recommendation:** All date/datetime fields should be `DateTime` for proper type safety, comparison operators, and Prisma filtering support.

---

## 9. UNUSED / ORPHAN MODELS

| Model | API Routes | Prisma Usage (outside seed) | Verdict |
|-------|-----------|---------------------------|--------|
| **DiagnosticResult** | NONE | NONE (only seed deleteMany) | **DEAD — Remove or implement** |
| ErrorLog | NONE (written via lib/error-log.ts) | Used in lib/error-log.ts | Active but no @relation (acceptable for log) |
| AuditLog | /api/audit/suspicious-access | Used in lib/audit-log.ts | Active but no @relation (acceptable for log) |
| ActivityLog | /api/activity-logs | Used in analytics | Active but no @relation (acceptable for log) |

---

## 10. CASCADE BEHAVIORS ON DELETE

### Relations WITH onDelete: Cascade (8 relations):
| Child | Parent | Cascade? |
|-------|--------|----------|
| ExamItem | ExamPackage | ✅ Cascade |
| ExamAssignment | ExamSession | ✅ Cascade |
| StudentAnswer | StudentAttempt | ✅ Cascade |
| ChatMessage | ChatbotSession | ✅ Cascade |
| AssignmentQuestion | Assignment | ✅ Cascade |
| AssignmentSubmission | Assignment | ✅ Cascade |
| AssignmentAnswer | AssignmentSubmission | ✅ Cascade |
| StudentGrade | GradeComponent | ✅ Cascade |

### Relations WITHOUT Cascade (risk of orphaned records on delete):
| Child | Parent | Current | Risk |
|-------|--------|---------|------|
| ExamSession | ExamPackage | Restrict (default) | Deleting a package leaves orphaned sessions |
| Subscription | School | Restrict | Deleting school blocks due to subscriptions |
| User | School | Restrict | Deleting school blocks due to users |
| Class | School | Restrict | Deleting school blocks due to classes |
| Question | School | Optional | OK (nullable FK) |
| Question | User (creator) | Restrict | Deleting user blocks due to created questions |
| StudentAttempt | User | Restrict | Deleting user blocks due to attempts |
| Feedback | User (sender) | Restrict | Deleting user blocks due to sent feedback |
| CompetencyAssessment | User (assessed) | Restrict | Deleting student blocks due to assessments |
| CompetencyAssessment | User (assessor) | Restrict | Deleting teacher blocks due to assessments |
| GradeComponent | User (creator) | Restrict | Deleting admin blocks due to grade components |
| Timetable | User (teacher) | Restrict | Deleting teacher blocks due to timetable |

**Recommendation:** For a multi-tenant app, School deletion should cascade or use `onDelete: Cascade` on most child relations, or implement soft-delete (which `status = 'deleted'` on School already partially supports).

---

## 11. MODELS WITHOUT @id

**All 36 models have `@id @default(cuid())`.** ✓ No missing primary keys.

---

## 12. @id FIELDS THAT SHOULD BE @unique

N/A — all @id fields are already unique by definition. No composite primary keys in use; all use single CUID primary keys. ✓

---

## 13. SQLITE COMPATIBILITY

| Check | Status | Notes |
|-------|--------|-------|
| Provider | ✅ `sqlite` | Correct |
| CUID | ✅ Supported | Prisma handles CUID generation |
| DateTime | ✅ Supported | Stored as TEXT in ISO 8601 |
| Float | ✅ Supported | IEEE 754 floating point |
| Boolean | ✅ Supported | Stored as INTEGER 0/1 |
| No arrays | ✅ | All fields are scalar |
| No JSON | ✅ | Question.options is stored as String (JSON serialized manually) |
| No PostgreSQL features | ✅ | No `serial`, `bigserial`, `jsonb`, `array`, etc. |
| Enum backing | ⚠️ | Zero enums defined; if added, Prisma uses String backing on SQLite which is fine |
| ALTER TABLE limits | ⚠️ | SQLite cannot modify/drop columns. Schema changes require table recreate via Prisma migrate. Existing `schema.sqlite-backup.prisma` and `schema.postgresql.prisma` suggest migration planning exists. |

---

## SUMMARY OF FINDINGS

### Critical (3)
1. **DB-FK-01**: 50+ FK fields across 16 models lack `@relation` annotations — zero referential integrity, zero Prisma join support
2. **DB-FK-02**: StudentAttempt.examPackageId and examSessionId have NO relation on either side — ExamPackage and ExamSession models are missing reverse `studentAttempts` relations
3. **DB-ORPHAN-01**: DiagnosticResult is a completely orphaned model — no relations, no API, no usage

### High (8)
4. **DB-NULL-01**: 11 fields across 7 models are nullable but should be required (classId, schoolId on core entities)
5. **DB-ENUM-01**: 35+ fields use raw String instead of enum — zero DB-level validation
6. **DB-DATE-01**: 7 date/datetime fields stored as String — no type safety, no date comparison
7. **DB-IDX-01**: 12+ missing indexes on frequently queried fields (Class.schoolId, ExamSession.*, etc.)
8. **DB-UNIQ-01**: StudentGrade `@@unique([studentId, componentId, source, sourceId])` allows duplicates when sourceId is NULL (SQLite NULL handling)
9. **DB-CASC-01**: ExamSession has no cascade on ExamPackage deletion — orphaned sessions on package delete
10. **DB-REL-01**: AiConfig.schoolId has @unique but NO @relation to School model
11. **DB-REL-02**: Assignment, AssignmentSubmission, Material, ExternalQuizScore, TeacherAssignment, TeachingJournal, CharacterReport, CompetencyAssessment all missing partial or full FK relations

### Medium (5)
12. **DB-CASC-02**: School deletion blocked by 10+ child relations without cascade — consider soft-delete pattern
13. **DB-NULL-02**: User.schoolId nullable even for roles that require it (only SUPER_ADMIN should be exempt)
14. **DB-IDX-02**: Composite indexes missing for common query patterns (e.g., Attendance [studentId, date, classId])
15. **DB-DENORM-01**: StudentGrade denormalizes subjectId and term from GradeComponent — risk of data drift
16. **DB-REL-03**: ExamPackage.createdBy, ExamSession.createdBy, ExamSession.schoolId, ExamSession.classId have no @relation

### Low (3)
17. **DB-LOG-01**: ActivityLog, ErrorLog, AuditLog have no FK relations (acceptable for log tables but limits analytical queries)
18. **DB-CASC-03**: Question→User(creator) and Timetable→User(teacher) have no cascade — teacher deletion blocked
19. **DB-SCHEMA-ALT**: Multiple alternative schema files exist (schema.postgresql.prisma, schema.production.prisma, schema.sqlite-backup.prisma) — drift risk

---

## RECOMMENDED ACTIONS (Priority Order)

1. **[DB-FK-01]** Add `@relation` annotations to all 50+ orphan FK fields across 16 models. This is the single highest-impact fix — enables Prisma joins, referential integrity, and proper cascade behavior.
2. **[DB-ORPHAN-01]** Remove DiagnosticResult model or implement full API + relations.
3. **[DB-FK-02]** Add `studentAttempts StudentAttempt[]` reverse relation to ExamPackage and ExamSession; add `@relation` on StudentAttempt.examPackageId and examSessionId.
4. **[DB-ENUM-01]** Define at minimum: `UserRole`, `QuestionType`, `QuestionStatus`, `AttendanceStatus`, `DayOfWeek`, `SubmissionType`, `DifficultyLevel`, `CognitiveLevel` enums.
5. **[DB-DATE-01]** Convert 7 String date fields to DateTime.
6. **[DB-NULL-01]** Make classId and schoolId required on Attendance, TeachingJournal, TeacherAssignment, CharacterReport, ExamSession, AssignmentSubmission, ExternalQuizScore.
7. **[DB-UNIQ-01]** Fix StudentGrade unique constraint to handle NULL sourceId — consider `@@unique([studentId, componentId, source])` for MANUAL source, or add a conditional check.
8. **[DB-IDX-01]** Add missing indexes (Class.schoolId, Subscription.schoolId, ExamPackage.schoolId, ExamSession composite indexes, etc.).
9. **[DB-CASC-01/02]** Add `onDelete: Cascade` from ExamSession → ExamPackage. Implement soft-delete for School.
10. **[DB-REL-01]** Add `@relation` on AiConfig.schoolId and add `aiConfigs AiConfig[]` to School model.

---
Task ID: 6
Agent: dashboard-audit
Task: Phase 8 - Dashboard Data & Mock Audit

# Dashboard Data & Mock Audit Report
**Files scanned:** 6 dashboard components + 2 API routes
**Date:** 2025-07-13

## CRITICAL FINDINGS (5)

### DASH-CRIT-01: Super-Admin Dashboard — API field name mismatches (2 fields)
**File:** `src/components/dashboard/super-admin/super-admin-dashboard.tsx` vs `src/app/api/analytics/route.ts`
- Dashboard expects `analytics.activeSchools` (line 59/296) but API global response returns `totalSchools` (route.ts line 90)
- Dashboard expects `analytics.totalExams` (line 63/346) but API global response returns `totalAttempts` (route.ts line 90)
**Impact:** "Total Sekolah" and "Total Tryout" stat cards will ALWAYS show 0 even with real data in the database.

### DASH-CRIT-02: Student Dashboard — No API handler for `type=student`
**File:** `src/app/api/analytics/route.ts`
- Student dashboard calls `/api/analytics?type=student&userId=...` (siswa-dashboard.tsx line 214)
- Analytics route has handlers for `type=dashboard`, `type=guru-dashboard`, `type=global` — but NO handler for `type=student`
- Falls through to `return NextResponse.json({})` (line 93)
- The `userId` param is extracted (line 10) but never used in any handler
**Impact:** Student dashboard will ALWAYS receive empty data. All metrics (lastScore, totalExams, avgCorrect, rank, weakTopics, scoreTrend, subjectBreakdown) will be null/undefined.

### DASH-CRIT-03: Analytics API — Hardcoded fake monthly growth data
**File:** `src/app/api/analytics/route.ts` lines 83-87
```
const monthlyGrowth = [
  { month: 'Jul', sekolah: 2, siswa: 45 },
  { month: 'Agu', sekolah: 5, siswa: 120 },
  { month: 'Sep', sekolah: 8, siswa: 210 },
  { month: 'Okt', sekolah: 12, siswa: 340 },
  { month: 'Nov', sekolah: 15, siswa: 480 },
  { month: 'Des', sekolah: totalSchools, siswa: totalStudents },  // Only Dec is real
];
```
5 of 6 months are entirely fabricated numbers. Only December uses actual DB counts.
**Impact:** Super-admin growth chart shows misleading/fake data.

### DASH-CRIT-04: Analytics API — Hardcoded fake student trends
**File:** `src/app/api/analytics/route.ts` line 47
```
trend: idx === 0 ? 'up' as const : idx === 1 ? 'up' as const : 'stable' as const,
```
Top students' trend is derived from array index, not actual performance over time. Student #1 and #2 always show 'up', student #3 always shows 'stable'.
**Impact:** Guru dashboard "Performa Siswa Terbaik" section shows fake trend arrows.

### DASH-CRIT-05: Orang Tua Dashboard — Hardcoded child stats + mock fallback on API failure
**File:** `src/components/dashboard/orang-tua/orang-tua-dashboard.tsx`
- Lines 221-229: Even when API succeeds, child data is populated with HARDCODED values:
  ```js
  avgScore: 72.5,
  totalExams: 8,
  attendance: 95,
  lastActive: '2 jam lalu',
  ```
  The API response is only used for `id`, `name`, and `className`. All numeric metrics are ignored.
- Lines 234-247: On API failure (catch block), explicit comment `// Fallback to mock data` and a full mock child object is used with the same hardcoded numbers plus a fake name "Ahmad Rizky Pratama".
**Impact:** Parent dashboard ALWAYS shows the same fake stats (72.5 avg score, 8 tryouts, 95% attendance) regardless of actual child performance.

## HIGH FINDINGS (3)

### DASH-HIGH-01: Super-Admin Dashboard — Hardcoded mock activity timeline
**File:** `src/components/dashboard/super-admin/super-admin-dashboard.tsx` lines 208-215
```
// Mock recent activity
const recentActivities: RecentActivity[] = [
  { id: '1', action: 'Sekolah baru terdaftar', detail: 'SMA Negeri 3 Bandung bergabung', ... },
  { id: '2', action: 'Tryout baru dibuat', detail: 'TKA Prediksi Akhir Tahun oleh Guru Matematika', ... },
  { id: '3', action: '500 soal baru ditambahkan', detail: 'Bank soal NALAR diperbarui otomatis', ... },
  { id: '4', action: 'Laporan bulanan dikirim', detail: 'Report Mei 2025 tersedia untuk unduh', ... },
  { id: '5', action: 'Pengaturan diperbarui', detail: 'Konfigurasi limit tryout diubah', ... },
];
```
Entire "Aktivitas Terkini" section is static mock data — never fetched from API. Shows fabricated events with fake school names and timestamps.

### DASH-HIGH-02: Super-Admin Dashboard — Hardcoded dash for average score in top schools table
**File:** `src/components/dashboard/super-admin/super-admin-dashboard.tsx` line 532
```
<span className="font-semibold text-[#1F3864]">-</span>
```
The "Rata-rata Skor" column in the top schools table ALWAYS shows "-" regardless of actual school data. No score field is fetched or computed from the API.

### DASH-HIGH-03: Student Dashboard — Hardcoded mock streak value
**File:** `src/components/dashboard/siswa/siswa-dashboard.tsx` line 199-200
```
// Mock streak (in a real app this would come from an API)
const streak = 5;
```
The streak card always shows "5 Hari" with "Fighter" level. No API call, no database tracking. The comment explicitly acknowledges this is mock.

## MEDIUM FINDINGS (2)

### DASH-MED-01: Widespread `?? 0` fallbacks hide empty data
All dashboards use `?? 0` patterns that silently convert null/undefined to 0. When APIs fail or return no data, dashboards show "0" instead of indicating there's a problem.
**Files and lines:**
- super-admin-dashboard.tsx: lines 296, 306, 316, 326, 336, 346
- admin-sekolah-dashboard.tsx: lines 245, 255, 265, 275, 285, 295
- guru-dashboard.tsx: lines 214, 224, 225, 278, 288, 298
- siswa-dashboard.tsx: lines 309, 319
- kepala-sekolah-dashboard.tsx: lines 444, 500
**Note:** These are technically acceptable as defensive coding, but combined with DASH-CRIT-01/02 (missing API handlers), they mask real bugs by displaying 0 instead of showing error states.

### DASH-MED-02: `?? []` fallbacks hide empty activity/student lists
- guru-dashboard.tsx lines 226-227: `recentActivities: analytics.recentActivities ?? []`, `topStudents: analytics.topStudents ?? []`
- admin-sekolah/class-manager.tsx line 181-182: `siswaData.users ?? []`, `guruData.users ?? []`
**Impact:** Empty states render as blank sections rather than showing "no data" messages. However, both guru dashboard sections DO have empty state UI checks, so this is acceptable.

## LOW FINDINGS / OK PATTERNS (3)

### DASH-OK-01: Kepala Sekolah Dashboard — Fully data-driven, no mock data
**File:** `src/components/dashboard/kepala-sekolah/kepala-sekolah-dashboard.tsx`
- All data comes from `/api/kepsek/dashboard` API
- API route (`src/app/api/kepsek/dashboard/route.ts`) uses real Prisma queries with proper joins
- All null values properly handled with dash display (`-`)
- All empty table states show proper messages ("Belum ada data kelas", "Belum ada data guru", etc.)
- Error and unauthorized states properly handled

### DASH-OK-02: Admin Sekolah Dashboard — Properly data-driven for stats
**File:** `src/components/dashboard/admin-sekolah/admin-sekolah-dashboard.tsx`
- All 6 stat cards use API data from `/api/analytics?type=dashboard`
- Chart and upcoming exams properly fetched
- Empty states handled for chart and exams

### DASH-OK-03: Guru Dashboard — Properly data-driven (except for trend)
**File:** `src/components/dashboard/guru/guru-dashboard.tsx`
- Stats fetched from real APIs (`/api/questions`, `/api/analytics?type=guru-dashboard`)
- Empty states handled for top students and activity timeline
- Only the `trend` field in top students is fake (see DASH-CRIT-04)

## PER-DASHBOARD SUMMARY

| Dashboard | Mock/Hardcoded Data | API Source | Empty State Handling | Verdict |
|---|---|---|---|---|
| Super Admin | CRIT-01, CRIT-03, HIGH-01, HIGH-02 | `/api/analytics?type=global` | Growth chart, schools table: OK | FAILS — field mismatches + mock data |
| Admin Sekolah | None | `/api/analytics?type=dashboard` + `/api/exams` | Chart, exams: OK | PASS (with ?? 0 caveats) |
| Guru | CRIT-04 (trend) | `/api/questions` + `/api/analytics?type=guru-dashboard` | Top students, activity: OK | MOSTLY PASS |
| Kepala Sekolah | None | `/api/kepsek/dashboard` | All tables: OK | PASS |
| Siswa | CRIT-02, HIGH-03 (streak) | `/api/analytics?type=student` (MISSING) | Charts, weak topics: OK | FAILS — no API handler |
| Orang Tua | CRIT-05 (all child stats) | `/api/users?parentId=` (stats ignored) | Children cards: OK | FAILS — hardcoded stats |

## RECOMMENDED ACTIONS (Priority Order)

1. **[DASH-CRIT-01]** Fix field name mismatches: rename `totalSchools` → `activeSchools` and `totalAttempts` → `totalExams` in the global analytics response (or update the dashboard interface to match).
2. **[DASH-CRIT-02]** Implement `type=student` handler in analytics route to return real student analytics (lastScore, totalExams, avgCorrect, rank, weakTopics, scoreTrend, subjectBreakdown).
3. **[DASH-CRIT-05]** Fix orang-tua dashboard to use actual child stats from the API response instead of hardcoded values. Add real analytics fields to the `/api/users?parentId=` response or create a dedicated parent analytics endpoint.
4. **[DASH-CRIT-03]** Replace hardcoded monthly growth with real aggregated data from the database (group schools/users by month of creation).
5. **[DASH-HIGH-01]** Replace mock recent activity with real data from ActivityLog table (similar to guru-dashboard's approach).
6. **[DASH-HIGH-02]** Add average score computation to the top schools query in the global analytics endpoint.
7. **[DASH-HIGH-03]** Implement streak tracking (e.g., consecutive days with at least one attempt) via a new API endpoint or analytics field.
8. **[DASH-CRIT-04]** Compute real student trends by comparing latest attempt score to previous attempt score.

---
Task ID: 7
Agent: frontend-error-audit
Task: Phase 13-14 - Frontend & Error Handling Audit

# Frontend & Error Handling Audit Report
**Scope:** All files under `src/components/` + API error patterns + responsive UI + performance
**Files scanned:** 34 view files, 7 dashboard files, 2 auth files, layout, error boundary, 50+ API routes

---

## 1. ERROR HANDLING AUDIT

### 1.1 Try/Catch Coverage

| Category | Count | Details |
|---|---|---|
| View files with `fetch()` | 25 | All views make API calls |
| View files with ANY error handling (try/catch or .catch()) | 15 | 60% coverage |
| View files with NO error handling | 10 | 40% missing |
| Files with `const [error, setError]` state | 6 | Only 6 components show errors in UI |

### CRITICAL: Silent Error Swallowing (ERR-CRIT-01)

**10 view files have catch blocks that silently fall back to mock/fallback data without informing the user:**

| File | Catch blocks | Behavior |
|---|---|---|
| `views/guru-new-views.tsx` | 10 catch blocks | All use `catch { /* use mock */ }` or `catch { /* fallback */ }` — NO toast, NO error state |
| `views/admin-school-new-views.tsx` | 10 catch blocks | All use `catch { setSubjects(MOCK_SUBJECTS); }` or `catch { // fallback }` — NO user notification |
| `views/ortu-new-views.tsx` | 5 catch blocks | Falls back to mock children data silently. **BUG at line 336:** catch calls `toast.success()` instead of `toast.error()` |
| `views/orang-tua-views.tsx` | 5+ catch blocks | All fall back to mock data or are `// silent` — NO toast, NO error state |
| `views/super-admin-views.tsx` | 1+ catch block (line 312) | `catch { setUsers(FALLBACK_USERS); }` — silently falls back to hardcoded user list |
| `views/kepsek/kepsek-peta-kelas-view.tsx` | 1 catch block | Falls back to MOCK with `setUsingMock(true)` — shows a badge "Data contoh (API belum live)" but no error |
| `views/guru-ai-views.tsx` | 7 `.catch(() => {})` | Lines 150, 160, 339, 348, 477, 478, 585 silently swallow errors |
| `views/admin-school-views.tsx` | 0 catch blocks | Uses PLACEHOLDER_ data (hardcoded arrays) — no API calls with error handling |

### ERR-HIGH-01: No 401/403 Redirect in Frontend

**Only 1 component out of 34+ checks for 401/403 status codes:**
- `dashboard/kepala-sekolah/kepala-sekolah-dashboard.tsx:123` — checks `res.status === 401` and sets error state
- **ALL other components** rely on the API returning `res.ok === false` and generic error messages
- **Recommendation:** Create a shared `fetchWithAuth()` utility that checks 401/403 and triggers redirect to login

### ERR-HIGH-02: No `error` State in Most Components

Only 6 components have `const [error, setError] = useState()`:
1. `dashboard/kepala-sekolah/kepala-sekolah-dashboard.tsx:92`
2. `views/siswa-views.tsx:232`
3. `views/siswa-views.tsx:737`
4. `views/exam/siswa-exam-views.tsx:193`
5. `views/exam/siswa-exam-views.tsx:540`
6. `views/kepsek/kepsek-peta-kelas-view.tsx:211`

**Most components use only `toast.error()` for error display** — errors disappear after the toast auto-dismisses.

### ERR-MED-01: Console.log Still Present in Production Code

| File | Line | Pattern |
|---|---|---|
| `views/guru-views.tsx` | 476 | `console.warn('Falling back to mock materi data')` |
| `views/siswa-views.tsx` | 249, 754 | `console.error(err)` |
| `views/exam/siswa-exam-views.tsx` | 211, 1002 | `console.error(err)` |
| `app/error.tsx` | 6 | `console.error('Unhandled error:', error)` (acceptable for error boundary) |

### POSITIVE: Well-Handled Error Files

These files have proper try/catch with toast.error():
- `auth/login-form.tsx` — validates input, shows toast.error, catches network errors
- `auth/register-form.tsx` — comprehensive validation (11+ rules) with toast.error
- `views/feedback/kotak-masukan-view.tsx` — 4 catch blocks, all with toast.error
- `views/guru-import-soal.tsx` — toast.error on import failure
- `views/guru-views.tsx` — toast.error on all API mutations (create, delete, save)
- `views/assignment/guru-assignment-view.tsx` — proper error handling
- `views/assignment/siswa-assignment-view.tsx` — proper error handling
- `views/reports/rapor-view.tsx` — proper error handling
- `views/shared-views.tsx` — proper error handling
- `views/bank-soal/guru-bank-soal-view.tsx` — proper error handling
- `dashboard/super-admin/super-admin-dashboard.tsx` — toast.error on fetch failures

### 1.2 Loading States

**All 25 view files with fetch() calls have a loading state** (`isLoading` or `loading`).

**Skeleton loaders used in 24 files** — good coverage.

### 1.3 Empty States

**All view files with fetch() calls have empty state handling** ("Tidak ada data", "Belum ada", etc.).

**46 files total contain empty state text patterns.**

### 1.4 Form Validation

| Form | Method | Quality |
|---|---|---|
| `login-form.tsx` | JS validation on submit | Basic: only checks empty fields |
| `register-form.tsx` | JS validation (validateForm function) | Good: 11+ rules (email format, password length, NPSN format, etc.) |
| `admin-school-views.tsx` dialogs | Inline toast.error | Basic: only checks name field |
| All other form dialogs | Inline toast.error | Varied quality |

### 1.5 Error Boundary

`app/error.tsx` exists with Indonesian error message ("Terjadi Kesalahan") and a "Coba Lagi" button. Uses `console.error` which is acceptable. **No error boundary for specific component sections** — only the global Next.js error boundary.

`app/not-found.tsx` exists with proper 404 page in Indonesian.

---

## 2. RESPONSIVE UI AUDIT

### 2.1 Sidebar ✅ GOOD

`layout/app-layout.tsx` has proper responsive sidebar:
- Desktop: `hidden lg:flex lg:w-64` — sidebar visible on lg+ (1024px+)
- Mobile: `lg:hidden` hamburger menu → Sheet component (slide-out drawer)
- Collapsible: `!sidebarOpen && 'lg:w-0'` — can be collapsed on desktop

### 2.2 Dialog Sizing ✅ GOOD

`ui/dialog.tsx` base component uses:
- `max-w-[calc(100%-2rem)]` — always 1rem margin on mobile
- `sm:max-w-lg` — proper sizing on larger screens
- Individual dialogs override with `sm:max-w-md`, `sm:max-w-xl`, etc.

### 2.3 Table Horizontal Scroll ❌ CRITICAL ISSUES

**5 view files have tables WITHOUT `overflow-x-auto` wrapper — tables will overflow on mobile:**

| File | Tables Without Scroll | Severity |
|---|---|---|
| `views/admin-school-views.tsx` | 66 tables | CRITICAL (but legacy placeholder data) |
| `views/reports/rapor-view.tsx` | 66 tables | CRITICAL — reports need to be readable on all screens |
| `views/admin-school-new-views.tsx` | 21 tables | HIGH |
| `views/guru-ai-views.tsx` | 15 tables | HIGH |
| `views/admin-school-dapodik.tsx` | 9 tables | MEDIUM — admin-only tool |

**Files with proper overflow-x-auto (15 files):**
- `views/assignment/guru-assignment-view.tsx` ✅
- `views/siswa-views.tsx` ✅
- `views/siswa-new-views.tsx` ✅
- `views/admin-school-timetable.tsx` ✅ (min-w-[900px] + overflow-x-auto)
- `views/guru-new-views.tsx` ✅
- `views/kepsek/kepsek-peta-kelas-view.tsx` ✅
- `views/siswa-ai-views.tsx` ✅
- `views/competency/profil-lulusan-view.tsx` ✅
- `views/admin-school-import.tsx` ✅
- `views/grades/komponen-nilai-view.tsx` ✅
- `views/guru-views.tsx` ✅
- `views/ortu-new-views.tsx` ✅
- `views/orang-tua-views.tsx` ✅
- `views/super-admin-views.tsx` ✅
- `ui/table.tsx` ✅ (base component has overflow)

### 2.4 Fixed-Width Elements ⚠️ MINOR ISSUES

| File | Line | Element | Issue |
|---|---|---|---|
| `views/guru-views.tsx` | 1793 | `w-[280px]` on SelectTrigger | Fixed width may be too wide on small mobile |
| `views/guru-new-views.tsx` | 679 | `min-w-[180px]` on Button | Acceptable — most screens are wide enough |
| `views/admin-school-timetable.tsx` | 388 | `min-w-[900px]` on table | OK — wrapped in overflow-x-auto |
| `views/orang-tua-views.tsx` | 2140 | `max-w-[250px]` on span | OK — truncation is intentional |

Most `min-w-[...]` and `max-w-[...]` values are used appropriately with truncation or are wrapped in scrollable containers.

---

## 3. PERFORMANCE AUDIT

### 3.1 N+1 Query Patterns (PERF-CRIT-01)

**9 API routes use `Promise.all(data.map(async ...))` for post-fetch enrichment — N+1 pattern:**

| Route | Line | Pattern | Impact |
|---|---|---|---|
| `/api/assignments/route.ts` | 35-58 | Per-assignment submission lookup (2 queries each) | Up to 400 extra queries for 200 assignments |
| `/api/assignments/route.ts` | 63-70 | Per-assignment teacher/subject/class lookup | Up to 600 extra queries |
| `/api/teacher-assignments/route.ts` | 20-21 | Same pattern as assignments | Up to 300 extra queries |
| `/api/assignments/[id]/submissions/route.ts` | 96 | Per-submission enrichment | Proportional to submissions |
| `/api/activity-logs/route.ts` | 33 | Per-log user enrichment | Up to 200 extra queries |
| `/api/attempts/route.ts` | 68 | Per-attempt user/exam enrichment | Proportional to attempts |
| `/api/audit/suspicious-access/route.ts` | 74 | Per-user enrichment | Proportional to suspicious users |
| `/api/attendance/route.ts` | 73 | Per-record enrichment | Up to 500 extra queries |
| `/api/character-reports/route.ts` | 91 | Per-record enrichment | Up to 500 extra queries |
| `/api/external-quiz-scores/route.ts` | 53 | Per-record enrichment | Up to 200 extra queries |

**Fix:** Use Prisma `include` to fetch related data in the initial query, or batch lookups with `findMany({ where: { id: { in: [...] } } })`.

### 3.2 Unbounded Queries (PERF-HIGH-01)

**12 API routes have `findMany()` without `take:` limit:**

| Route | Potential Impact |
|---|---|
| `/api/classes/route.ts` | MEDIUM — classes per school are bounded (~20-40) |
| `/api/subjects/route.ts` | MEDIUM — subjects per school are bounded (~15-20) |
| `/api/timetable/route.ts` | HIGH — can grow with many teacher assignments |
| `/api/grades/final/route.ts` | HIGH — all grades for a class, can be 100s of records |
| `/api/teacher-assignments/route.ts` | HIGH — all assignments for a teacher |
| `/api/grade-components/route.ts` | LOW — components per school are bounded |
| `/api/kepsek/class-map/route.ts` | MEDIUM — classes per school |
| `/api/kepsek/dashboard/route.ts` | LOW — single school dashboard |
| `/api/exam-session/[sessionId]/route.ts` | LOW — single session |
| `/api/ai/analyze-difficulty/route.ts` | MEDIUM — depends on question count |
| `/api/ai/recommend-questions/route.ts` | MEDIUM — depends on question bank size |
| `/api/seed/route.ts` | N/A — intentional full table scan for seeding |

### 3.3 Positive: Good Batching Patterns

Several routes properly use `Promise.all()` for independent queries:
- `/api/kepsek/class-map/route.ts:85` — 3 parallel queries for attendance, character, grades
- `/api/teaching-journals/route.ts:29` — 3 parallel queries for teachers, classes, subjects
- `/api/kepsek/dashboard/route.ts:33,52` — parallel queries for dashboard aggregates
- `/api/backup/route.ts:47` — parallel table stats queries
- `/api/activity-logs/route.ts:28` — parallel logs + count queries

### 3.4 React Memoization (PERF-LOW-01)

**14 files use `useMemo`** — primarily for filtering and pagination. No `React.memo()` usage found on any component. For a codebase of this size, this is acceptable since the views are already client-side rendered with Zustand state management (efficient re-render control).

---

## SUMMARY OF FINDINGS

### Critical (5)
1. **ERR-CRIT-01:** Silent error swallowing in 10 view files — users never see errors, only mock data
2. **RESP-CRIT-01:** 5 view files (177 tables total) without overflow-x-auto — broken on mobile
3. **PERF-CRIT-01:** 10 API routes with N+1 query patterns — potential 100s of extra DB queries per request
4. **BUG:** `ortu-new-views.tsx:336` — catch block calls `toast.success()` instead of `toast.error()`
5. **ERR-CRIT-02:** `guru-ai-views.tsx` — 7 silent `.catch(() => {})` blocks

### High (4)
6. **ERR-HIGH-01:** No 401/403 detection in 33+ frontend components — no redirect to login on session expiry
7. **PERF-HIGH-01:** 12 API routes with unbounded `findMany` queries (no `take:` limit)
8. **RESP-HIGH-01:** `admin-school-new-views.tsx` (21 tables) and `guru-ai-views.tsx` (15 tables) no scroll
9. **ERR-HIGH-02:** Only 6 components have persistent error state — most use only toast (disappears)

### Medium (3)
10. **ERR-MED-01:** 3 files have console.log/warn/error in production code
11. **PERF-MED-01:** Fixed-width elements (`w-[280px]`) in guru-views may break small screens
12. **ERR-MED-02:** Login form has no per-field validation errors (only toast on submit)

### Positive (7)
- ✅ All views have loading states (Skeleton loaders in 24 files)
- ✅ All views have empty state handling
- ✅ Sidebar has proper responsive pattern (hidden on mobile, Sheet drawer)
- ✅ Dialog component has responsive sizing
- ✅ Backend API routes have consistent error JSON responses with proper HTTP codes
- ✅ Auth protection is comprehensive (requireRole or requireAuth on all protected routes)
- ✅ No N+1 loops with `await` inside `for` — all use `Promise.all()` at least

## RECOMMENDED ACTIONS (Priority Order)

1. **[ERR-CRIT-01]** Create a shared `fetchAPI()` utility that: wraps fetch in try/catch, checks 401/403 → redirects to login, shows toast.error on failure, throws only for programmatic handling. Replace all bare `fetch()` + silent catch across the 10 affected files.
2. **[RESP-CRIT-01]** Add `overflow-x-auto` wrapper to all `<Table>` elements in: `rapor-view.tsx`, `admin-school-new-views.tsx`, `guru-ai-views.tsx`, `admin-school-dapodik.tsx`.
3. **[PERF-CRIT-01]** Refactor N+1 patterns in `/api/assignments/route.ts`, `/api/teacher-assignments/route.ts`, `/api/activity-logs/route.ts`, `/api/attempts/route.ts` to use Prisma `include` or batch lookups.
4. **[BUG]** Fix `ortu-new-views.tsx:336` — change `toast.success()` to `toast.error()`.
5. **[ERR-CRIT-02]** Replace all `.catch(() => {})` in `guru-ai-views.tsx` with proper error handling + toast.
6. **[ERR-HIGH-01]** Add 401/403 detection in the shared fetchAPI utility.
7. **[PERF-HIGH-01]** Add `take:` limits to unbounded queries in `/api/timetable`, `/api/grades/final`, `/api/teacher-assignments`.
---
Task ID: P0-06
Agent: regression-audit
Task: P0-06 Regression audit of previously fixed authorization

## P0-06 Regression Audit — Authorization Fixes
**Date:** 2025-01-XX
**Scope:** 9 API route files, 22 individual security checks
**Verdict: ALL 22 CHECKS PASS**

### Results Table

| # | File | Method | Check | Result | Notes |
|---|------|--------|-------|--------|-------|
| 1 | assignments/route.ts | GET | getSchoolFilter for non-SUPER_ADMIN | **PASS** | L35: `getSchoolFilter(auth)` used; client schoolId only used as fallback for SUPER_ADMIN (returns undefined) |
| 2 | assignments/route.ts | POST | schoolId verified against auth.schoolId | **PASS** | L114-117: Inline check `effectiveSchoolId !== auth.schoolId` → 403. Functionally equivalent to requireSchoolScope |
| 3 | assignments/route.ts | PATCH | DB status used for draft guard | **PASS** | L165: fetches `status` from DB; L170: `existing.status !== 'draft'` uses DB value, not client `status` |
| 4 | assignments/route.ts | PATCH | school scope verified | **PASS** | L164-168: Fetches DB schoolId, compares to auth.schoolId → 403 |
| 5 | assignments/route.ts | DELETE | school scope verified | **PASS** | L218-222: Fetches DB schoolId, compares to auth.schoolId → 403 |
| 6 | assignments/[id]/route.ts | GET | requireSchoolScope for non-SUPER_ADMIN | **PASS** | L28-30: `requireSchoolScope(auth, assignment.schoolId)` after DB fetch |
| 7 | assignments/[id]/route.ts | GET | strip answer/explanation for SISWA | **PASS** | L33-42: Destructures `{ answer, explanation, ...rest }` from question, returns rest only |
| 8 | questions/route.ts | GET | getSchoolFilter for non-SUPER_ADMIN | **PASS** | L29: `getSchoolFilter(auth)`; L30-34: same safe fallback pattern |
| 9 | questions/route.ts | GET | strip answer/explanation for SISWA | **PASS** | L54-56: `questions.map(({ answer, explanation, ...rest }) => rest)` |
| 10 | questions/route.ts | POST | school scope verified | **PASS** | L77-79: `requireSchoolScope(auth, effectiveSchoolId)` |
| 11 | questions/route.ts | PATCH | school scope verified | **PASS** | L113-116: Fetches DB schoolId, calls `requireSchoolScope(auth, existing.schoolId)` |
| 12 | questions/route.ts | DELETE | school scope verified | **PASS** | L138-141: Same pattern as PATCH |
| 13 | materials/route.ts | GET | getSchoolFilter for non-SUPER_ADMIN | **PASS** | L23: `getSchoolFilter(auth)`; L24-28: safe fallback pattern |
| 14 | materials/route.ts | POST | school scope verified | **PASS** | L89-91: `requireSchoolScope(auth, effectiveSchoolId)` |
| 15 | materials/route.ts | PATCH | school scope verified | **PASS** | L127-130: Fetches DB schoolId, calls `requireSchoolScope` |
| 16 | materials/route.ts | DELETE | school scope verified | **PASS** | L170-173: Same pattern as PATCH |
| 17 | teaching-journals/route.ts | GET | getSchoolFilter for non-SUPER_ADMIN | **PASS** | L18: `getSchoolFilter(auth)`; L19-23: safe fallback pattern |
| 18 | teaching-journals/route.ts | POST | school scope verified | **PASS** | L68-70: `requireSchoolScope(auth, effectiveSchoolId)` |
| 19 | teaching-journals/route.ts | PATCH | school scope verified | **PASS** | L90-93: Fetches DB schoolId, calls `requireSchoolScope` |
| 20 | teaching-journals/route.ts | DELETE | school scope verified | **PASS** | L114-117: Same pattern as PATCH |
| 21 | timetable/route.ts | GET | getSchoolFilter for non-SUPER_ADMIN | **PASS** | L16: `getSchoolFilter(auth)`; L17-21: safe fallback pattern |
| 22 | timetable/route.ts | POST | school scope verified | **PASS** | L57-59: `requireSchoolScope(auth, schoolId)` |
| 23 | timetable/route.ts | PUT | school scope verified | **PASS** | L89-92: Fetches DB schoolId, calls `requireSchoolScope` |
| 24 | timetable/route.ts | DELETE | school scope verified | **PASS** | L113-116: Same pattern as PUT |
| 25 | classes/route.ts | GET | getSchoolFilter for non-SUPER_ADMIN | **PASS** | L16: `getSchoolFilter(auth)`; L17-21: safe fallback pattern |
| 26 | classes/route.ts | POST | school scope verified | **PASS** | L58-60: `requireSchoolScope(auth, effectiveSchoolId)` |
| 27 | classes/route.ts | PUT | school scope verified | **PASS** | L102-107: Fetches DB schoolId, inline comparison → 403 |
| 28 | analytics/route.ts | GET type=global | restricted to SUPER_ADMIN | **PASS** | L84-88: `if (auth.role !== 'SUPER_ADMIN') return 403` |
| 29 | analytics/route.ts | GET type=dashboard | school scope checked | **PASS** | L13-17: `requireSchoolScope(auth, schoolId)` for non-SUPER_ADMIN |
| 30 | scores/route.ts | GET ORANG_TUA | only checks parentId (NOT schoolId) | **PASS** | L30-36: Fetches `parentId` from DB, checks `student.parentId !== auth.userId` → 403. No schoolId check present (correct per spec) |

### Summary
- **22 checks across 9 files: ALL PASS**
- No regressions detected
- All school-scope isolation fixes are intact
- SISWA answer/explanation stripping is correct in both assignment list and detail endpoints
- ORANG_TUA access to scores correctly uses parentId-only check (no schoolId gate that would block legitimate cross-school parents)
- Analytics global endpoint correctly restricted to SUPER_ADMIN only
- Draft guard on PATCH assignments correctly reads DB status (line 170 of assignments/route.ts)

### Minor Observations (non-blocking)
- `assignments/route.ts` POST and PATCH use inline `schoolId !== auth.schoolId` comparison instead of `requireSchoolScope()` utility, but the logic is functionally identical
- `classes/route.ts` PUT also uses inline comparison — same situation, functionally correct
- These inline checks could be unified to `requireSchoolScope()` for consistency in a future cleanup, but pose no security risk

Stage Summary:
- All P0-06 authorization fixes verified intact — no regressions
- Ready for next priority fixes

---
Task ID: audit-fixes
Agent: main
Task: Comprehensive audit + fix 10 critical security bugs

Work Log:
- Launched 7 parallel exploration agents for Phase 1-16 audit
- Agent 1: Project inventory - found 111 mock instances, config concerns
- Agent 2: Auth audit - found 14 IDOR/school isolation issues, 1 AND/OR logic bug
- Agent 3: Menu/route audit - found 2 wrong menu routes, 4 dead routes, 10 misleading menus
- Agent 4: API audit - found 8 critical issues, 14 medium school scope gaps
- Agent 5: Database audit - 50+ FK fields without @relation, 35+ missing enums
- Agent 6: Dashboard audit - 5 critical (3 dashboards broken), 3 high issues
- Agent 7: Business logic - 4 critical (answer leakage, no deadline enforcement, fake rank), 6 high
- Agent 8: Frontend audit - 5 critical (silent error swallowing, missing table scroll, N+1 queries)
- Fixed SEC-01/02: Assignment answer leakage - added stripAnswersForStudent + school scope
- Fixed SEC-03: ORANG_TUA scores AND→OR bug - now only checks parentId
- Fixed SEC-04: Questions cross-school leakage - added getSchoolFilter
- Fixed SEC-05/06/07/08/09/10: School scope on assignments POST/PATCH/DELETE, materials, journals, timetable, classes
- Fixed SEC-11: Analytics global type restricted to SUPER_ADMIN
- Fixed SEC-12: Analytics monthly growth now queries real DB data
- Fixed BUG-01: Scores class rank now uses real percentile ranking
- Fixed BUG-02: ortu-new-views catch block toast.success→toast.error
- Lint passes clean, server compiles successfully

Stage Summary:
- 10 critical security bugs fixed across 8 files
- 14 remaining issues documented in audit report (P0-P4 priority)
- Overall health: 47/100 → needs P0 remaining fixes for production
