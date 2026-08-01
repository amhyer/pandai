import { create } from 'zustand';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN_SCHOOL' | 'GURU' | 'SISWA';

// ===== ViewType — semua halaman yang tersedia di sidebar dan content =====
export type ViewType =
  // Public
  | 'landing'
  | 'login'
  | 'register'

  // ── Dashboard (per role) ──
  | 'dashboard'

  // ── SUPER_ADMIN ──
  | 'schools'              // Kelola Sekolah
  | 'school-detail'        // Detail Sekolah (sub)
  | 'users-global'         // Semua Pengguna lintas sekolah
  | 'questions-global'     // Bank Soal Global (NALAR)
  | 'reports-global'       // Laporan Global
  | 'analytics-global'     // Analitik lintas sekolah
  | 'settings'             // Pengaturan Aplikasi

  // ── ADMIN_SCHOOL ──
  | 'users'                // Guru & Siswa
  | 'classes'              // Rombel (Kelas)
  | 'questions'            // Bank Soal Sekolah
  | 'question-editor'      // Buat/Edit Soal (sub)
  | 'exams'                // Tryout & Ujian
  | 'exam-editor'          // Editor Paket Tryout (sub)
  | 'exam-assignments'     // Jadwal & Penugasan Tryout
  | 'results'              // Hasil & Nilai
  | 'result-detail'        // Detail Hasil (sub)
  | 'analytics'            // Analisis Butir Soal
  | 'reports'              // Laporan Cetak

  // ── GURU ──
  | 'guru-materi'          // Materi Ajar
  | 'guru-soal'            // Bank Soal (sub scope guru)
  | 'guru-tryout'          // Kelola Tryout
  | 'guru-nilai'           // Input & Kelola Nilai
  | 'guru-analisis'        // Analisis Hasil Belajar
  | 'guru-laporan'         // Laporan Siswa

  // ── SISWA ──
  | 'diagnostic'           // Diagnostic Test (tes awal)
  | 'practice'             // Latihan Adaptif
  | 'exam-runner'          // Kerjakan Tryout
  | 'siswa-nilai'          // Nilai Saya
  | 'siswa-riwayat'        // Riwayat Pengerjaan
  | 'leaderboard'          // Peringkat

  // ── Shared ──
  | 'profile'
  | 'notifications'
  | 'broadcasts';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  schoolId?: string;
  schoolName?: string;
  classId?: string;
  className?: string;
  isActive: boolean;
}

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Navigation
  currentView: ViewType;
  selectedSchoolId: string | null;
  selectedExamId: string | null;
  selectedAttemptId: string | null;
  selectedQuestionId: string | null;

  // UI
  sidebarOpen: boolean;

  // Actions
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
  // Auth
  user: null,
  isAuthenticated: false,
  isLoading: false,

  // Navigation
  currentView: 'landing',
  selectedSchoolId: null,
  selectedExamId: null,
  selectedAttemptId: null,
  selectedQuestionId: null,

  // UI
  sidebarOpen: true,

  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false, currentView: 'landing' }),
  setLoading: (isLoading) => set({ isLoading }),
  setCurrentView: (currentView) => set({ currentView }),
  setSelectedSchoolId: (selectedSchoolId) => set({ selectedSchoolId }),
  setSelectedExamId: (selectedExamId) => set({ selectedExamId }),
  setSelectedAttemptId: (selectedAttemptId) => set({ selectedAttemptId }),
  setSelectedQuestionId: (selectedQuestionId) => set({ selectedQuestionId }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  navigateTo: (view) => set({ currentView: view }),
}));
