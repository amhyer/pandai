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
