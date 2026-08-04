import { create } from 'zustand';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN_SCHOOL' | 'GURU' | 'SISWA' | 'ORANG_TUA';

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
  | 'classes'              // Rombel (Kelas)
  | 'subjects'             // Mata Pelajaran
  | 'users'                // Data Siswa
  | 'teacher-assignments'   // Penugasan Guru
  | 'timetable'            // Jadwal Pelajaran
  | 'wali-kelas'            // Wali Kelas
  | 'import-csv'            // Import Data
  | 'dapodik-sync'          // Tarik Data Dapodik
  | 'settings'             // Pengaturan Aplikasi
  | 'backup-restore'        // Cadangkan & Pulihkan
  | 'activity-log'         // Log Aktivitas

  // ── GURU ──
  | 'guru-materi'          // Materi Pelajaran
  | 'guru-tugas'           // Tugas, Kuis & Ujian
  | 'guru-kehadiran'        // Kehadiran Siswa
  | 'guru-rekap-kehadiran'  // Rekap Kehadiran
  | 'guru-karakter'        // Isi Laporan 7 Kebiasaan
  | 'guru-rekap-karakter'  // Rekap 7 Kebiasaan
  | 'guru-jurnal'          // Jurnal Mengajar
  | 'guru-nilai'           // Input Nilai
  | 'guru-analisis'        // Analisis Hasil Belajar
  | 'guru-laporan'         // Laporan Siswa
  | 'guru-pandai-ai'       // PANDAI AI (Asisten AI)

  // ── SISWA ──
  | 'siswa-materi'         // Materi Pelajaran
  | 'siswa-tugas'          // Tugas & Ujian
  | 'siswa-riwayat'        // Riwayat Pengerjaan
  | 'siswa-nilai'          // Nilai Saya
  | 'siswa-kehadiran'      // Kehadiran Saya
  | 'siswa-pandai-ai'      // PANDAI AI

  // ── ORANG_TUA ──
  | 'ortu-karakter'        // Isi Laporan Harian (7 Kebiasaan)
  | 'ortu-rekap-karakter'  // Rekap & Analisis (7 Kebiasaan)
  | 'ortu-nilai'           // Nilai & Progres
  | 'ortu-materi'          // Materi Pelajaran
  | 'ortu-kehadiran'       // Kehadiran
  | 'ortu-kuis'            // Riwayat Pengerjaan
  | 'ortu-laporan'         // Laporan Cetak

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

