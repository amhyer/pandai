Task ID: 24-4
Agent: Main
Task: Rebuild SiswaTugasView — Complete Assignment Student UI

Work Log:
- Updated `Task` interface to match Assignment API data model (id, title, description, submissionType, subjectName, className, deadline, status, studentStatus, questionCount, score, maxScore, feedback)
- Added new interfaces: `SubmissionStatus`, `AssignmentDetail`, `AssignmentQuestionDetail`
- Updated `MOCK_TASKS` constant to use new data model (fallback only)
- Added imports: `fetchWithAuth`, `Dialog`, `AlertDialog`, `Textarea`, `RadioGroup`, `useRef`
- Completely rewrote `SiswaTugasView` (line 748) with full functionality:
  - **List assignments**: Fetches from `GET /api/assignments` using `fetchWithAuth`, then for each assignment fetches submission status from `GET /api/assignments/[id]/submissions`
  - **Cards**: Display title, subject name, deadline countdown, submission type badge (Pilihan Ganda/Esai/Campuran), student status (Menunggu/Dikerjakan/Terkumpul/Dinilai), score if graded
  - **Stats**: 5 stat cards (Total, Menunggu, Dikerjakan, Terkumpul, Dinilai) with responsive grid
  - **Filters**: Search by title/subject, status pill filter
  - **Active "Mulai" button**: When studentStatus is 'belum_dikerjakan' — opens Assignment Working Screen dialog
  - **Active "Lanjut" button**: When studentStatus is 'dikerjakan' — reopens Working Screen with pre-filled answers
  - **Active "Lihat Hasil" button**: When studentStatus is 'dinilai' — opens Result Dialog with score, feedback, per-question results
  - **Assignment Working Screen**: Large Dialog (max-w-4xl, max-h-90vh) with:
    - Assignment header with title, description, instructions, deadline countdown, urgency badges
    - Questions list with PG radio buttons (styled as clickable cards with border highlight) and essay textareas (min-h-32)
    - Auto-save every 30 seconds via `setInterval` with `useRef` and cleanup on unmount
    - Manual "Simpan Draft" button
    - "Kumpulkan" button with AlertDialog confirmation (shows answered/total count)
    - Close button (X) with unsaved changes warning via AlertDialog
    - Pre-fills existing answers from submission data
  - **Result Dialog**: Shows score circle (green/red), score/maxScore, feedback from guru, per-question results with correct/wrong indicators for PG
- Status badge colors: Menunggu=amber, Dikerjakan=blue, Terkumpul=emerald, Dinilai=green
- Urgency badges: overdue=red, today=amber, soon=orange, future=emerald
- Fallback to MOCK_TASKS if API fails completely
- Lint passes with no errors
- Dev server compiles successfully

Stage Summary:
- 1 file modified: `src/components/views/siswa-new-views.tsx`
- Task interface updated to match Assignment API model
- MOCK_TASKS updated as fallback data
- 3 new interfaces added (SubmissionStatus, AssignmentDetail, AssignmentQuestionDetail)
- SiswaTugasView completely rewritten (~450 lines) with:
  - Real API integration (fetchWithAuth)
  - Assignment Working Screen (Dialog with PG/Essay questions, auto-save, submit)
  - Result Dialog (score, feedback, per-question results)
  - AlertDialog for submit confirmation and unsaved changes warning
  - Search + status filter
  - 5 stat cards
  - Responsive design
- No other functions in the file were modified
- No new route files created
- No imports from next/link
