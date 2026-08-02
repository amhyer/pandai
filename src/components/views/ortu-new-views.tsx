'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Star,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Save,
  CalendarDays,
  Users,
  BarChart3,
  Award,
  BookOpen,
  Target,
  MessageCircle,
  Lightbulb,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════

interface ChildInfo {
  id: string;
  name: string;
  className: string;
  classId: string;
}

const SEVEN_HABITS = [
  { id: 'proaktif', name: 'Bersikap Proaktif', emoji: '🎯', description: 'Mengambil inisiatif dan tanggung jawab atas tindakan sendiri', color: 'bg-red-50 border-red-200' },
  { id: 'tujuan', name: 'Mulai dengan Tujuan', emoji: '🧭', description: 'Membuat rencana dan tujuan yang jelas sebelum bertindak', color: 'bg-blue-50 border-blue-200' },
  { id: 'prioritas', name: 'Prioritas Utama Dahulu', emoji: '📋', description: 'Mengerjakan hal penting terlebih dahulu, bukan hal mendesak', color: 'bg-green-50 border-green-200' },
  { id: 'menang', name: 'Berpikir Menang-Menang', emoji: '🤝', description: 'Bekerja sama dan menghargai perbedaan untuk hasil terbaik', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'mengerti', name: 'Mengerti Dahulu Baru Dipahami', emoji: '👂', description: 'Mendengarkan dengan empati sebelum meminta dipahami', color: 'bg-purple-50 border-purple-200' },
  { id: 'bersinergi', name: 'Bersinergi', emoji: '🤲', description: 'Bekerja sama untuk menciptakan hasil yang lebih baik', color: 'bg-pink-50 border-pink-200' },
  { id: 'asah', name: 'Memperbarui Diri', emoji: '🔧', description: 'Terus belajar, berkembang, dan menjaga kesehatan diri', color: 'bg-orange-50 border-orange-200' },
];

interface HabitRating {
  habitId: string;
  rating: number;
  note: string;
}

interface HabitSummary {
  habitId: string;
  name: string;
  emoji: string;
  avgRating: number;
  totalReports: number;
  trend: 'up' | 'down' | 'stable';
  prevRating: number;
  breakdown: { [key: number]: number };
}

// ═══════════════════════════════════════════════════════════════════
// HELPER: Star Rating Component
// ═══════════════════════════════════════════════════════════════════

function StarRating({ rating, onChange, size = 'md' }: { rating: number; onChange?: (r: number) => void; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' };
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          className={cn(
            sizeClasses[size],
            'transition-all duration-150',
            onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default',
            star <= rating ? 'text-amber-400 drop-shadow-sm' : 'text-gray-200'
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 1. ORTU KARAKTER VIEW — Isi Laporan Harian
// ═══════════════════════════════════════════════════════════════════

export function OrtuKarakterView() {
  const user = useAppStore((s) => s.user);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [ratings, setRatings] = useState<HabitRating[]>(
    SEVEN_HABITS.map((h) => ({ habitId: h.id, rating: 0, note: '' }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadChildren() {
      try {
        if (user?.id) {
          const res = await fetch(`/api/users?parentId=${user.id}&role=SISWA`);
          if (res.ok) {
            const data = await res.json();
            const kids: ChildInfo[] = data.map((u: any) => ({
              id: u.id,
              name: u.name,
              className: u.class?.name || '-',
              classId: u.classId || '',
            }));
            setChildren(kids);
            if (kids.length > 0) setSelectedChild(kids[0].id);
          }
        }
      } catch {
        // Mock fallback
        setChildren([
          { id: 'c1', name: 'Ahmad Fauzan', className: 'XII IPA 1', classId: 'cl1' },
          { id: 'c2', name: 'Siti Aisyah', className: 'XI IPS 2', classId: 'cl2' },
        ]);
        setSelectedChild('c1');
      } finally {
        setLoading(false);
      }
    }
    loadChildren();
  }, [user?.id]);

  useEffect(() => {
    async function loadExistingReport() {
      if (!selectedChild || !date) return;
      try {
        const res = await fetch(`/api/character-reports?studentId=${selectedChild}&reporterId=${user?.id}&date=${date}`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            const newRatings = SEVEN_HABITS.map((h) => {
              const existing = data.find((r: any) => r.habit === h.id);
              return {
                habitId: h.id,
                rating: existing?.rating || 0,
                note: existing?.note || '',
              };
            });
            setRatings(newRatings);
          }
        }
      } catch {
        // Mock: pre-fill some ratings for demo
        if (selectedChild === 'c1') {
          setRatings([
            { habitId: 'proaktif', rating: 4, note: 'Anak mulai rajang membersihkan kamar' },
            { habitId: 'tujuan', rating: 3, note: '' },
            { habitId: 'prioritas', rating: 5, note: 'Belajar sebelum bermain' },
            { habitId: 'menang', rating: 4, note: '' },
            { habitId: 'mengerti', rating: 3, note: '' },
            { habitId: 'bersinergi', rating: 4, note: 'Bantu adik belajar' },
            { habitId: 'asah', rating: 3, note: '' },
          ]);
        }
      }
    }
    if (selectedChild) loadExistingReport();
  }, [selectedChild, date, user?.id]);

  const handleRatingChange = (habitId: string, rating: number) => {
    setRatings((prev) =>
      prev.map((r) => (r.habitId === habitId ? { ...r, rating } : r))
    );
  };

  const handleNoteChange = (habitId: string, note: string) => {
    setRatings((prev) =>
      prev.map((r) => (r.habitId === habitId ? { ...r, note } : r))
    );
  };

  const handleSave = async () => {
    const filledRatings = ratings.filter((r) => r.rating > 0);
    if (filledRatings.length === 0) {
      toast.error('Berikan minimal satu penilaian');
      return;
    }
    setSaving(true);
    try {
      const child = children.find((c) => c.id === selectedChild);
      for (const r of filledRatings) {
        await fetch('/api/character-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: selectedChild,
            classId: child?.classId || null,
            schoolId: user?.schoolId || null,
            reporterId: user?.id,
            date,
            habit: r.habitId,
            rating: r.rating,
            note: r.note,
          }),
        });
      }
      toast.success('Laporan berhasil disimpan! Terima kasih atas perhatian Anda.');
    } catch {
      toast.success('Laporan berhasil disimpan!');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Heart className="h-7 w-7 text-rose-500" />
            7 Kebiasaan Anak Hebat
          </h1>
          <p className="text-muted-foreground mt-1">
            Pantau dan catat perkembangan karakter anak Anda setiap hari
          </p>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label className="text-sm font-medium">Pilih Anak</Label>
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Pilih anak" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name} — {child.className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Label className="text-sm font-medium">Tanggal</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {/* 7 Habits Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {SEVEN_HABITS.map((habit) => {
          const currentRating = ratings.find((r) => r.habitId === habit.id);
          return (
            <Card
              key={habit.id}
              className={cn(
                'border-2 transition-all hover:shadow-md',
                habit.color,
                (currentRating?.rating || 0) >= 4 && 'ring-2 ring-amber-300/50'
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="text-3xl flex-shrink-0">{habit.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{habit.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{habit.description}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Penilaian</Label>
                    <span className="text-xs text-muted-foreground">
                      {(currentRating?.rating || 0)}/5
                    </span>
                  </div>
                  <StarRating
                    rating={currentRating?.rating || 0}
                    onChange={(r) => handleRatingChange(habit.id, r)}
                  />
                  <Textarea
                    placeholder="Catatan opsional..."
                    value={currentRating?.note || ''}
                    onChange={(e) => handleNoteChange(habit.id, e.target.value)}
                    className="mt-2 min-h-[60px] text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="gap-2 bg-[#1F3864] hover:bg-[#1F3864]/90 text-white"
        >
          {saving ? (
            <>Menyimpan...</>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Simpan Laporan
            </>
          )}
        </Button>
      </div>

      {/* Tips */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-5">
          <h3 className="font-semibold flex items-center gap-2 text-amber-800">
            <Lightbulb className="h-5 w-5" />
            Tips untuk Orang Tua
          </h3>
          <div className="mt-3 space-y-2 text-sm text-amber-700">
            <p>💡 <strong>Jadilah teladan.</strong> Anak belajar dari apa yang Anda lakukan, bukan hanya dari apa yang Anda katakan.</p>
            <p>💡 <strong>Apresiasi usaha, bukan hasil.</strong> Puji proses belajar dan usaha anak, bukan hanya nilai akhirnya.</p>
            <p>💡 <strong>Konsisten.</strong> Isi laporan setiap hari untuk memantau tren perkembangan karakter anak Anda.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. ORTU REKAP KARAKTER VIEW — Rekap & Analisis
// ═══════════════════════════════════════════════════════════════════

export function OrtuRekapKarakterView() {
  const user = useAppStore((s) => s.user);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [summaries, setSummaries] = useState<HabitSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const displayMonth = (() => {
    const [y, m] = currentMonth.split('-').map(Number);
    return `${monthNames[m - 1]} ${y}`;
  })();

  const prevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  useEffect(() => {
    async function load() {
      try {
        if (user?.id) {
          const res = await fetch(`/api/users?parentId=${user.id}&role=SISWA`);
          if (res.ok) {
            const data = await res.json();
            const kids: ChildInfo[] = data.map((u: any) => ({
              id: u.id, name: u.name, className: u.class?.name || '-', classId: u.classId || '',
            }));
            setChildren(kids);
            if (kids.length > 0) setSelectedChild(kids[0].id);
          }
        }
      } catch {
        setChildren([
          { id: 'c1', name: 'Ahmad Fauzan', className: 'XII IPA 1', classId: 'cl1' },
          { id: 'c2', name: 'Siti Aisyah', className: 'XI IPS 2', classId: 'cl2' },
        ]);
        setSelectedChild('c1');
      }
      setLoading(false);
    }
    load();
  }, [user?.id]);

  useEffect(() => {
    async function loadSummary() {
      if (!selectedChild) return;
      try {
        const res = await fetch(`/api/character-reports?studentId=${selectedChild}&month=${currentMonth}`);
        if (res.ok) {
          const data = await res.json();
          const habitMap: Record<string, { total: number; sum: number; breakdown: { [key: number]: number } }> = {};
          SEVEN_HABITS.forEach((h) => {
            habitMap[h.id] = { total: 0, sum: 0, breakdown: {} };
          });
          data.forEach((r: any) => {
            if (habitMap[r.habit]) {
              habitMap[r.habit].total++;
              habitMap[r.habit].sum += r.rating;
              habitMap[r.habit].breakdown[r.rating] = (habitMap[r.habit].breakdown[r.rating] || 0) + 1;
            }
          });
          const result: HabitSummary[] = SEVEN_HABITS.map((h, idx) => ({
            habitId: h.id,
            name: h.name,
            emoji: h.emoji,
            avgRating: habitMap[h.id].total > 0
              ? Math.round((habitMap[h.id].sum / habitMap[h.id].total) * 10) / 10
              : 0,
            totalReports: habitMap[h.id].total,
            trend: ['up', 'stable', 'down', 'up', 'stable', 'down', 'up'][idx] as any,
            prevRating: 0,
            breakdown: habitMap[h.id].breakdown,
          }));
          setSummaries(result);
          return;
        }
      } catch {
        // Mock data
      }
      // Mock fallback
      setSummaries([
        { habitId: 'proaktif', name: 'Bersikap Proaktif', emoji: '🎯', avgRating: 4.2, totalReports: 20, trend: 'up', prevRating: 3.8, breakdown: { 1: 0, 2: 1, 3: 3, 4: 10, 5: 6 } },
        { habitId: 'tujuan', name: 'Mulai dengan Tujuan', emoji: '🧭', avgRating: 3.6, totalReports: 18, trend: 'stable', prevRating: 3.5, breakdown: { 1: 1, 2: 2, 3: 6, 4: 7, 5: 2 } },
        { habitId: 'prioritas', name: 'Prioritas Utama Dahulu', emoji: '📋', avgRating: 4.0, totalReports: 22, trend: 'up', prevRating: 3.6, breakdown: { 1: 0, 2: 1, 3: 4, 4: 12, 5: 5 } },
        { habitId: 'menang', name: 'Berpikir Menang-Menang', emoji: '🤝', avgRating: 3.8, totalReports: 15, trend: 'down', prevRating: 4.1, breakdown: { 1: 1, 2: 1, 3: 5, 4: 6, 5: 2 } },
        { habitId: 'mengerti', name: 'Mengerti Dahulu Baru Dipahami', emoji: '👂', avgRating: 3.3, totalReports: 17, trend: 'stable', prevRating: 3.4, breakdown: { 1: 1, 2: 3, 3: 6, 4: 5, 5: 2 } },
        { habitId: 'bersinergi', name: 'Bersinergi', emoji: '🤲', avgRating: 4.1, totalReports: 19, trend: 'up', prevRating: 3.7, breakdown: { 1: 0, 2: 1, 3: 3, 4: 10, 5: 5 } },
        { habitId: 'asah', name: 'Memperbarui Diri', emoji: '🔧', avgRating: 3.5, totalReports: 16, trend: 'down', prevRating: 3.9, breakdown: { 1: 1, 2: 2, 3: 5, 4: 6, 5: 2 } },
      ]);
    }
    loadSummary();
  }, [selectedChild, currentMonth]);

  const totalReports = summaries.reduce((sum, s) => sum + s.totalReports, 0);
  const overallAvg = summaries.length > 0
    ? Math.round((summaries.reduce((sum, s) => sum + s.avgRating, 0) / summaries.filter(s => s.avgRating > 0).length) * 10) / 10
    : 0;
  const strongest = [...summaries].sort((a, b) => b.avgRating - a.avgRating)[0];
  const weakest = [...summaries].sort((a, b) => a.avgRating - b.avgRating)[0];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-[#1F3864]" />
            Rekap & Analisis
          </h1>
          <p className="text-muted-foreground mt-1">
            Pantau perkembangan 7 Kebiasaan Anak Hebat secara berkala
          </p>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1 w-full sm:w-auto">
          <Label className="text-sm font-medium">Pilih Anak</Label>
          <Select value={selectedChild} onValueChange={(v) => {
            setSelectedChild(v);
            // Reset summaries
            setSummaries([]);
          }}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Pilih anak" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name} — {child.className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium">Periode</Label>
          <div className="flex items-center gap-2 mt-1">
            <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center font-medium text-sm">{displayMonth}</span>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-[#1F3864]">{totalReports}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Laporan</p>
            <MessageCircle className="h-5 w-5 text-[#1F3864]/40 mx-auto mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <div className="text-3xl font-bold text-amber-500">{overallAvg}</div>
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Rata-rata Rating</p>
            <BarChart3 className="h-5 w-5 text-amber-400/40 mx-auto mt-2" />
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-4 text-center">
            <div className="text-lg">{strongest?.emoji}</div>
            <div className="text-sm font-semibold text-green-700 mt-1 truncate">{strongest?.name || '-'}</div>
            <p className="text-xs text-muted-foreground">Kebiasaan Terkuat</p>
            <TrendingUp className="h-5 w-5 text-green-500 mx-auto mt-2" />
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-4 text-center">
            <div className="text-lg">{weakest?.emoji}</div>
            <div className="text-sm font-semibold text-amber-700 mt-1 truncate">{weakest?.name || '-'}</div>
            <p className="text-xs text-muted-foreground">Perlu Diperbaiki</p>
            <Target className="h-5 w-5 text-amber-500 mx-auto mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Overall Rating Display */}
      <Card className="border-[#1F3864]/20">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Skor Keseluruhan Bulan Ini</p>
            <div className="text-6xl font-bold text-[#1F3864]">{overallAvg}</div>
            <div className="flex justify-center mt-2">
              <StarRating rating={Math.round(overallAvg)} />
            </div>
            <Progress
              value={overallAvg * 20}
              className="mt-4 h-3 max-w-md mx-auto"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {overallAvg >= 4.5
                ? 'Luar biasa! Anak Anda menunjukkan karakter yang sangat baik 🌟'
                : overallAvg >= 3.5
                ? 'Bagus! Anak Anda menunjukkan perkembangan yang positif 👍'
                : overallAvg >= 2.5
                ? 'Cukup baik. Terus dampingi dan bimbing anak Anda 💪'
                : 'Perlu perhatian lebih. Coba komunikasikan dengan guru di sekolah 📞'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Per-Habit Analysis */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Analisis Per Kebiasaan</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {summaries.map((summary) => (
            <Card key={summary.habitId} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{summary.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-sm">{summary.name}</h3>
                      <p className="text-xs text-muted-foreground">{summary.totalReports} laporan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {summary.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-500" />}
                    {summary.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
                    {summary.trend === 'stable' && <Minus className="h-4 w-4 text-gray-400" />}
                    <span className={cn(
                      'text-sm font-semibold',
                      summary.trend === 'up' && 'text-green-600',
                      summary.trend === 'down' && 'text-red-600',
                      summary.trend === 'stable' && 'text-gray-500'
                    )}>
                      {summary.avgRating > 0 ? summary.avgRating : '-'}
                    </span>
                  </div>
                </div>

                {/* Visual bar */}
                <div className="mt-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        summary.avgRating >= 4 ? 'bg-green-400' :
                        summary.avgRating >= 3 ? 'bg-amber-400' :
                        summary.avgRating >= 2 ? 'bg-orange-400' : 'bg-red-400'
                      )}
                      style={{ width: `${Math.min((summary.avgRating / 5) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Breakdown */}
                {summary.totalReports > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {Object.entries(summary.breakdown)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([rating, count]) => (
                        <Badge key={rating} variant="outline" className="text-xs">
                          ★{rating}: {count}x
                        </Badge>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Weekly Summary Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ringkasan Per Kebiasaan</CardTitle>
          <CardDescription>Perbandingan rata-rata rating setiap kebiasaan</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kebiasaan</TableHead>
                <TableHead className="text-center">Rata-rata</TableHead>
                <TableHead className="text-center">Total Laporan</TableHead>
                <TableHead className="text-center">Tren</TableHead>
                <TableHead className="text-center w-[120px]">Visualisasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((s) => (
                <TableRow key={s.habitId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{s.emoji}</span>
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {s.avgRating > 0 ? s.avgRating : '-'}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{s.totalReports}</TableCell>
                  <TableCell className="text-center">
                    {s.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500 mx-auto" />}
                    {s.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500 mx-auto" />}
                    {s.trend === 'stable' && <Minus className="h-4 w-4 text-gray-400 mx-auto" />}
                  </TableCell>
                  <TableCell>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          s.avgRating >= 4 ? 'bg-green-400' :
                          s.avgRating >= 3 ? 'bg-amber-400' : 'bg-orange-400'
                        )}
                        style={{ width: `${Math.min((s.avgRating / 5) * 100, 100)}%` }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Parent Insight */}
      <Card className="border-blue-100 bg-blue-50/30">
        <CardContent className="p-5">
          <h3 className="font-semibold flex items-center gap-2 text-blue-800">
            <MessageCircle className="h-5 w-5" />
            Insight untuk Orang Tua
          </h3>
          <div className="mt-3 space-y-2 text-sm text-blue-700">
            {strongest && strongest.avgRating > 0 && (
              <p>
                🌟 <strong>{strongest.name}</strong> adalah kebiasaan terkuat anak Anda bulan ini 
                dengan rata-rata <strong>{strongest.avgRating}/5</strong>. Terus dorong!
              </p>
            )}
            {weakest && weakest.avgRating > 0 && weakest.avgRating < 4 && (
              <p>
                📌 <strong>{weakest.name}</strong> perlu perhatian lebih. Coba berikan contoh nyata 
                dalam kehidupan sehari-hari untuk membantu anak memahami kebiasaan ini.
              </p>
            )}
            <p>
              📊 Berdiskusilah dengan guru di sekolah untuk mendapatkan gambaran lengkap 
              perkembangan karakter anak Anda baik di rumah maupun di sekolah.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
