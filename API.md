# PANDAI API Documentation

> Auto-generated from route files. All responses are JSON unless noted.

---

## Auth

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/api/auth/login` | No | — | Login with username/email + password; sets httpOnly JWT cookie |
| POST | `/api/auth/logout` | No | — | Clear session cookie |
| POST | `/api/auth/register` | No | — | Self-register (SISWA, ORANG_TUA only); optional schoolCode |
| POST | `/api/auth/register-school` | No | — | Register new school + ADMIN_SCHOOL account |

---

## Schools

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/schools` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | List all schools (non-deleted) |
| POST | `/api/schools` | Yes | SUPER_ADMIN | Create school + subscription |
| PATCH | `/api/schools` | Yes | SUPER_ADMIN | Update school by ID in body |
| DELETE | `/api/schools` | Yes | SUPER_ADMIN | Soft-delete school (status=deleted) |
| GET | `/api/schools/lookup` | No | — | Lookup school by NPSN or name (Dapodik live + local DB) |

---

## Users

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/users` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | List users; filters: schoolId, role, classId, parentId |
| POST | `/api/users` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | Create user (GURU, SISWA, etc.); auto-creates ORANG_TUA for SISWA |
| PATCH | `/api/users` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | Update user fields by ID |
| PUT | `/api/users` | Yes | Any authenticated | Profile self-update (name, email, phone) |
| DELETE | `/api/users` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | Soft-delete user (isActive=false) |

---

## Classes

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/classes` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH | List classes; filters: schoolId, grade |
| PUT | `/api/classes` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | Update class (waliKelasId, name, grade, academicYear) |

---

## Subjects

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/subjects` | Yes | Any authenticated | List all subjects |
| POST | `/api/subjects` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | Create subject (name, code, type, sortOrder) |
| PATCH | `/api/subjects` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | Update subject by ID |
| DELETE | `/api/subjects` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | Delete subject by ID |

---

## Materials

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/materials` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | List materials; filters: schoolId, teacherId, classId, subjectId, type, status, isExternal |
| POST | `/api/materials` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Create material (supports external URL/quiz) |
| PATCH | `/api/materials` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Update material by ID |
| DELETE | `/api/materials` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Delete material and its external quiz scores |

---

## Questions

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/questions` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | List questions; filters: schoolId, subjectId, type, status, difficulty, search, global |
| POST | `/api/questions` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Create question (PG, isian, esai) |
| PATCH | `/api/questions` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Update question by ID |
| DELETE | `/api/questions` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Delete question by ID |

---

## Exams

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/exams` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH | List exam packages or sessions (?type=session); filters: schoolId, status |
| POST | `/api/exams` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Create exam package or session (?action=create-session) |
| PATCH | `/api/exams` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Update exam package/session by ID |
| DELETE | `/api/exams` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Delete exam package or session (?type=session) |

---

## Assignments

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/assignments` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | List assignments; filters: schoolId, teacherId, classId, status, studentId |
| POST | `/api/assignments` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Create assignment with optional questionIds |
| PATCH | `/api/assignments` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Update assignment (blocked if submissions exist) |
| DELETE | `/api/assignments` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Delete assignment by ID |
| GET | `/api/assignments/[id]` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | Get single assignment detail |
| POST | `/api/assignments/[id]/questions` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Add questions to assignment (replaceAll option) |
| DELETE | `/api/assignments/[id]/questions` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Remove question from assignment (?questionId) |
| GET | `/api/assignments/[id]/submissions` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | List submissions (all or ?studentId) |
| POST | `/api/assignments/[id]/submissions` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | Submit answers (action: draft/submit); auto-grades PG |
| POST | `/api/assignments/[id]/submissions/remedial` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Activate remedial for a student's submission |
| PATCH | `/api/assignments/[id]/submissions/[studentId]/grade` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Grade essay submission (score, feedback, essayScores) |

---

## Submissions

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/submissions/[id]` | Yes | Any authenticated | Get single submission detail (including remedial) |

---

## Attempts

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/attempts` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, SISWA | List attempts; filters: userId, schoolId, classId, examSessionId |
| POST | `/api/attempts` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH, SISWA | Submit exam attempt; auto-grades PG/isian |
| PATCH | `/api/attempts` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Update attempt (e.g. learningObjective) |
| POST | `/api/attempts/remedial` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Activate remedial attempt for a student |

---

## Scores

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/scores` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, SISWA | Get student score summary; ?studentId required |

---

## Attendance

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/attendance` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, SISWA | List attendance; filters: schoolId, classId, studentId, date, month |
| POST | `/api/attendance` | Yes | GURU | Batch-create attendance records for a class/date |
| PATCH | `/api/attendance` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Update single attendance record |

---

## Character Reports

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/character-reports` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, ORANG_TUA, SISWA | List character reports; filters: schoolId, classId, studentId, date, month |
| POST | `/api/character-reports` | Yes | ORANG_TUA | Create 7-habit character report (batch supported) |
| PATCH | `/api/character-reports` | Yes | ORANG_TUA | Update character report (rating, note) |
| DELETE | `/api/character-reports` | Yes | ORANG_TUA | Delete character report by ID |

---

## Competency Assessments

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/competency-assessments` | Yes | Any authenticated | List/upsert assessments; ?recap=student\|class for aggregated view |
| POST | `/api/competency-assessments` | Yes | GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN | Create or upsert assessment (dimensions: KEIMANAN_KETAKWAAN, KREATIVITAS, etc.) |
| PATCH | `/api/competency-assessments` | Yes | GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN | Update assessment (only assessor or admin) |
| DELETE | `/api/competency-assessments/[id]` | Yes | GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN | Delete assessment (only assessor or admin) |

---

## Grade Components

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/grade-components` | Yes | Any authenticated | List grade components; filters: subjectId, classId, term |
| POST | `/api/grade-components` | Yes | ADMIN_SCHOOL, SUPER_ADMIN | Create grade component (name, weight 0-100, term) |
| PATCH | `/api/grade-components` | Yes | ADMIN_SCHOOL, SUPER_ADMIN | Update grade component |
| DELETE | `/api/grade-components` | Yes | ADMIN_SCHOOL, SUPER_ADMIN | Delete grade component |

---

## Student Grades

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/student-grades` | Yes | Any authenticated | List student grades; filters: studentId, componentId, subjectId, classId, term |
| POST | `/api/student-grades` | Yes | GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN | Create or upsert student grade (source: MANUAL, etc.) |
| PATCH | `/api/student-grades` | Yes | GURU, ADMIN_SCHOOL, KEPALA_SEKOLAH, SUPER_ADMIN | Update student grade (score, note, date) |
| DELETE | `/api/student-grades` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Delete student grade by ID |

---

## Grades / Final

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/grades/final` | Yes | Any authenticated | Calculate final grades (SIMANTAP normalization); ?studentId, ?mode=class, ?term required |

---

## Reports

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/reports/rekap-kelas` | Yes | Any authenticated | Class recap data; ?classId & ?term required |
| GET | `/api/reports/rapor-siswa` | Yes | Any authenticated | Student report card; ?studentId & ?term required; ?format=pdf for PDF |
| GET | `/api/reports/legger` | Yes | Any authenticated | Legger (grade ledger) for class; ?classId & ?term required; ?format=pdf for PDF |

---

## Feedback

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/feedback` | Yes | Any authenticated | List feedback; ORANG_TUA sees own only; filters: status, category |
| POST | `/api/feedback` | Yes | ORANG_TUA, GURU, KEPALA_SEKOLAH, ADMIN_SCHOOL, SUPER_ADMIN | Submit feedback (category: saran/kritik/apresiasi) |
| PATCH | `/api/feedback/[id]` | Yes | GURU, KEPALA_SEKOLAH, ADMIN_SCHOOL, SUPER_ADMIN | Respond to feedback (status, response text) |

---

## Timetable

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/timetable` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH | List timetable entries; filters: schoolId, classId |
| POST | `/api/timetable` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Create timetable slot (day, slotNumber, subjectId, teacherId, classId) |
| PUT | `/api/timetable` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Update timetable slot by ID |
| DELETE | `/api/timetable` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Delete timetable slot by ID |

---

## Teaching Journals

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/teaching-journals` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, KEPALA_SEKOLAH | List journals; filters: schoolId, teacherId, classId, subjectId, month |
| POST | `/api/teaching-journals` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Create teaching journal |
| PATCH | `/api/teaching-journals` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Update journal (topic, activities, notes) |
| DELETE | `/api/teaching-journals` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Delete journal by ID |

---

## Teacher Assignments

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/teacher-assignments` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | List teacher-subject-class assignments; filters: schoolId, teacherId, classId |
| POST | `/api/teacher-assignments` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | Create teacher assignment |
| PATCH | `/api/teacher-assignments` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | Update teacher assignment |
| DELETE | `/api/teacher-assignments` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | Delete teacher assignment by ID |

---

## AI

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/ai/config` | Yes | Any authenticated | Get AI config for school; ?schoolId required |
| PATCH | `/api/ai/config` | Yes | Any authenticated | Update AI rate limits per school |
| GET | `/api/ai/usage` | Yes | Any authenticated | Get AI usage stats; ?userId & ?schoolId required |
| POST | `/api/ai/generate-questions` | Yes | Any authenticated | AI-generate questions (PG) from subject/topic/difficulty; rate-limited |
| POST | `/api/ai/summarize-material` | Yes | Any authenticated | AI-summarize material content; rate-limited |
| POST | `/api/ai/generate-report-desc` | Yes | Any authenticated | AI-generate student report card description; rate-limited |
| PATCH | `/api/ai/review-question` | Yes | Any authenticated | Approve/reject AI-generated question |
| POST | `/api/ai/analyze-difficulty` | Yes | Any authenticated | AI-analyze class difficulty from wrong answers; rate-limited |
| POST | `/api/ai/recommend-questions` | Yes | Any authenticated | AI-recommend practice questions based on weak topics; rate-limited |
| GET | `/api/ai/chatbot` | Yes | Any authenticated | List chatbot sessions; ?userId & ?schoolId required |
| POST | `/api/ai/chatbot` | Yes | Any authenticated | Create session (?action=create_session) or send message (?action=send_message); RAG-enabled |
| DELETE | `/api/ai/chatbot` | Yes | Any authenticated | Delete chatbot session; ?sessionId required |

---

## Analytics

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/analytics` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, KEPALA_SEKOLAH | Dashboard analytics; ?type=dashboard\|student\|global |

---

## Kepsek Dashboard

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/kepsek/dashboard` | Yes | KEPALA_SEKOLAH, ADMIN_SCHOOL, SUPER_ADMIN | Principal dashboard: class recap, teacher recap, habit summary; ?schoolId |

---

## Backup

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/backup` | Yes | SUPER_ADMIN | Get backup info or download DB (?action=download) |
| POST | `/api/backup` | Yes | SUPER_ADMIN | Create SQLite DB backup to disk |

---

## Seed

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/api/seed` | Yes | SUPER_ADMIN | Seed demo data (disabled in production) |

---

## Import

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/api/import/csv` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | Import users from CSV (type: siswa \| guru); multipart/form-data |
| POST | `/api/import/questions` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU | Import questions from .docx file; auto-parses PG/isian/esai |

---

## Dapodik

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/api/dapodik/import` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | Import Dapodik data (pesertaDidik, guru, rombel, mataPelajaran) |
| GET | `/api/dapodik/connector/download` | Yes | Any authenticated | Download Python Dapodik connector script |

---

## Activity Logs

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/activity-logs` | Yes | SUPER_ADMIN, ADMIN_SCHOOL | List activity logs; filters: schoolId, userId, module, category, limit, offset |
| POST | `/api/activity-logs` | Yes | Any authenticated | Create activity log entry |

---

## External Quiz

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api/external-quiz-scores` | Yes | SUPER_ADMIN, ADMIN_SCHOOL, GURU, SISWA | List external quiz scores; filters: materialId, studentId, schoolId, classId |
| POST | `/api/external-quiz-scores` | Yes | Any authenticated | Submit external quiz score (SELF_REPORTED or TEACHER_ENTERED) |
| PATCH | `/api/external-quiz-scores` | Yes | GURU, ADMIN_SCHOOL | Update external quiz score |
| DELETE | `/api/external-quiz-scores` | Yes | GURU, ADMIN_SCHOOL, SUPER_ADMIN | Delete external quiz score by ID |

---

## Misc

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/api` | No | — | Health check / hello world |
