---
Task ID: 9
Agent: Full-Stack Dev (Tryout Builder)
Task: Activate GuruTryoutView with wizard step-by-step

Files Created:
- src/app/api/exam-items/route.ts (NEW)

Files Modified:
- src/components/views/guru-views.tsx (REWRITTEN GuruTryoutView section + added types/imports)

Files NOT Modified (as required):
- authenticated-app.tsx, use-store.ts, app-layout.tsx, guru-dashboard.tsx, GuruSoalView

Summary of Changes:
1. Created /api/exam-items/route.ts with 4 HTTP handlers:
   - GET: Fetch items for a package (with question+subject includes)
   - POST: Batch add questions to package (auto-updates totalQuestions)
   - DELETE: Remove question from package (auto-updates totalQuestions)
   - PATCH: Update orderNum/points for a question in package

2. Rewrote GuruTryoutView with real API data and 5-step wizard:
   - Main list fetches packages + sessions, shows tabs by status
   - Step 1: Create package (title, description, duration)
   - Step 2: Add questions via Bank Soal / AI Generate / Manual Input
   - Step 3: Arrange order, edit points, toggle shuffle
   - Step 4: Save draft or create scheduled session with class selection
   - Step 5: Preview student view, publish (status: draft → scheduled)

3. Added helper components: WizardProgressBar, Step1-5 sub-components, useApi hook
4. Added type interfaces: ExamSessionData, ExamItemData, QuestionData, ClassData
5. Lint: CLEAN, Dev server: RUNNING
