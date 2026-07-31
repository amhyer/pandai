# Task 8-e: ExamManager, ExamRunner & ResultsView

## Status: Completed

## Files Created
1. `src/components/exam/exam-manager.tsx` - Exam session management + student tryout list
2. `src/components/exam/exam-runner.tsx` - Core quiz-taking interface with timer
3. `src/components/exam/results-view.tsx` - Results review with charts and detailed analysis
4. `src/app/api/classes/route.ts` - Classes API endpoint (needed by exam-manager)

## Key Design Decisions
- ExamRunner uses `-m-6` negative margin to fill full content area (bypassing AppLayout padding)
- Timer auto-submits at 0 with inline async logic (not calling handleSubmit to avoid stale closure issues)
- Tab switch detection uses visibilitychange API with 30s cooldown
- Results view uses CSS conic-gradient for donut chart (no chart library dependency)
- All lint errors resolved (set-state-in-effect rule compliance)

## API Integration
- ExamManager: GET /api/exams?type=session, POST /api/exams (create-session), DELETE /api/exams?type=session, GET /api/classes
- ExamRunner: GET /api/questions?global=true&status=published, POST /api/attempts
- ResultsView: GET /api/attempts?userId={user.id}

## Exports
- `ExamManager` from exam-manager.tsx
- `ExamRunner` from exam-runner.tsx  
- `ResultsView` from results-view.tsx
