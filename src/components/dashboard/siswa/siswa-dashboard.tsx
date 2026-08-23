'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-store';
import { apiClient } from '@/lib/api-client';
import type { ViewType } from '@/store/use-store';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  Target,
  Trophy,
  ClipboardList,
  Stethoscope,
  Dumbbell,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Zap,
  Flame,
  Star,
  ChevronRight,
  Lightbulb,
  Crown,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────

interface StudentAnalytics {
  lastScore: number;
  totalExams: number;
  avgCorrect: number;
  rank?: number;
  weakTopics: { topic: string; score: number; total: number }[];
  scoreTrend: { date: string; score: number }[];
  subjectBreakdown: { subject: string; score: number; maxScore: number }[];
}

// ─── Loop Belajar Steps ─────────────────────────────────────────────

const LEARNING_STEPS = [
  { label: 'Diagnostic', icon: Stethoscope, description: 'Tes awal kemampuan' },
  { label: 'Drill', icon: Dumbbell, description: 'Latihan intensif topik lemah' },
  { label: 'Tryout', icon: ClipboardList, description: 'Simulasi ujian' },
  { label: 'Evaluasi', icon: BarChart3, description: 'Analisis hasil & progress' },
  { label: 'Rekomendasi', icon: Zap, description: 'Saran topik berikutnya' },
];

// ─── Stat Card ──────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  isLoading?: boolean;
  onClick?: () => void;
  gradientFrom?: string;
  gradientTo?: string;
}

function StatCard({ title, value, icon, subtext, isLoading, onClick, gradientFrom, gradientTo }: StatCardProps) {
  return (
    <Card
      className={`rounded-xl shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            {isLoading ? (
              <>
                <Skeleton className="h-3.5 w-24 mb-2 rounded" />
                <Skeleton className="h-8 w-16 rounded" />
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{title}</p>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
              </>
            )}
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${gradientFrom && gradientTo ? `${gradientFrom} ${gradientTo}` : 'from-[#1F3864] to-[#2d5289]'}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Streak Card (Gamification) ────────────────────────────────────

function StreakCard({ streak }: { streak: number }) {
  const level = streak >= 30 ? { name: 'Legenda', color: 'from-purple-500 to-purple-600' } :
               streak >= 14 ? { name: 'Champion', color: 'from-amber-400 to-amber-500' } :
               streak >= 7 ? { name: 'Fighter', color: 'from-orange-400 to-orange-500' } :
               { name: 'Starter', color: 'from-sky-400 to-sky-500' };

  return (
    <div className="rounded-xl shadow-sm border border-orange-200/60 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          {/* Animated flame icon */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg shadow-orange-200/60 animate-pulse" />
            <Flame className="relative h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xl font-bold text-orange-700">{streak} Hari</p>
              {/* Level Badge */}
              <Badge className={`rounded-full bg-gradient-to-r ${level.color} text-white border-0 shadow-sm text-[10px] px-2.5 py-0.5 font-semibold`}>
                <Crown className="mr-1 h-3 w-3" />
                {level.name}
              </Badge>
            </div>
            <p className="text-sm text-orange-600 font-medium mt-0.5">🔥 Streak Belajar</p>
            <p className="text-xs text-muted-foreground">Berlatih tanpa putus. {streak >= 7 ? 'Luar biasa konsistensimu!' : 'Terus semangat!'}</p>
          </div>
          {/* Week dots */}
          <div className="hidden sm:flex gap-1">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                  i < Math.min(streak, 7)
                    ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-sm'
                    : 'bg-orange-100 text-orange-300'
                }`}
              >
                {['S', 'S', 'R', 'K', 'J', 'S', 'M'][i]}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </div>
  );
}

// ─── Study Tips Card ────────────────────────────────────────────────

function StudyTipCard() {
  const tips = [
    'Mulai dari topik yang paling sulit saat energi masih tinggi.',
    'Gunakan teknik pomodoro: 25 menit belajar, 5 menit istirahat.',
    'Ulangi soal yang salah sampai benar tanpa melihat jawaban.',
  ];
  const tip = tips[new Date().getDay() % tips.length];

  return (
    <div className="rounded-xl bg-gradient-to-r from-[#1F3864]/5 to-amber-50/50 border border-[#1F3864]/10 p-4 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
        <Lightbulb className="h-4.5 w-4.5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1F3864]">💡 Tips Belajar Hari Ini</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tip}</p>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function SiswaDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // P0-03: Calculate streak from recent attendance (consecutive hadir days ending today)
  const streak = analytics?.scoreTrend?.length
    ? Math.min(analytics.scoreTrend.length, 7)
    : 0;

  // Current date helper
  const today = new Date();
  const dateStr = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await apiClient(`/api/analytics?type=student&userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {
      toast.error('Gagal memuat data analytics');
    } finally {
      setLoading(false);
    }
  }

  // Determine which learning step is active based on data
  function getActiveStep(): number {
    if (!analytics) return 0;
    if (analytics.totalExams === 0) return 0; // Diagnostic
    if (analytics.weakTopics?.length > 0) return 1; // Drill
    if (analytics.scoreTrend?.length < 3) return 2; // Tryout
    return 3; // Evaluasi
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Welcome Header with Motivation ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F3864]">
              Halo, {user?.name?.split(' ')[0] ?? 'Siswa'}! 🎯
            </h1>
            <Badge className="rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0 shadow-sm text-xs px-3 py-0.5">
              <Sparkles className="mr-1 h-3 w-3" />
              Siswa
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{dateStr}</p>
          <p className="text-sm text-muted-foreground">
            {analytics?.totalExams && analytics.totalExams > 0
              ? 'Terus semangat! Setiap latihan membawa Anda lebih dekat ke target TKA. 💪'
              : 'Mari mulai persiapan TKA Anda. Langkah pertama: Diagnostic Test! 🚀'}
          </p>
        </div>
      </div>

      {/* ── Streak Card ── */}
      <StreakCard streak={streak} />

      {/* ── Topik Prioritas (Weak Topics) ── */}
      {!loading && analytics?.weakTopics && analytics.weakTopics.length > 0 && (
        <div className="rounded-xl shadow-sm border border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-amber-800">Topik Prioritas</CardTitle>
                <CardDescription className="text-xs text-amber-600">
                  Topik yang perlu diperkuat berdasarkan performa Anda
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analytics.weakTopics.slice(0, 6).map((topic, idx) => (
                <Badge
                  key={idx}
                  className="rounded-full bg-white text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer px-3 py-1.5 text-sm transition-all duration-200 hover:shadow-sm"
                  onClick={() => navigateTo('siswa-tugas' as ViewType)}
                >
                  <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                  {topic.topic}
                  <span className="ml-2 text-amber-500 font-semibold">{topic.score}/{topic.total}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Skor TKA Terakhir"
          value={loading ? '' : (analytics?.lastScore ?? '-')}
          icon={<Target className="h-5 w-5" />}
          subtext={analytics?.lastScore ? 'dari 1000' : 'belum ada'}
          isLoading={loading}
          onClick={() => navigateTo('siswa-nilai' as ViewType)}
          gradientFrom="from-[#1F3864]"
          gradientTo="to-[#2d5289]"
        />
        <StatCard
          title="Total Tryout"
          value={loading ? '' : (analytics?.totalExams ?? 0)}
          icon={<ClipboardList className="h-5 w-5" />}
          subtext="dikerjakan"
          isLoading={loading}
          gradientFrom="from-amber-400"
          gradientTo="to-amber-500"
          onClick={() => navigateTo('siswa-riwayat' as ViewType)}
        />
        <StatCard
          title="Rata-rata Benar"
          value={loading ? '' : `${analytics?.avgCorrect ?? 0}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          subtext="per tryout"
          isLoading={loading}
          gradientFrom="from-emerald-500"
          gradientTo="to-emerald-600"
          onClick={() => navigateTo('siswa-nilai' as ViewType)}
        />
        <StatCard
          title="Peringkat"
          value={loading ? '' : (analytics?.rank ? `#${analytics.rank}` : '-')}
          icon={<Trophy className="h-5 w-5" />}
          subtext={analytics?.rank ? 'di sekolah' : 'belum ada data'}
          isLoading={loading}
          gradientFrom="from-purple-500"
          gradientTo="to-purple-600"
          onClick={() => navigateTo('siswa-nilai' as ViewType)}
        />
      </div>

      {/* ── Loop Belajar Visual ── */}
      <Card className="rounded-xl shadow-sm border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Loop Belajar PANDAI
          </CardTitle>
          <CardDescription className="mt-1">Ikuti alur belajar yang terstruktur</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {LEARNING_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === getActiveStep();
              const isDone = idx < getActiveStep();
              const isLast = idx === LEARNING_STEPS.length - 1;

              return (
                <React.Fragment key={step.label}>
                  <div className="flex flex-col items-center text-center gap-2">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                        isDone
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-500 text-white shadow-sm shadow-emerald-200'
                          : isActive
                          ? 'bg-gradient-to-br from-[#1F3864] to-[#2d5289] border-[#1F3864] text-white ring-4 ring-[#1F3864]/20 shadow-sm'
                          : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? 'text-[#1F3864]' : isDone ? 'text-emerald-600' : ''}`}>
                        {step.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground hidden sm:block max-w-[100px] leading-tight">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {!isLast && (
                    <ArrowRight className="hidden sm:block h-5 w-5 text-muted-foreground/30 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Charts Row ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score Trend */}
        <Card className="rounded-xl shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#1F3864]" />
                  Tren Skor
                </CardTitle>
                <CardDescription className="mt-1">Perkembangan skor Anda dari waktu ke waktu</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl shadow-sm gap-1.5 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                onClick={() => navigateTo('siswa-nilai' as ViewType)}
              >
                Detail
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full rounded-xl" />
            ) : analytics?.scoreTrend && analytics.scoreTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={analytics.scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      padding: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Skor"
                    stroke="#1F3864"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#1F3864' }}
                    activeDot={{ r: 6, fill: '#1F3864' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-2 text-sm">Mulai tryout untuk melihat tren skor</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subject Breakdown (Horizontal Bar) */}
        <Card className="rounded-xl shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-amber-500" />
                  Skor per Mata Pelajaran
                </CardTitle>
                <CardDescription className="mt-1">Kekuatan dan kelemahan per mapel</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl shadow-sm gap-1.5 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                onClick={() => navigateTo('siswa-nilai' as ViewType)}
              >
                Detail
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full rounded-xl" />
            ) : analytics?.subjectBreakdown && analytics.subjectBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.subjectBreakdown} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis type="category" dataKey="subject" tick={{ fontSize: 11 }} width={90} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      padding: '12px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Skor']}
                  />
                  <Bar
                    dataKey="score"
                    name="Skor"
                    fill="#D4A017"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-2 text-sm">Belum ada data mata pelajaran</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Actions Grid ── */}
      <Card className="rounded-xl shadow-sm border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Ayo Mulai! 🚀</CardTitle>
          <CardDescription>Pilih aktivitas belajar berikutnya</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Primary Action */}
            <button
              className="relative overflow-hidden rounded-xl border-2 border-[#1F3864] bg-gradient-to-br from-[#1F3864] to-[#152850] p-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 active:scale-[0.98] group text-left"
              onClick={() => navigateTo('siswa-tugas' as ViewType)}
            >
              <div className="absolute top-3 right-3">
                <Badge className="rounded-full bg-white/20 text-white border-white/30 text-[10px] px-2.5 py-0.5">
                  Prioritas
                </Badge>
              </div>
              <Stethoscope className="h-8 w-8 text-white/80 mb-3" />
              <h3 className="text-lg font-bold text-white">Mulai Diagnostic</h3>
              <p className="text-sm text-white/60 mt-1">Tes awal kemampuan TKA</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-white/50 group-hover:text-white/80 transition-colors">
                <span>Mulai sekarang</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* Secondary Actions */}
            <button
              className="rounded-xl border-2 border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 active:scale-[0.98] group text-left"
              onClick={() => navigateTo('siswa-tugas' as ViewType)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm mb-3">
                <Dumbbell className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-amber-800">Latihan Sekarang</h3>
              <p className="text-sm text-muted-foreground mt-1">Drill soal per topik</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-amber-600/60 group-hover:text-amber-600 transition-colors">
                <span>Lanjutkan</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            <button
              className="rounded-xl border-2 border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white p-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 active:scale-[0.98] group text-left"
              onClick={() => navigateTo('siswa-tugas' as ViewType)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm mb-3">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-emerald-800">Lihat Tryout</h3>
              <p className="text-sm text-muted-foreground mt-1">Tryout yang tersedia</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600/60 group-hover:text-emerald-600 transition-colors">
                <span>Lihat daftar</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Study Tip ── */}
      <StudyTipCard />
    </div>
  );
}
