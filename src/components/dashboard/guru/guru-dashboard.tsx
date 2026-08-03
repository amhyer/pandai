'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-store';
import type { ViewType } from '@/store/use-store';
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
  Trophy,
  ArrowRight,
  Star,
  Zap,
  FlaskConical,
  Calculator,
  Languages,
  Atom,
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

interface TopStudent {
  name: string;
  score: number;
  progress: number;
  trend: 'up' | 'down' | 'stable';
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

// ─── Progress Bar ──────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  isLoading?: boolean;
  onClick?: () => void;
  iconBg?: string;
  iconColor?: string;
}

function StatCard({ title, value, icon, subtext, isLoading, onClick, iconBg, iconColor }: StatCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <CardContent className="flex items-start gap-4 p-4 sm:p-6">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${iconBg ?? 'bg-[#1F3864]/10'} ${iconColor ?? 'text-[#1F3864]'}`}>
          {icon}
        </div>
        <div className="space-y-1">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{title}</p>
              <p className="text-3xl font-bold">{value}</p>
              {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function GuruDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [questionCount, setQuestionCount] = useState(0);
  const [examCount, setExamCount] = useState(0);
  const [avgStudentScore, setAvgStudentScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quickSubject, setQuickSubject] = useState('');
  const [creating, setCreating] = useState(false);

  // Mock activities for demonstration
  const activities: RecentActivity[] = [
    { id: '1', action: 'Membuat soal baru', detail: 'Matematika - Aljabar Linear', time: '2 jam lalu', type: 'create' },
    { id: '2', action: 'Tryout selesai', detail: '12 siswa menyelesaikan TKA Senin', time: '5 jam lalu', type: 'exam' },
    { id: '3', action: 'Hasil dianalisis', detail: 'Rata-rata skor: 72.5', time: '1 hari lalu', type: 'result' },
    { id: '4', action: 'Soal ditambahkan', detail: 'Fisika - Mekanika (10 soal)', time: '2 hari lalu', type: 'create' },
    { id: '5', action: 'Tryout dibuat', detail: 'TKA Prediksi Akhir Tahun', time: '3 hari lalu', type: 'exam' },
  ];

  // Mock top students
  const topStudents: TopStudent[] = [
    { name: 'Ahmad Rizki', score: 92, progress: 85, trend: 'up' },
    { name: 'Siti Nurhaliza', score: 88, progress: 72, trend: 'up' },
    { name: 'Budi Santoso', score: 85, progress: 60, trend: 'stable' },
  ];

  const subjects = [
    { value: 'matematika', label: 'Matematika', icon: Calculator },
    { value: 'fisika', label: 'Fisika', icon: Atom },
    { value: 'kimia', label: 'Kimia', icon: FlaskConical },
    { value: 'biologi', label: 'Biologi', icon: FlaskConical },
    { value: 'b_indonesia', label: 'B. Indonesia', icon: Languages },
    { value: 'b_inggris', label: 'B. Inggris', icon: Languages },
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

  async function handleQuickCreate() {
    if (!quickSubject) {
      toast.error('Pilih mata pelajaran terlebih dahulu');
      return;
    }
    try {
      setCreating(true);
      // Navigate to question editor with pre-filled subject
      navigateTo('guru-materi' as ViewType);
      toast.success(`Membuat soal ${quickSubject}...`);
    } catch {
      toast.error('Gagal membuat soal');
    } finally {
      setCreating(false);
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
        <StatCard
          title="Total Soal Dibuat"
          value={loading ? '' : questionCount}
          icon={<BookOpen className="h-6 w-6" />}
          subtext="soal di bank soal"
          isLoading={loading}
          onClick={() => navigateTo('guru-materi' as ViewType)}
          iconBg="bg-[#1F3864]/10"
          iconColor="text-[#1F3864]"
        />
        <StatCard
          title="Total Tryout"
          value={loading ? '' : examCount}
          icon={<ClipboardList className="h-6 w-6" />}
          subtext="tryout aktif"
          isLoading={loading}
          onClick={() => navigateTo('guru-tugas' as ViewType)}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Rata-rata Skor Siswa"
          value={loading ? '' : avgStudentScore}
          icon={<BarChart3 className="h-6 w-6" />}
          subtext="dari semua tryout"
          isLoading={loading}
          onClick={() => navigateTo('guru-analisis' as ViewType)}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Quick Create + Student Performance */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Create */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Buat Soal Cepat</CardTitle>
            </div>
            <CardDescription>Pilih mata pelajaran dan langsung buat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {subjects.map((subject) => {
                const Icon = subject.icon;
                return (
                  <button
                    key={subject.value}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 text-center transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                      quickSubject === subject.value
                        ? 'border-[#1F3864] bg-[#1F3864]/10 text-[#1F3864]'
                        : 'border-transparent bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setQuickSubject(subject.value === quickSubject ? '' : subject.value)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium leading-tight">{subject.label}</span>
                  </button>
                );
              })}
            </div>
            <Button
              className="w-full justify-center gap-2 bg-[#1F3864] hover:bg-[#152850]"
              disabled={!quickSubject || creating}
              onClick={handleQuickCreate}
            >
              <FilePlus className="h-4 w-4" />
              {creating ? 'Membuat...' : quickSubject ? `Buat Soal ${subjects.find(s => s.value === quickSubject)?.label}` : 'Pilih Mapel Dulu'}
            </Button>
          </CardContent>
        </Card>

        {/* Student Performance Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Performa Siswa Terbaik</CardTitle>
                <CardDescription>Top 3 siswa berdasarkan skor terkini</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => navigateTo('guru-analisis' as ViewType)}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Lihat Semua
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topStudents.map((student, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigateTo('guru-nilai' as ViewType)}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    'bg-orange-50 text-orange-700'
                  }`}>
                    {idx === 0 ? <Star className="h-4 w-4" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold truncate">{student.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#1F3864]">{student.score}</span>
                        {student.trend === 'up' && <ArrowRight className="h-3 w-3 text-emerald-500 -rotate-45" />}
                        {student.trend === 'down' && <ArrowRight className="h-3 w-3 text-red-500 rotate-45" />}
                        {student.trend === 'stable' && <Clock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </div>
                    <ProgressBar
                      value={student.progress}
                      color={idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">{student.progress}% progres target</p>
                  </div>
                </div>
              ))}
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
              onClick={() => navigateTo('guru-materi' as ViewType)}
            >
              <FilePlus className="h-4 w-4" />
              Buat Soal Baru
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigateTo('guru-tugas' as ViewType)}
            >
              <ClipboardList className="h-4 w-4" />
              Buat Tryout
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigateTo('guru-materi' as ViewType)}
            >
              <BookOpen className="h-4 w-4" />
              Lihat Bank Soal
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigateTo('guru-analisis' as ViewType)}
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
