import { create } from 'zustand';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN_SCHOOL' | 'GURU' | 'SISWA';
export type ViewType = 
  | 'landing' 
  | 'login' 
  | 'register'
  | 'dashboard' 
  | 'schools' 
  | 'school-detail'
  | 'users' 
  | 'classes' 
  | 'questions' 
  | 'question-editor' 
  | 'exams' 
  | 'exam-editor'
  | 'exam-runner'
  | 'results' 
  | 'result-detail'
  | 'analytics' 
  | 'leaderboard'
  | 'diagnostic'
  | 'practice'
  | 'profile'
  | 'reports'
  | 'settings'
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
