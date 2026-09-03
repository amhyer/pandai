import type { ViewType, UserRole } from '@/store/use-store';

/**
 * Route-per-feature migration map.
 *
 * Keeps URL routes and the legacy Zustand `currentView` in sync:
 *  - `getRoleRoute(role, view)` returns an App Router path when the feature
 *    has already been migrated to a real route.
 *  - `getAdminSchoolView(feature)` maps a URL segment to its `currentView`
 *    so a server/dynamic route page can decide which view to render.
 */

const ADMIN_SCHOOL_ROUTES: Partial<Record<ViewType, string>> = {
  dashboard: '/admin-school',
  accounts: '/admin-school/accounts',
  classes: '/admin-school/classes',
  subjects: '/admin-school/subjects',
  'teacher-assignments': '/admin-school/teacher-assignments',
  timetable: '/admin-school/timetable',
  'wali-kelas': '/admin-school/wali-kelas',
  'import-csv': '/admin-school/import-csv',
  'dapodik-sync': '/admin-school/dapodik-sync',
  settings: '/admin-school/settings',
  'backup-restore': '/admin-school/backup-restore',
  'activity-log': '/admin-school/activity-log',
  questions: '/admin-school/questions',
  'question-editor': '/admin-school/question-editor',
  exams: '/admin-school/exams',
  'exam-assignments': '/admin-school/exam-assignments',
  results: '/admin-school/results',
  analytics: '/admin-school/analytics',
  reports: '/admin-school/reports',
};

// Canonical URL segment -> currentView mapping used by route pages.
export const ADMIN_SCHOOL_FEATURES: Record<string, ViewType> = {
  accounts: 'accounts',
  classes: 'classes',
  subjects: 'subjects',
  'teacher-assignments': 'teacher-assignments',
  timetable: 'timetable',
  'wali-kelas': 'wali-kelas',
  'import-csv': 'import-csv',
  'dapodik-sync': 'dapodik-sync',
  settings: 'settings',
  'backup-restore': 'backup-restore',
  'activity-log': 'activity-log',
  questions: 'questions',
  'question-editor': 'question-editor',
  exams: 'exams',
  'exam-assignments': 'exam-assignments',
  results: 'results',
  analytics: 'analytics',
  reports: 'reports',
};

export function getRoleRoute(role: UserRole | undefined, view: ViewType): string | null {
  if (role === 'ADMIN_SCHOOL') {
    return ADMIN_SCHOOL_ROUTES[view] ?? null;
  }
  return null;
}

export function getAdminSchoolView(feature: string): ViewType | null {
  return ADMIN_SCHOOL_FEATURES[feature] ?? null;
}
