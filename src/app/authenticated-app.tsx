'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/use-store';
import AppLayout from '@/components/layout/app-layout';

// ─── Loading Skeleton ──────────────────────────────────────────────

function ViewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-4 w-96 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-80 rounded-lg bg-muted" />
      <div className="h-60 rounded-lg bg-muted" />
    </div>
  );
}

// ─── Dynamic view components (lazy loaded per view) ─────────────────
// Each view is loaded only when navigated to, reducing initial bundle size

const views: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  // Dashboards
  'dashboard-super': React.lazy(() => import('@/components/dashboard/super-admin/super-admin-dashboard').then(m => ({ default: m.SuperAdminDashboard }))),
  'dashboard-admin': React.lazy(() => import('@/components/dashboard/admin-sekolah/admin-sekolah-dashboard').then(m => ({ default: m.AdminSekolahDashboard }))),
  'dashboard-guru': React.lazy(() => import('@/components/dashboard/guru/guru-dashboard').then(m => ({ default: m.GuruDashboard }))),
  'dashboard-siswa': React.lazy(() => import('@/components/dashboard/siswa/siswa-dashboard').then(m => ({ default: m.SiswaDashboard }))),
  'dashboard-ortu': React.lazy(() => import('@/components/dashboard/orang-tua/orang-tua-dashboard').then(m => ({ default: m.OrangTuaDashboard }))),

  // SUPER_ADMIN
  'schools': React.lazy(() => import('@/components/dashboard/super-admin/school-manager').then(m => ({ default: m.SchoolManager }))),
  'school-detail': React.lazy(() => import('@/components/dashboard/super-admin/school-manager').then(m => ({ default: m.SchoolManager }))),
  'users-global': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.UsersGlobalView }))),
  'questions-global': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.QuestionsGlobalView }))),
  'reports-global': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.ReportsGlobalView }))),
  'analytics-global': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.AnalyticsGlobalView }))),
  'settings': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.SettingsView }))),

  // ADMIN_SCHOOL
  'users': React.lazy(() => import('@/components/dashboard/admin-sekolah/user-manager').then(m => ({ default: m.UserManager }))),
  'classes': React.lazy(() => import('@/components/dashboard/admin-sekolah/class-manager').then(m => ({ default: m.ClassManager }))),
  'questions': React.lazy(() => import('@/components/question/question-bank').then(m => ({ default: m.QuestionBank }))),
  'question-editor': React.lazy(() => import('@/components/question/question-editor').then(m => ({ default: m.QuestionEditor }))),
  'exams': React.lazy(() => import('@/components/exam/exam-manager').then(m => ({ default: m.ExamManager }))),
  'exam-editor': React.lazy(() => import('@/components/exam/exam-manager').then(m => ({ default: m.ExamManager }))),
  'exam-assignments': React.lazy(() => import('@/components/views/admin-school-views').then(m => ({ default: m.ExamAssignmentsView }))),
  'results': React.lazy(() => import('@/components/exam/results-view').then(m => ({ default: m.ResultsView }))),
  'result-detail': React.lazy(() => import('@/components/exam/results-view').then(m => ({ default: m.ResultsView }))),
  'analytics': React.lazy(() => import('@/components/views/admin-school-views').then(m => ({ default: m.AnalyticsView }))),
  'reports': React.lazy(() => import('@/components/views/admin-school-views').then(m => ({ default: m.ReportsView }))),

  // GURU
  'guru-materi': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruMateriView }))),
  'guru-soal': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruSoalView }))),
  'guru-tryout': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruTryoutView }))),
  'guru-nilai': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruNilaiView }))),
  'guru-analisis': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruAnalisisView }))),
  'guru-laporan': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruLaporanView }))),

  // SISWA
  'diagnostic': React.lazy(() => import('@/components/views/siswa-views').then(m => ({ default: m.DiagnosticView }))),
  'practice': React.lazy(() => import('@/components/views/siswa-views').then(m => ({ default: m.PracticeView }))),
  'exam-runner': React.lazy(() => import('@/components/exam/exam-runner').then(m => ({ default: m.ExamRunner }))),
  'siswa-nilai': React.lazy(() => import('@/components/views/siswa-views').then(m => ({ default: m.SiswaNilaiView }))),
  'siswa-riwayat': React.lazy(() => import('@/components/views/siswa-views').then(m => ({ default: m.SiswaRiwayatView }))),
  'leaderboard': React.lazy(() => import('@/components/views/siswa-views').then(m => ({ default: m.LeaderboardView }))),

  // ORANG_TUA
  'ortu-nilai': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuNilaiView }))),
  'ortu-materi': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuMateriView }))),
  'ortu-kehadiran': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuKehadiranView }))),
  'ortu-kuis': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuKuisView }))),
  'ortu-laporan': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuLaporanView }))),

  // Shared
  'profile': React.lazy(() => import('@/components/views/shared-views').then(m => ({ default: m.ProfileView }))),
  'notifications': React.lazy(() => import('@/components/views/shared-views').then(m => ({ default: m.NotificationsView }))),
  'broadcasts': React.lazy(() => import('@/components/views/shared-views').then(m => ({ default: m.BroadcastsView }))),
};

// ─── View Router ─────────────────────────────────────────────────────

function ViewRouter() {
  const currentView = useAppStore((s) => s.currentView);
  const user = useAppStore((s) => s.user);

  // Dashboard maps to role-specific component
  if (currentView === 'dashboard') {
    const roleDashboards: Record<string, string> = {
      'SUPER_ADMIN': 'dashboard-super',
      'ADMIN_SCHOOL': 'dashboard-admin',
      'GURU': 'dashboard-guru',
      'SISWA': 'dashboard-siswa',
      'ORANG_TUA': 'dashboard-ortu',
    };
    const viewKey = roleDashboards[user?.role ?? 'SISWA'] ?? 'dashboard-siswa';
    const Component = views[viewKey];
    return Component ? (
      <Suspense fallback={<ViewSkeleton />}>
        <Component />
      </Suspense>
    ) : <ViewSkeleton />;
  }

  const Component = views[currentView];
  if (Component) {
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <Component />
      </Suspense>
    );
  }

  return <ViewSkeleton />;
}

// ─── Export ─────────────────────────────────────────────────────────

export default function AuthenticatedApp() {
  return (
    <AppLayout>
      <ViewRouter />
    </AppLayout>
  );
}
