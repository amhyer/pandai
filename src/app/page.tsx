'use client';

import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/use-store';

// Lazy load all components to avoid Turbopack compilation crash
const LandingPage = dynamic(() => import('@/components/landing/landing-page'), { ssr: false });
const LoginForm = dynamic(() => import('@/components/auth/login-form').then(m => ({ default: m.LoginForm })), { ssr: false });
const RegisterForm = dynamic(() => import('@/components/auth/register-form').then(m => ({ default: m.RegisterForm })), { ssr: false });
const AppLayout = dynamic(() => import('@/components/layout/app-layout'), { ssr: false });

const SuperAdminDashboard = dynamic(() => import('@/components/dashboard/super-admin/super-admin-dashboard').then(m => ({ default: m.SuperAdminDashboard })), { ssr: false });
const AdminSekolahDashboard = dynamic(() => import('@/components/dashboard/admin-sekolah/admin-sekolah-dashboard').then(m => ({ default: m.AdminSekolahDashboard })), { ssr: false });
const GuruDashboard = dynamic(() => import('@/components/dashboard/guru/guru-dashboard').then(m => ({ default: m.GuruDashboard })), { ssr: false });
const SiswaDashboard = dynamic(() => import('@/components/dashboard/siswa/siswa-dashboard').then(m => ({ default: m.SiswaDashboard })), { ssr: false });
const SchoolManager = dynamic(() => import('@/components/dashboard/super-admin/school-manager').then(m => ({ default: m.SchoolManager })), { ssr: false });

const QuestionBank = dynamic(() => import('@/components/question/question-bank').then(m => ({ default: m.QuestionBank })), { ssr: false });
const QuestionEditor = dynamic(() => import('@/components/question/question-editor').then(m => ({ default: m.QuestionEditor })), { ssr: false });

const ExamManager = dynamic(() => import('@/components/exam/exam-manager').then(m => ({ default: m.ExamManager })), { ssr: false });
const ExamRunner = dynamic(() => import('@/components/exam/exam-runner').then(m => ({ default: m.ExamRunner })), { ssr: false });
const ResultsView = dynamic(() => import('@/components/exam/results-view').then(m => ({ default: m.ResultsView })), { ssr: false });

const AnalyticsView = dynamic(() => import('@/components/analytics/analytics-view').then(m => ({ default: m.AnalyticsView })), { ssr: false });
const UserManager = dynamic(() => import('@/components/dashboard/admin-sekolah/user-manager').then(m => ({ default: m.UserManager })), { ssr: false });
const ClassManager = dynamic(() => import('@/components/dashboard/admin-sekolah/class-manager').then(m => ({ default: m.ClassManager })), { ssr: false });
const ReportsView = dynamic(() => import('@/components/analytics/reports-view').then(m => ({ default: m.ReportsView })), { ssr: false });

export default function Home() {
  const { currentView, user, isAuthenticated } = useAppStore();

  // Public views
  if (currentView === 'landing') return <LandingPage />;
  if (currentView === 'login') return <LoginForm />;
  if (currentView === 'register') return <RegisterForm />;

  // Protected views - wrap in AppLayout
  if (!isAuthenticated || !user) return <LandingPage />;

  // Render content based on current view
  const renderContent = () => {
    switch (currentView) {
      // Dashboards (role-based)
      case 'dashboard':
        switch (user.role) {
          case 'SUPER_ADMIN': return <SuperAdminDashboard />;
          case 'ADMIN_SCHOOL': return <AdminSekolahDashboard />;
          case 'GURU': return <GuruDashboard />;
          case 'SISWA': return <SiswaDashboard />;
          default: return <SiswaDashboard />;
        }

      // Super Admin views
      case 'schools': return user.role === 'SUPER_ADMIN' ? <SchoolManager /> : <AdminSekolahDashboard />;

      // Common views
      case 'users': return <UserManager />;
      case 'classes': return <ClassManager />;
      case 'questions': return <QuestionBank />;
      case 'question-editor': return <QuestionEditor />;
      case 'exams': return <ExamManager />;
      case 'exam-runner': return <ExamRunner />;
      case 'results': return <ResultsView />;
      case 'analytics': return <AnalyticsView />;
      case 'reports': return <ReportsView />;
      case 'leaderboard': return <SiswaDashboard />;

      // Student-specific
      case 'diagnostic': return <SiswaDashboard />;
      case 'practice': return <SiswaDashboard />;

      // Default
      case 'profile':
      case 'settings':
      default:
        return <div className="flex items-center justify-center h-96"><p className="text-muted-foreground">Halaman {currentView} dalam pengembangan</p></div>;
    }
  };

  return <AppLayout>{renderContent()}</AppLayout>;
}
