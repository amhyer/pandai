import { create } from 'zustand';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN_SCHOOL' | 'GURU' | 'SISWA' | 'ORANG_TUA' | 'KEPALA_SEKOLAH';

// ===== ViewType — semua halaman yang tersedia di sidebar dan content =====
export type ViewType =
  // Public
  | 'landing'
  | 'login'
  | 'register'

  // ── Dashboard (per role) ──
  | 'dashboard'

  // ── SUPER_ADMIN ──
  | 'schools'
  | 'school-detail'
  | 'users-global'
  | 'questions-global'
  | 'reports-global'
  | 'analytics-global'
  | 'settings'

  // ── ADMIN_SCHOOL ──
  | 'classes'
  | 'subjects'
  | 'users'
  | 'accounts'
  | 'questions'
  | 'question-editor'
  | 'exams'
  | 'exam-assignments'
  | 'results'
  | 'analytics'
  | 'reports'
  | 'teacher-assignments'
  | 'timetable'
  | 'wali-kelas'
  | 'import-csv'
  | 'dapodik-sync'
  | 'settings'
  | 'backup-restore'
  | 'activity-log'

  // ── GURU ──
  | 'guru-materi'
  | 'guru-bank-soal'
  | 'guru-soal'
  | 'guru-tugas'
  | 'guru-kehadiran'
  | 'guru-rekap-kehadiran'
  | 'guru-karakter'
  | 'guru-rekap-karakter'
  | 'guru-jurnal'
  | 'guru-tryout'
  | 'guru-nilai'
  | 'guru-analisis'
  | 'guru-laporan'
  | 'guru-pandai-ai'
  | 'guru-kotak-masukan'
  | 'guru-profil-lulusan'
  | 'guru-komponen-nilai'
  | 'guru-rapor'

  // ── SISWA ──
  | 'siswa-materi'
  | 'siswa-tugas'
  | 'siswa-tryout'
  | 'siswa-riwayat'
  | 'siswa-nilai'
  | 'siswa-kehadiran'
  | 'siswa-pandai-ai'
  | 'siswa-nilai-akhir'
  | 'siswa-rapor'
  | 'diagnostic'
  | 'practice'
  | 'exam-runner'
  | 'leaderboard'

  // ── ORANG_TUA ──
  | 'ortu-karakter'
  | 'ortu-rekap-karakter'
  | 'ortu-nilai'
  | 'ortu-materi'
  | 'ortu-kehadiran'
  | 'ortu-kuis'
  | 'ortu-laporan'
  | 'ortu-kotak-masukan'
  | 'ortu-profil-lulusan'
  | 'ortu-nilai-akhir'
  | 'ortu-rapor'

  // ── KEPALA_SEKOLAH ──
  | 'dashboard-kepsek'
  | 'kepsek-peta-kelas' // Peta Kelas (P1-2)
  | 'kepsek-rekap-kelas'
  | 'kepsek-rekap-guru'
  | 'kepsek-rekap-karakter'
  | 'kepsek-kotak-masukan'
  | 'kepsek-profil-lulusan'
  | 'kepsek-rapor'

  // ── Shared ──
  | 'profile'
  | 'notifications'
  | 'broadcasts';

export interface User {
  id: string;
  username?: string;
  email?: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  nisn?: string;
  nip?: string;
  nik?: string;
  namaOrtu?: string;
  jk?: string;
  parentId?: string;
  schoolId?: string;
  schoolName?: string;
  schoolType?: string | null;
  classId?: string;
  className?: string;
  isActive: boolean;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentView: ViewType;
  selectedSchoolId: string | null;
  selectedExamId: string | null;
  selectedAttemptId: string | null;
  selectedQuestionId: string | null;
  sidebarOpen: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setCurrentView: (view: ViewType) => void;
  setSelectedSchoolId: (id: string | null) => void;
  setSelectedExamId: (id: string | null) => void;
  setSelectedAttemptId: (id: string | null) => void;
  setSelectedQuestionId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  navigateTo: (view: ViewType) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  currentView: 'landing',
  selectedSchoolId: null,
  selectedExamId: null,
  selectedAttemptId: null,
  selectedQuestionId: null,
  sidebarOpen: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pandai_view');
    }
    set({ user: null, isAuthenticated: false, currentView: 'landing' });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setCurrentView: (currentView) => set({ currentView }),
  setSelectedSchoolId: (selectedSchoolId) => set({ selectedSchoolId }),
  setSelectedExamId: (selectedExamId) => set({ selectedExamId }),
  setSelectedAttemptId: (selectedAttemptId) => set({ selectedAttemptId }),
  setSelectedQuestionId: (selectedQuestionId) => set({ selectedQuestionId }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  navigateTo: (view) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pandai_view', view);
    }
    set({ currentView: view });
  },
}));
