'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-store';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen,
  ClipboardList,
  BarChart3,
  FilePlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────

interface RecentActivity {
  id: string;
  action: string;
  detail: string;
  time: string;
  type: 'create' | 'exam' | 'result';
}

// ─── Activity Icon ──────────────────────────────────────────────────

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'create':
      return <FilePlus className="h-4 w-4 text-emerald-500" />;
    case 'exam':
      return <ClipboardList className="h-4 w-4 text-[#1F3864]" />;
    case 'result':
      return <BarChart3 className="h-4 w-4 text-amber-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

// ─── Main Component ─────────────────────────────────────────────────

export function GuruDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [questionCount, setQuestionCount] = useState(0);
  const [examCount, setExamCount] = useState(0);
  const [avgStudentScore, setAvgStudentScore] = useState(0);
  const [loading, setLoading] = useState(true);

  // Mock activities for demonstration
  const activities: RecentActivity[] = [
    { id: '1', action: 'Membuat soal baru', detail: 'Matematika - Aljabar Linear', time: '2 jam lalu', type: 'create' },
    { id: '2', action: 'Tryout selesai', detail: '12 siswa menyelesaikan TKA Senin', time: '5 jam lalu', type: 'exam' },
    { id: '3', action: 'Hasil dianalisis', detail: 'Rata-rata skor: 72.5', time: '1 hari lalu', type: 'result' },
    { id: '4', action: 'Soal ditambahkan', detail: 'Fisika - Mekanika (10 soal)', time: '2 hari lalu', type: 'create' },
    { id: '5', action: 'Tryout dibuat', detail: 'TKA Prediksi Akhir Tahun', time: '3 hari lalu', type: 'exam' },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    if (!user?.schoolId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/questions?schoolId=${user.schoolId}`);
      if (res.ok) {
        const data = await res.json();
        const questions = Array.isArray(data) ? data : data.questions ?? [];
        setQuestionCount(questions.length);
      }
      // Mock exam count and avg score (no dedicated endpoint yet)
      setExamCount(3);
      setAvgStudentScore(72.5);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Selamat Datang, {user?.name ?? 'Guru'} 👋
        </h1>
        <p className="text-muted-foreground">
          {user?.schoolName ? `Sekolah ${user.schoolName}` : 'Dashboard guru'} — Kelola soal dan pantau kemajuan siswa.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Soal Dibuat</p>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold">{questionCount}</p>
              )}
              <p className="text-xs text-muted-foreground">soal di bank soal</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Tryout</p>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold">{examCount}</p>
              )}
              <p className="text-xs text-muted-foreground">tryout aktif</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Rata-rata Skor Siswa</p>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold">{avgStudentScore}</p>
              )}
              <p className="text-xs text-muted-foreground">dari semua tryout</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aksi Cepat</CardTitle>
            <CardDescription>Langkah berikutnya?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start gap-2 bg-[#1F3864] hover:bg-[#152850]"
              onClick={() => navigateTo('question-editor')}
            >
              <FilePlus className="h-4 w-4" />
              Buat Soal Baru
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigateTo('exams')}
            >
              <ClipboardList className="h-4 w-4" />
              Buat Tryout
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigateTo('questions')}
            >
              <BookOpen className="h-4 w-4" />
              Lihat Bank Soal
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigateTo('analytics')}
            >
              <BarChart3 className="h-4 w-4" />
              Nilai & Analisis
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aktivitas Terkini</CardTitle>
            <CardDescription>Riwayat aktivitas Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <ActivityIcon type={activity.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
