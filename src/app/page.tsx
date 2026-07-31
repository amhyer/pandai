'use client';

import { useAppStore } from '@/store/use-store';
import LandingPage from '@/components/landing/landing-page';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import AppLayout from '@/components/layout/app-layout';
import { SuperAdminDashboard } from '@/components/dashboard/super-admin/super-admin-dashboard';
import { AdminSekolahDashboard } from '@/components/dashboard/admin-sekolah/admin-sekolah-dashboard';
import { GuruDashboard } from '@/components/dashboard/guru/guru-dashboard';
import { SiswaDashboard } from '@/components/dashboard/siswa/siswa-dashboard';
import { SchoolManager } from '@/components/dashboard/super-admin/school-manager';
import { QuestionBank } from '@/components/question/question-bank';
import { QuestionEditor } from '@/components/question/question-editor';
import { ExamManager } from '@/components/exam/exam-manager';
import { ExamRunner } from '@/components/exam/exam-runner';
import { ResultsView } from '@/components/exam/results-view';
import { AnalyticsView } from '@/components/analytics/analytics-view';
import { UserManager } from '@/components/dashboard/admin-sekolah/user-manager';
import { ClassManager } from '@/components/dashboard/admin-sekolah/class-manager';
import { ReportsView } from '@/components/analytics/reports-view';

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
