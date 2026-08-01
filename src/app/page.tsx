'use client';

import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/use-store';

// Lazy load all components to avoid Turbopack compilation crash
const LandingPage = dynamic(() => import('@/components/landing/landing-page'), { ssr: false });
const LoginForm = dynamic(() => import('@/components/auth/login-form').then(m => ({ default: m.LoginForm })), { ssr: false });
const RegisterForm = dynamic(() => import('@/components/auth/register-form').then(m => ({ default: m.RegisterForm })), { ssr: false });
const AppLayout = dynamic(() => import('@/components/layout/app-layout'), { ssr: false });

// Dashboards (per role)
const SuperAdminDashboard = dynamic(() => import('@/components/dashboard/super-admin/super-admin-dashboard').then(m => ({ default: m.SuperAdminDashboard })), { ssr: false });
const AdminSekolahDashboard = dynamic(() => import('@/components/dashboard/admin-sekolah/admin-sekolah-dashboard').then(m => ({ default: m.AdminSekolahDashboard })), { ssr: false });
const GuruDashboard = dynamic(() => import('@/components/dashboard/guru/guru-dashboard').then(m => ({ default: m.GuruDashboard })), { ssr: false });
const SiswaDashboard = dynamic(() => import('@/components/dashboard/siswa/siswa-dashboard').then(m => ({ default: m.SiswaDashboard })), { ssr: false });

// Shared components (reused across roles with different data scopes)
const SchoolManager = dynamic(() => import('@/components/dashboard/super-admin/school-manager').then(m => ({ default: m.SchoolManager })), { ssr: false });
const UserManager = dynamic(() => import('@/components/dashboard/admin-sekolah/user-manager').then(m => ({ default: m.UserManager })), { ssr: false });
const ClassManager = dynamic(() => import('@/components/dashboard/admin-sekolah/class-manager').then(m => ({ default: m.ClassManager })), { ssr: false });

const QuestionBank = dynamic(() => import('@/components/question/question-bank').then(m => ({ default: m.QuestionBank })), { ssr: false });
const QuestionEditor = dynamic(() => import('@/components/question/question-editor').then(m => ({ default: m.QuestionEditor })), { ssr: false });

const ExamManager = dynamic(() => import('@/components/exam/exam-manager').then(m => ({ default: m.ExamManager })), { ssr: false });
const ExamRunner = dynamic(() => import('@/components/exam/exam-runner').then(m => ({ default: m.ExamRunner })), { ssr: false });
const ResultsView = dynamic(() => import('@/components/exam/results-view').then(m => ({ default: m.ResultsView })), { ssr: false });

const AnalyticsView = dynamic(() => import('@/components/analytics/analytics-view').then(m => ({ default: m.AnalyticsView })), { ssr: false });
const ReportsView = dynamic(() => import('@/components/analytics/reports-view').then(m => ({ default: m.ReportsView })), { ssr: false });

export default function Home() {
  const { currentView, user, isAuthenticated } = useAppStore();

  // Public views
  if (currentView === 'landing') return <LandingPage />;
  if (currentView === 'login') return <LoginForm />;
  if (currentView === 'register') return <RegisterForm />;

  // Protected views — wrap in AppLayout
  if (!isAuthenticated || !user) return <LandingPage />;

  // Render content based on current view
  const renderContent = () => {
    switch (currentView) {
      // ══════════════════════════════════════════════════
      // DASHBOARD (per role)
      // ══════════════════════════════════════════════════
      case 'dashboard':
        switch (user.role) {
          case 'SUPER_ADMIN': return <SuperAdminDashboard />;
          case 'ADMIN_SCHOOL': return <AdminSekolahDashboard />;
          case 'GURU': return <GuruDashboard />;
          case 'SISWA': return <SiswaDashboard />;
          default: return <SiswaDashboard />;
        }

      // ══════════════════════════════════════════════════
      // SUPER_ADMIN
      // ══════════════════════════════════════════════════
      case 'schools':
        return user.role === 'SUPER_ADMIN' ? <SchoolManager /> : <AdminSekolahDashboard />;
      case 'users-global':
        return user.role === 'SUPER_ADMIN' ? <UserManager /> : <SuperAdminDashboard />;
      case 'questions-global':
        return user.role === 'SUPER_ADMIN' ? <QuestionBank /> : <SuperAdminDashboard />;
      case 'analytics-global':
        return user.role === 'SUPER_ADMIN' ? <AnalyticsView /> : <SuperAdminDashboard />;
      case 'reports-global':
        return user.role === 'SUPER_ADMIN' ? <ReportsView /> : <SuperAdminDashboard />;
      case 'settings':
        return user.role === 'SUPER_ADMIN' ? <PlaceholderPage title="Pengaturan" desc="Konfigurasi platform PANDAI — nama, logo, KKM global, dll." /> : <PlaceholderPage title="Pengaturan" desc="Halaman dalam pengembangan" />;

      // ══════════════════════════════════════════════════
      // ADMIN_SCHOOL
      // ══════════════════════════════════════════════════
      case 'users':
        return <UserManager />;
      case 'classes':
        return <ClassManager />;
      case 'questions':
        return <QuestionBank />;
      case 'question-editor':
        return <QuestionEditor />;
      case 'exams':
        return <ExamManager />;
      case 'exam-assignments':
        return <PlaceholderPage title="Jadwal & Tugaskan" desc="Jadwalkan tryout dan tugaskan ke kelas tertentu." />;
      case 'results':
        return <ResultsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'reports':
        return <ReportsView />;

      // ══════════════════════════════════════════════════
      // GURU
      // ══════════════════════════════════════════════════
      case 'guru-materi':
        return <PlaceholderPage title="Materi Ajar" desc="Kelola materi pelajaran untuk kelas yang Anda ampu. Upload file, video, atau link." />;
      case 'guru-soal':
        return <QuestionBank />;
      case 'guru-tryout':
        return <ExamManager />;
      case 'guru-nilai':
        return <PlaceholderPage title="Input Nilai" desc="Catat dan kelola nilai siswa per kelas dan mata pelajaran." />;
      case 'guru-analisis':
        return <PlaceholderPage title="Analisis Hasil Belajar" desc="Analisis distribusi nilai, ketuntasan, dan perbandingan per topik." />;
      case 'guru-laporan':
        return <ReportsView />;

      // ══════════════════════════════════════════════════
      // SISWA
      // ══════════════════════════════════════════════════
      case 'diagnostic':
        return <PlaceholderPage title="Diagnostic Test" desc="Tes awal kemampuan TKA untuk mengidentifikasi kekuatan dan kelemahan Anda di setiap mata pelajaran." />;
      case 'practice':
        return <PlaceholderPage title="Latihan Soal" desc="Drill soal adaptif berdasarkan topik yang perlu ditingkatkan. Soal disesuaikan dengan level kemampuan Anda." />;
      case 'exam-runner':
        return <ExamRunner />;
      case 'siswa-nilai':
        return <PlaceholderPage title="Nilai Saya" desc="Rincian nilai per mata pelajaran — rata-rata, status ketuntasan, dan riwayat penilaian." />;
      case 'siswa-riwayat':
        return <ResultsView />;
      case 'leaderboard':
        return <PlaceholderPage title="Peringkat" desc="Papan peringkat siswa berdasarkan skor tryout dan latihan. Bandingkan pencapaian Anda dengan teman sekelas." />;

      // ══════════════════════════════════════════════════
      // SHARED
      // ══════════════════════════════════════════════════
      case 'notifications':
        return <PlaceholderPage title="Notifikasi" desc="Pemberitahuan dari sistem dan tugas baru." />;
      case 'profile':
      case 'broadcasts':
      default:
        return <PlaceholderPage title={currentView} desc={`Halaman ${currentView} dalam pengembangan`} />;
    }
  };

  return <AppLayout>{renderContent()}</AppLayout>;
}

// ─── Placeholder component for views under development ─────────

function PlaceholderPage({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="rounded-2xl bg-amber-50 p-6">
        <svg className="h-12 w-12 text-amber-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6v6l4 2" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      <p className="text-muted-foreground max-w-md">{desc}</p>
      <span className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        🚧 Dalam Pengembangan
      </span>
    </div>
  );
}
