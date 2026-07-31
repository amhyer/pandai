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
  accent?: string;
}

function StatCard({ title, value, icon, subtext, isLoading, accent }: StatCardProps) {
  return (
    <Card>
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
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
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

// ─── Main Component ─────────────────────────────────────────────────

export function SiswaDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

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
                  onClick={() => navigateTo('practice')}
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
        />
        <StatCard
          title="Total Tryout"
          value={loading ? '' : (analytics?.totalExams ?? 0)}
          icon={<ClipboardList className="h-5 w-5" />}
          subtext="dikerjakan"
          isLoading={loading}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Rata-rata Benar"
          value={loading ? '' : `${analytics?.avgCorrect ?? 0}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          subtext="per tryout"
          isLoading={loading}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Peringkat"
          value={loading ? '' : (analytics?.rank ? `#${analytics.rank}` : '-')}
          icon={<Trophy className="h-5 w-5" />}
          subtext={analytics?.rank ? 'di sekolah' : 'belum ada data'}
          isLoading={loading}
          accent="bg-amber-50 text-amber-600"
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

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Button
          className="h-auto flex-col gap-2 py-6 bg-[#1F3864] hover:bg-[#152850]"
          onClick={() => navigateTo('diagnostic')}
        >
          <Stethoscope className="h-6 w-6" />
          <span className="font-semibold">Mulai Diagnostic</span>
          <span className="text-xs text-white/70">Tes awal kemampuan TKA</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-6"
          onClick={() => navigateTo('practice')}
        >
          <Dumbbell className="h-6 w-6 text-[#1F3864]" />
          <span className="font-semibold">Latihan Sekarang</span>
          <span className="text-xs text-muted-foreground">Drill soal per topik</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-6"
          onClick={() => navigateTo('exams')}
        >
          <ClipboardList className="h-6 w-6 text-amber-600" />
          <span className="font-semibold">Lihat Tryout</span>
          <span className="text-xs text-muted-foreground">Tryout yang tersedia</span>
        </Button>
      </div>
    </div>
  );
}
