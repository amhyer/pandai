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

const SUPER_ADMIN_ROUTES: Partial<Record<ViewType, string>> = {
  dashboard: '/accounts',
  schools: '/accounts/schools',
  'school-detail': '/accounts/schools',
  'users-global': '/accounts/users',
  'questions-global': '/accounts/questions',
  'analytics-global': '/accounts/analytics',
  'reports-global': '/accounts/reports',
  settings: '/accounts/settings',
  profile: '/accounts/profile',
  notifications: '/accounts/notifications',
  broadcasts: '/accounts/broadcasts',
};

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
  profile: '/admin-school/profile',
  notifications: '/admin-school/notifications',
  broadcasts: '/admin-school/broadcasts',
};

const GURU_ROUTES: Partial<Record<ViewType, string>> = {
  dashboard: '/guru',
  'guru-materi': '/guru/materi',
  'guru-bank-soal': '/guru/bank-soal',
  'guru-tugas': '/guru/tugas',
  'guru-tryout': '/guru/tryout',
  'guru-kehadiran': '/guru/kehadiran',
  'guru-rekap-kehadiran': '/guru/rekap-kehadiran',
  'guru-karakter': '/guru/karakter',
  'guru-rekap-karakter': '/guru/rekap-karakter',
  'guru-jurnal': '/guru/jurnal',
  'guru-nilai': '/guru/nilai',
  'guru-analisis': '/guru/analisis',
  'guru-laporan': '/guru/laporan',
  'guru-pandai-ai': '/guru/pandai-ai',
  'guru-kotak-masukan': '/guru/kotak-masukan',
  'guru-profil-lulusan': '/guru/profil-lulusan',
  'guru-komponen-nilai': '/guru/komponen-nilai',
  'guru-rapor': '/guru/rapor',
  settings: '/guru/settings',
  profile: '/guru/profile',
  notifications: '/guru/notifications',
  broadcasts: '/guru/broadcasts',
};

const SISWA_ROUTES: Partial<Record<ViewType, string>> = {
  dashboard: '/siswa',
  'siswa-materi': '/siswa/materi',
  'siswa-tugas': '/siswa/tugas',
  'siswa-tryout': '/siswa/tryout',
  'siswa-riwayat': '/siswa/riwayat',
  'siswa-nilai': '/siswa/nilai',
  'siswa-kehadiran': '/siswa/kehadiran',
  'siswa-pandai-ai': '/siswa/pandai-ai',
  'siswa-nilai-akhir': '/siswa/nilai-akhir',
  'siswa-rapor': '/siswa/rapor',
  diagnostic: '/siswa/diagnostic',
  practice: '/siswa/practice',
  'exam-runner': '/siswa/exam-runner',
  leaderboard: '/siswa/leaderboard',
  settings: '/siswa/settings',
  profile: '/siswa/profile',
  notifications: '/siswa/notifications',
  broadcasts: '/siswa/broadcasts',
};

const ORANG_TUA_ROUTES: Partial<Record<ViewType, string>> = {
  dashboard: '/ortu',
  'ortu-karakter': '/ortu/karakter',
  'ortu-rekap-karakter': '/ortu/rekap-karakter',
  'ortu-nilai': '/ortu/nilai',
  'ortu-materi': '/ortu/materi',
  'ortu-kehadiran': '/ortu/kehadiran',
  'ortu-kuis': '/ortu/kuis',
  'ortu-laporan': '/ortu/laporan',
  'ortu-kotak-masukan': '/ortu/kotak-masukan',
  'ortu-profil-lulusan': '/ortu/profil-lulusan',
  'ortu-nilai-akhir': '/ortu/nilai-akhir',
  'ortu-rapor': '/ortu/rapor',
  settings: '/ortu/settings',
  profile: '/ortu/profile',
  notifications: '/ortu/notifications',
  broadcasts: '/ortu/broadcasts',
};

const KEPALA_SEKOLAH_ROUTES: Partial<Record<ViewType, string>> = {
  dashboard: '/kepala-sekolah',
  'dashboard-kepsek': '/kepala-sekolah/dashboard',
  'kepsek-peta-kelas': '/kepala-sekolah/peta-kelas',
  'kepsek-rekap-kelas': '/kepala-sekolah/rekap-kelas',
  'kepsek-rekap-guru': '/kepala-sekolah/rekap-guru',
  'kepsek-rekap-karakter': '/kepala-sekolah/rekap-karakter',
  'kepsek-kotak-masukan': '/kepala-sekolah/kotak-masukan',
  'kepsek-profil-lulusan': '/kepala-sekolah/profil-lulusan',
  'kepsek-rapor': '/kepala-sekolah/rapor',
  settings: '/kepala-sekolah/settings',
  profile: '/kepala-sekolah/profile',
  notifications: '/kepala-sekolah/notifications',
  broadcasts: '/kepala-sekolah/broadcasts',
};

// Canonical URL segment -> currentView mapping used by route pages.
export const SUPER_ADMIN_FEATURES: Record<string, ViewType> = {
  dashboard: 'dashboard',
  schools: 'schools',
  users: 'users-global',
  questions: 'questions-global',
  analytics: 'analytics-global',
  reports: 'reports-global',
  settings: 'settings',
  profile: 'profile',
  notifications: 'notifications',
  broadcasts: 'broadcasts',
};

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
  profile: 'profile',
  notifications: 'notifications',
  broadcasts: 'broadcasts',
};

export const GURU_FEATURES: Record<string, ViewType> = {
  materi: 'guru-materi',
  'bank-soal': 'guru-bank-soal',
  tugas: 'guru-tugas',
  tryout: 'guru-tryout',
  kehadiran: 'guru-kehadiran',
  'rekap-kehadiran': 'guru-rekap-kehadiran',
  karakter: 'guru-karakter',
  'rekap-karakter': 'guru-rekap-karakter',
  jurnal: 'guru-jurnal',
  nilai: 'guru-nilai',
  analisis: 'guru-analisis',
  laporan: 'guru-laporan',
  'pandai-ai': 'guru-pandai-ai',
  'kotak-masukan': 'guru-kotak-masukan',
  'profil-lulusan': 'guru-profil-lulusan',
  'komponen-nilai': 'guru-komponen-nilai',
  rapor: 'guru-rapor',
  settings: 'settings',
  profile: 'profile',
  notifications: 'notifications',
  broadcasts: 'broadcasts',
};

export const SISWA_FEATURES: Record<string, ViewType> = {
  materi: 'siswa-materi',
  tugas: 'siswa-tugas',
  tryout: 'siswa-tryout',
  riwayat: 'siswa-riwayat',
  nilai: 'siswa-nilai',
  kehadiran: 'siswa-kehadiran',
  'pandai-ai': 'siswa-pandai-ai',
  'nilai-akhir': 'siswa-nilai-akhir',
  rapor: 'siswa-rapor',
  diagnostic: 'diagnostic',
  practice: 'practice',
  'exam-runner': 'exam-runner',
  leaderboard: 'leaderboard',
  settings: 'settings',
  profile: 'profile',
  notifications: 'notifications',
  broadcasts: 'broadcasts',
};

export const ORANG_TUA_FEATURES: Record<string, ViewType> = {
  karakter: 'ortu-karakter',
  'rekap-karakter': 'ortu-rekap-karakter',
  nilai: 'ortu-nilai',
  materi: 'ortu-materi',
  kehadiran: 'ortu-kehadiran',
  kuis: 'ortu-kuis',
  laporan: 'ortu-laporan',
  'kotak-masukan': 'ortu-kotak-masukan',
  'profil-lulusan': 'ortu-profil-lulusan',
  'nilai-akhir': 'ortu-nilai-akhir',
  rapor: 'ortu-rapor',
  settings: 'settings',
  profile: 'profile',
  notifications: 'notifications',
  broadcasts: 'broadcasts',
};

export const KEPALA_SEKOLAH_FEATURES: Record<string, ViewType> = {
  dashboard: 'dashboard-kepsek',
  'peta-kelas': 'kepsek-peta-kelas',
  'rekap-kelas': 'kepsek-rekap-kelas',
  'rekap-guru': 'kepsek-rekap-guru',
  'rekap-karakter': 'kepsek-rekap-karakter',
  'kotak-masukan': 'kepsek-kotak-masukan',
  'profil-lulusan': 'kepsek-profil-lulusan',
  rapor: 'kepsek-rapor',
  settings: 'settings',
  profile: 'profile',
  notifications: 'notifications',
  broadcasts: 'broadcasts',
};

export function getRoleRoute(role: UserRole | undefined, view: ViewType): string | null {
  if (role === 'SUPER_ADMIN') {
    return SUPER_ADMIN_ROUTES[view] ?? null;
  }
  if (role === 'ADMIN_SCHOOL') {
    return ADMIN_SCHOOL_ROUTES[view] ?? null;
  }
  if (role === 'GURU') {
    return GURU_ROUTES[view] ?? null;
  }
  if (role === 'SISWA') {
    return SISWA_ROUTES[view] ?? null;
  }
  if (role === 'ORANG_TUA') {
    return ORANG_TUA_ROUTES[view] ?? null;
  }
  if (role === 'KEPALA_SEKOLAH') {
    return KEPALA_SEKOLAH_ROUTES[view] ?? null;
  }
  return null;
}

export function getSuperAdminView(feature: string): ViewType | null {
  return SUPER_ADMIN_FEATURES[feature] ?? null;
}

export function getAdminSchoolView(feature: string): ViewType | null {
  return ADMIN_SCHOOL_FEATURES[feature] ?? null;
}

export function getGuruView(feature: string): ViewType | null {
  return GURU_FEATURES[feature] ?? null;
}

export function getSiswaView(feature: string): ViewType | null {
  return SISWA_FEATURES[feature] ?? null;
}

export function getOrtuView(feature: string): ViewType | null {
  return ORANG_TUA_FEATURES[feature] ?? null;
}

export function getKepalaSekolahView(feature: string): ViewType | null {
  return KEPALA_SEKOLAH_FEATURES[feature] ?? null;
}
