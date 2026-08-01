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
  accent?: string;
}

function StatCard({ title, value, icon, subtext, isLoading, onClick, accent }: StatCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{title}</p>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
              </>
            )}
          </div>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              accent ?? 'bg-[#1F3864]/10 text-[#1F3864]'
            }`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Streak Card ────────────────────────────────────────────────────

function StreakCard({ streak }: { streak: number }) {
  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-200">
            <Flame className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-orange-700">{streak} Hari</p>
              {streak >= 7 && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200">
                  <Star className="mr-1 h-3 w-3" />
                  On Fire!
                </Badge>
              )}
            </div>
            <p className="text-sm text-orange-600 font-medium">Streak Belajar</p>
            <p className="text-xs text-muted-foreground">Berlatih tanpa putus. Terus semangat!</p>
          </div>
          <div className="flex gap-0.5">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                  i < Math.min(streak, 7)
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-100 text-orange-300'
                }`}
              >
                {['S', 'S', 'R', 'K', 'J', 'S', 'M'][i]}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function SiswaDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock streak (in a real app this would come from an API)
  const streak = 5;

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics?type=student&userId=${user.id}`);
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
    <div className="space-y-6">
      {/* Welcome Header with Motivation */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Halo, {user?.name?.split(' ')[0] ?? 'Siswa'}! 🎯
        </h1>
        <p className="text-muted-foreground">
          {analytics?.totalExams && analytics.totalExams > 0
            ? 'Terus semangat! Setiap latihan membawa Anda lebih dekat ke target TKA.'
            : 'Mari mulai persiapan TKA Anda. Langkah pertama: Diagnostic Test!'}
        </p>
      </div>

      {/* Streak Card */}
      <StreakCard streak={streak} />

      {/* Topik Prioritas (Weak Topics) */}
      {!loading && analytics?.weakTopics && analytics.weakTopics.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg text-amber-800">Topik Prioritas</CardTitle>
            </div>
            <CardDescription className="text-amber-700">
              Topik yang perlu diperkuat berdasarkan performa Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analytics.weakTopics.slice(0, 6).map((topic, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100 cursor-pointer px-3 py-1.5 text-sm"
                  onClick={() => navigateTo('practice' as ViewType)}
                >
                  <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                  {topic.topic}
                  <span className="ml-2 text-amber-500 font-semibold">{topic.score}/{topic.total}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Skor TKA Terakhir"
          value={loading ? '' : (analytics?.lastScore ?? '-')}
          icon={<Target className="h-5 w-5" />}
          subtext={analytics?.lastScore ? 'dari 1000' : 'belum ada'}
          isLoading={loading}
          onClick={() => navigateTo('siswa-nilai' as ViewType)}
        />
        <StatCard
          title="Total Tryout"
          value={loading ? '' : (analytics?.totalExams ?? 0)}
          icon={<ClipboardList className="h-5 w-5" />}
          subtext="dikerjakan"
          isLoading={loading}
          accent="bg-amber-50 text-amber-600"
          onClick={() => navigateTo('siswa-riwayat' as ViewType)}
        />
        <StatCard
          title="Rata-rata Benar"
          value={loading ? '' : `${analytics?.avgCorrect ?? 0}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          subtext="per tryout"
          isLoading={loading}
          accent="bg-emerald-50 text-emerald-600"
          onClick={() => navigateTo('siswa-nilai' as ViewType)}
        />
        <StatCard
          title="Peringkat"
          value={loading ? '' : (analytics?.rank ? `#${analytics.rank}` : '-')}
          icon={<Trophy className="h-5 w-5" />}
          subtext={analytics?.rank ? 'di sekolah' : 'belum ada data'}
          isLoading={loading}
          accent="bg-amber-50 text-amber-600"
          onClick={() => navigateTo('leaderboard' as ViewType)}
        />
      </div>

      {/* Loop Belajar Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Loop Belajar PANDAI</CardTitle>
          <CardDescription>Ikuti alur belajar yang terstruktur</CardDescription>
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
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                        isDone
                          ? 'bg-emerald-100 border-emerald-500 text-emerald-600'
                          : isActive
                          ? 'bg-[#1F3864] border-[#1F3864] text-white ring-4 ring-[#1F3864]/20'
                          : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? 'text-[#1F3864]' : ''}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground hidden sm:block max-w-[100px]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {!isLast && (
                    <ArrowRight className="hidden sm:block h-5 w-5 text-muted-foreground/40 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tren Skor</CardTitle>
            <CardDescription>Perkembangan skor Anda dari waktu ke waktu</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
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
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Skor"
                    stroke="#1F3864"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#1F3864' }}
                    activeDot={{ r: 6 }}
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Skor per Mata Pelajaran</CardTitle>
            <CardDescription>Kekuatan dan kelemahan per mapel</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : analytics?.subjectBreakdown && analytics.subjectBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.subjectBreakdown} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis type="category" dataKey="subject" tick={{ fontSize: 11 }} width={90} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Skor']}
                  />
                  <Bar
                    dataKey="score"
                    name="Skor"
                    fill="#D4A017"
                    radius={[0, 4, 4, 0]}
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

      {/* Quick Actions - Enhanced */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ayo Mulai!</CardTitle>
          <CardDescription>Pilih aktivitas belajar berikutnya</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Primary Action */}
            <div
              className="relative overflow-hidden rounded-xl border-2 border-[#1F3864] bg-gradient-to-br from-[#1F3864] to-[#152850] p-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group"
              onClick={() => navigateTo('diagnostic' as ViewType)}
            >
              <div className="absolute top-2 right-2">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-[10px]">
                  Prioritas
                </Badge>
              </div>
              <Stethoscope className="h-8 w-8 text-white/80 mb-3" />
              <h3 className="text-lg font-bold text-white">Mulai Diagnostic</h3>
              <p className="text-sm text-white/60 mt-1">Tes awal kemampuan TKA</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-white/50 group-hover:text-white/80 transition-colors">
                <span>Mulai sekarang</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Secondary Actions */}
            <div
              className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group"
              onClick={() => navigateTo('practice' as ViewType)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 mb-3">
                <Dumbbell className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-amber-800">Latihan Sekarang</h3>
              <p className="text-sm text-muted-foreground mt-1">Drill soal per topik</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-amber-600/60 group-hover:text-amber-600 transition-colors">
                <span>Lanjutkan</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            <div
              className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group"
              onClick={() => navigateTo('exams' as ViewType)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 mb-3">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-emerald-800">Lihat Tryout</h3>
              <p className="text-sm text-muted-foreground mt-1">Tryout yang tersedia</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600/60 group-hover:text-emerald-600 transition-colors">
                <span>Lihat daftar</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
