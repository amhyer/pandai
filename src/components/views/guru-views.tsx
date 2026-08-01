'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Clock,
  Users,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  ClipboardList,
  FileBarChart,
  Download,
  Printer,
  GraduationCap,
  BookMarked,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  CircleSlash,
  Brain,
  Timer,
  Save,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// SHARED TYPES
// ═══════════════════════════════════════════════════════════════════

interface Materi {
  id: string;
  title: string;
  subject: string;
  description: string;
  date: string;
  status: 'published' | 'draft';
}

interface Soal {
  id: string;
  subject: string;
  topic: string;
  type: 'PG' | 'Isian' | 'Esai';
  difficulty: 'Mudah' | 'Sedang' | 'Sulit';
  status: 'Terpublikasi' | 'Draft';
  hots: boolean;
}

interface Tryout {
  id: string;
  title: string;
  subject: string;
  duration: string;
  questionCount: number;
  participants: number;
  status: 'Aktif' | 'Terjadwal' | 'Selesai';
}

interface NilaiSiswa {
  id: string;
  no: number;
  name: string;
  nisn: string;
  benar: number;
  salah: number;
  tidakDijawab: number;
  skor: number;
  nilai: string;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const SUBJECTS = ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Bahasa Indonesia', 'Bahasa Inggris'];

const SUBJECT_BADGE_COLORS: Record<string, string> = {
  Matematika: 'bg-blue-100 text-blue-700',
  Fisika: 'bg-purple-100 text-purple-700',
  Kimia: 'bg-green-100 text-green-700',
  Biologi: 'bg-emerald-100 text-emerald-700',
  'Bahasa Indonesia': 'bg-orange-100 text-orange-700',
  'Bahasa Inggris': 'bg-rose-100 text-rose-700',
};

const DIFFICULTY_BADGE: Record<string, string> = {
  Mudah: 'bg-green-100 text-green-700',
  Sedang: 'bg-amber-100 text-amber-700',
  Sulit: 'bg-red-100 text-red-700',
};

const DAYA_BEDA_COLORS: Record<string, string> = {
  Baik: 'bg-emerald-100 text-emerald-700',
  Cukup: 'bg-amber-100 text-amber-700',
  Kurang: 'bg-red-100 text-red-700',
};

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════

const MOCK_MATERI: Materi[] = [
  {
    id: 'm1',
    title: 'Persamaan Kuadrat & Fungsi Kuadrat',
    subject: 'Matematika',
    description: 'Materi mencakup konsep persamaan kuadrat, rumus abc, hubungan akar-akar persamaan kuadrat, serta grafik fungsi kuadrat.',
    date: '12 Jan 2025',
    status: 'published',
  },
  {
    id: 'm2',
    title: 'Hukum Newton tentang Gerak',
    subject: 'Fisika',
    description: 'Pembahasan tiga hukum Newton, penerapannya pada benda diam dan bergerak, serta contoh soal TKA yang sering muncul.',
    date: '10 Jan 2025',
    status: 'published',
  },
  {
    id: 'm3',
    title: 'Struktur Atom & Sistem Periodik',
    subject: 'Kimia',
    description: 'Teori atom, konfigurasi elektron, dan sifat-sifat unsur dalam tabel periodik berdasarkan perioda dan golongan.',
    date: '8 Jan 2025',
    status: 'published',
  },
  {
    id: 'm4',
    title: 'Sel sebagai Unit Terkecil Kehidupan',
    subject: 'Biologi',
    description: 'Struktur dan fungsi sel prokariotik dan eukariotik, organel sel, serta proses transportasi membran.',
    date: '5 Jan 2025',
    status: 'draft',
  },
  {
    id: 'm5',
    title: 'Teks Eksposisi & Argumentasi',
    subject: 'Bahasa Indonesia',
    description: 'Menganalisis struktur teks eksposisi dan argumentasi, mengidentifikasi tesis, argumentasi, dan penegasan ulang.',
    date: '3 Jan 2025',
    status: 'published',
  },
  {
    id: 'm6',
    title: 'Reading Comprehension: Narrative Text',
    subject: 'Bahasa Inggris',
    description: 'Teknik membaca pemahaman untuk teks naratif, mengidentifikasi generic structure, dan menjawab pertanyaan inferensial.',
    date: '1 Jan 2025',
    status: 'draft',
  },
  {
    id: 'm7',
    title: 'Trigonometri: Identitas & Persamaan',
    subject: 'Matematika',
    description: 'Identitas trigonometri dasar, penjumlahan dan selisih sudut, serta penyelesaian persamaan trigonometri.',
    date: '28 Des 2024',
    status: 'published',
  },
  {
    id: 'm8',
    title: 'Termodinamika & Entalpi',
    subject: 'Kimia',
    description: 'Konsep kalor reaksi, perubahan entalpi, hukum Hess, dan diagram tingkat energi reaksi.',
    date: '25 Des 2024',
    status: 'published',
  },
];

const MOCK_SOAL: Soal[] = [
  { id: 's1', subject: 'Matematika', topic: 'Aljabar Linear', type: 'PG', difficulty: 'Sedang', status: 'Terpublikasi', hots: true },
  { id: 's2', subject: 'Matematika', topic: 'Limit Fungsi', type: 'Isian', difficulty: 'Sulit', status: 'Terpublikasi', hots: true },
  { id: 's3', subject: 'Fisika', topic: 'Kinematika Gerak Lurus', type: 'PG', difficulty: 'Mudah', status: 'Terpublikasi', hots: false },
  { id: 's4', subject: 'Fisika', topic: 'Hukum Newton', type: 'PG', difficulty: 'Sedang', status: 'Terpublikasi', hots: true },
  { id: 's5', subject: 'Kimia', topic: 'Stoikiometri', type: 'Isian', difficulty: 'Sedang', status: 'Terpublikasi', hots: false },
  { id: 's6', subject: 'Kimia', topic: 'Ikatan Kimia', type: 'Esai', difficulty: 'Sulit', status: 'Draft', hots: true },
  { id: 's7', subject: 'Biologi', topic: 'Sel & Jaringan', type: 'PG', difficulty: 'Mudah', status: 'Terpublikasi', hots: false },
  { id: 's8', subject: 'Biologi', topic: 'Genetika', type: 'Esai', difficulty: 'Sulit', status: 'Draft', hots: true },
  { id: 's9', subject: 'Bahasa Indonesia', topic: 'Teks Narasi', type: 'PG', difficulty: 'Mudah', status: 'Terpublikasi', hots: false },
  { id: 's10', subject: 'Bahasa Indonesia', topic: 'Teks Eksposisi', type: 'Esai', difficulty: 'Sedang', status: 'Terpublikasi', hots: true },
  { id: 's11', subject: 'Bahasa Inggris', topic: 'Grammar: Tenses', type: 'PG', difficulty: 'Mudah', status: 'Terpublikasi', hots: false },
  { id: 's12', subject: 'Bahasa Inggris', topic: 'Reading Comprehension', type: 'PG', difficulty: 'Sedang', status: 'Draft', hots: false },
];

const MOCK_TRYOUT: Tryout[] = [
  { id: 't1', title: 'TKA Prediksi Senin - Matematika', subject: 'Matematika', duration: '90 menit', questionCount: 30, participants: 28, status: 'Aktif' },
  { id: 't2', title: 'TKA Prediksi Senin - Fisika', subject: 'Fisika', duration: '75 menit', questionCount: 25, participants: 28, status: 'Terjadwal' },
  { id: 't3', title: 'TKA Prediksi Senin - Kimia', subject: 'Kimia', duration: '75 menit', questionCount: 25, participants: 0, status: 'Terjadwal' },
  { id: 't4', title: 'Tryout Latihan 1 - Biologi', subject: 'Biologi', duration: '60 menit', questionCount: 20, participants: 32, status: 'Selesai' },
  { id: 't5', title: 'Tryout Latihan 1 - B. Indonesia', subject: 'Bahasa Indonesia', duration: '60 menit', questionCount: 20, participants: 32, status: 'Selesai' },
  { id: 't6', title: 'Tryout Latihan 2 - Matematika', subject: 'Matematika', duration: '90 menit', questionCount: 30, participants: 30, status: 'Selesai' },
];

const MOCK_NILAI: NilaiSiswa[] = [
  { id: 'n1', no: 1, name: 'Ahmad Rizky Pratama', nisn: '0051234001', benar: 22, salah: 5, tidakDijawab: 3, skor: 660, nilai: '82.5' },
  { id: 'n2', no: 2, name: 'Siti Nurhaliza', nisn: '0051234002', benar: 25, salah: 3, tidakDijawab: 2, skor: 750, nilai: '93.8' },
  { id: 'n3', no: 3, name: 'Budi Santoso', nisn: '0051234003', benar: 18, salah: 8, tidakDijawab: 4, skor: 540, nilai: '67.5' },
  { id: 'n4', no: 4, name: 'Dewi Kartika', nisn: '0051234004', benar: 20, salah: 6, tidakDijawab: 4, skor: 600, nilai: '75.0' },
  { id: 'n5', no: 5, name: 'Farhan Maulana', nisn: '0051234005', benar: 15, salah: 10, tidakDijawab: 5, skor: 450, nilai: '56.3' },
  { id: 'n6', no: 6, name: 'Gita Anjani', nisn: '0051234006', benar: 23, salah: 4, tidakDijawab: 3, skor: 690, nilai: '86.3' },
  { id: 'n7', no: 7, name: 'Hendra Wijaya', nisn: '0051234007', benar: 19, salah: 7, tidakDijawab: 4, skor: 570, nilai: '71.3' },
  { id: 'n8', no: 8, name: 'Indah Permata Sari', nisn: '0051234008', benar: 24, salah: 4, tidakDijawab: 2, skor: 720, nilai: '90.0' },
  { id: 'n9', no: 9, name: 'Joko Prasetyo', nisn: '0051234009', benar: 16, salah: 9, tidakDijawab: 5, skor: 480, nilai: '60.0' },
  { id: 'n10', no: 10, name: 'Kartika Dewi Putri', nisn: '0051234010', benar: 21, salah: 5, tidakDijawab: 4, skor: 630, nilai: '78.8' },
];

interface SubjectPerformance {
  subject: string;
  avg: number;
  max: number;
  min: number;
  students: number;
}

interface QuestionAnalysis {
  no: number;
  difficulty: string;
  dayaBeda: string;
  avgSkor: number;
}

const MOCK_SUBJECT_PERFORMANCE: SubjectPerformance[] = [
  { subject: 'Matematika', avg: 68.5, max: 95.0, min: 35.0, students: 32 },
  { subject: 'Fisika', avg: 62.3, max: 88.0, min: 30.0, students: 32 },
  { subject: 'Kimia', avg: 71.2, max: 92.0, min: 40.0, students: 32 },
  { subject: 'Biologi', avg: 74.8, max: 98.0, min: 45.0, students: 32 },
  { subject: 'Bahasa Indonesia', avg: 78.1, max: 95.0, min: 50.0, students: 32 },
  { subject: 'Bahasa Inggris', avg: 65.9, max: 90.0, min: 32.0, students: 32 },
];

const MOCK_QUESTION_ANALYSIS: QuestionAnalysis[] = [
  { no: 1, difficulty: 'Mudah', dayaBeda: 'Baik', avgSkor: 85.2 },
  { no: 2, difficulty: 'Mudah', dayaBeda: 'Baik', avgSkor: 82.0 },
  { no: 3, difficulty: 'Sedang', dayaBeda: 'Cukup', avgSkor: 62.5 },
  { no: 4, difficulty: 'Sedang', dayaBeda: 'Baik', avgSkor: 58.3 },
  { no: 5, difficulty: 'Sulit', dayaBeda: 'Kurang', avgSkor: 35.7 },
  { no: 6, difficulty: 'Sulit', dayaBeda: 'Baik', avgSkor: 42.1 },
  { no: 7, difficulty: 'Sedang', dayaBeda: 'Cukup', avgSkor: 55.0 },
  { no: 8, difficulty: 'Mudah', dayaBeda: 'Kurang', avgSkor: 90.1 },
  { no: 9, difficulty: 'Sedang', dayaBeda: 'Baik', avgSkor: 60.8 },
  { no: 10, difficulty: 'Sulit', dayaBeda: 'Cukup', avgSkor: 38.4 },
  { no: 11, difficulty: 'Mudah', dayaBeda: 'Baik', avgSkor: 78.5 },
  { no: 12, difficulty: 'Sedang', dayaBeda: 'Kurang', avgSkor: 52.3 },
  { no: 13, difficulty: 'Sulit', dayaBeda: 'Baik', avgSkor: 40.2 },
  { no: 14, difficulty: 'Mudah', dayaBeda: 'Cukup', avgSkor: 80.0 },
  { no: 15, difficulty: 'Sedang', dayaBeda: 'Baik', avgSkor: 64.7 },
];

interface ReportEntry {
  id: string;
  title: string;
  type: string;
  date: string;
  status: 'Selesai' | 'Diproses';
}

const REPORT_TYPES = [
  {
    id: 'rt1',
    title: 'Laporan Nilai Per Tryout',
    description: 'Rekap nilai seluruh siswa pada satu paket tryout lengkap dengan statistik.',
    icon: FileBarChart,
    color: 'text-[#1F3864]',
    bgColor: 'bg-[#1F3864]/10',
  },
  {
    id: 'rt2',
    title: 'Laporan Peringkat',
    description: 'Peringkat siswa berdasarkan total skor tryout, per kelas atau keseluruhan.',
    icon: Award,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'rt3',
    title: 'Laporan Per Mata Pelajaran',
    description: 'Analisis performa siswa per mata pelajaran dengan perbandingan antar kelas.',
    icon: BookMarked,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    id: 'rt4',
    title: 'Laporan Per Siswa',
    description: 'Laporan individual siswa berisi riwayat tryout, kekuatan, dan area perbaikan.',
    icon: GraduationCap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
];

const MOCK_REPORTS: ReportEntry[] = [
  { id: 'r1', title: 'Laporan Nilai - TKA Prediksi Senin (Matematika)', type: 'Nilai Per Tryout', date: '15 Jan 2025', status: 'Selesai' },
  { id: 'r2', title: 'Laporan Peringkat XII IPA 1 - Semester 1', type: 'Peringkat', date: '12 Jan 2025', status: 'Selesai' },
  { id: 'r3', title: 'Laporan Per Mata Pelajaran - Biologi', type: 'Per Mata Pelajaran', date: '10 Jan 2025', status: 'Diproses' },
  { id: 'r4', title: 'Laporan Individu - Ahmad Rizky Pratama', type: 'Per Siswa', date: '8 Jan 2025', status: 'Selesai' },
];

const TRYOUT_STATUS_BADGE: Record<string, { className: string; icon: React.ElementType }> = {
  Aktif: { className: 'bg-emerald-100 text-emerald-700', icon: CircleDot },
  Terjadwal: { className: 'bg-blue-100 text-blue-700', icon: CalendarClock },
  Selesai: { className: 'bg-gray-100 text-gray-600', icon: CheckCircle2 },
};

// ═══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-4 sm:p-6">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg', bgColor, color)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

function PerformanceBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full transition-all', color)}
        style={{ width: pct + '%' }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 1. GURU MATERI VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruMateriView() {
  const [activeTab, setActiveTab] = useState('Semua');
  const [loading, setLoading] = useState(false);

  const filteredMateri =
    activeTab === 'Semua'
      ? MOCK_MATERI
      : MOCK_MATERI.filter((m) => m.subject === activeTab);

  const totalMateri = MOCK_MATERI.length;
  const published = MOCK_MATERI.filter((m) => m.status === 'published').length;
  const draft = MOCK_MATERI.filter((m) => m.status === 'draft').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materi Ajar"
        description="Kelola materi pelajaran untuk persiapan TKA siswa Anda."
      >
        <Button
          className="bg-[#1F3864] hover:bg-[#152850]"
          onClick={() => toast.info('Fitur tambah materi segera hadir')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Materi
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Total Materi" value={totalMateri} color="text-[#1F3864]" bgColor="bg-[#1F3864]/10" />
        <StatCard icon={CheckCircle2} label="Dipublikasikan" value={published} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard icon={FileText} label="Draft" value={draft} color="text-amber-600" bgColor="bg-amber-50" />
      </div>

      {/* Tabs + Grid */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="Semua">Semua</TabsTrigger>
          {SUBJECTS.map((s) => (
            <TabsTrigger key={s} value={s}>
              {s}
            </TabsTrigger>
          ))}
        </TabsList>

        {SUBJECTS.concat('Semua').map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredMateri.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Belum ada materi"
                description="Materi untuk mata pelajaran ini belum tersedia. Klik 'Tambah Materi' untuk membuat materi baru."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMateri.map((materi) => (
                  <Card key={materi.id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{materi.title}</CardTitle>
                        {materi.status === 'draft' && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            Draft
                          </Badge>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          'w-fit text-xs',
                          SUBJECT_BADGE_COLORS[materi.subject] ?? 'bg-muted text-muted-foreground'
                        )}
                      >
                        {materi.subject}
                      </Badge>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col justify-between gap-4">
                      <p className="line-clamp-3 text-sm text-muted-foreground">{materi.description}</p>
                      <div className="flex items-center justify-between border-t pt-3">
                        <span className="text-xs text-muted-foreground">{materi.date}</span>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => toast.info('Membuka materi: ' + materi.title)}
                          >
                            <Eye className="h-3 w-3" />
                            Lihat Detail
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => toast.info('Mengedit materi: ' + materi.title)}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. GURU SOAL VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruSoalView() {
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = MOCK_SOAL.filter((s) => {
    if (
      search &&
      !s.topic.toLowerCase().includes(search.toLowerCase()) &&
      !s.subject.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (subjectFilter !== 'all' && s.subject !== subjectFilter) return false;
    if (difficultyFilter !== 'all' && s.difficulty !== difficultyFilter) return false;
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    return true;
  });

  const totalSoal = MOCK_SOAL.length;
  const terpublikasi = MOCK_SOAL.filter((s) => s.status === 'Terpublikasi').length;
  const draft = MOCK_SOAL.filter((s) => s.status === 'Draft').length;
  const hots = MOCK_SOAL.filter((s) => s.hots).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Soal"
        description="Kelola dan organisir soal-soal yang telah Anda buat untuk persiapan TKA."
      >
        <Button
          className="bg-[#1F3864] hover:bg-[#152850]"
          onClick={() => toast.info('Fitur pembuat soal segera hadir')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Buat Soal Baru
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={ClipboardList} label="Total Soal" value={totalSoal} color="text-[#1F3864]" bgColor="bg-[#1F3864]/10" />
        <StatCard icon={CheckCircle2} label="Terpublikasi" value={terpublikasi} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard icon={FileText} label="Draft" value={draft} color="text-amber-600" bgColor="bg-amber-50" />
        <StatCard icon={Brain} label="HOTS" value={hots} color="text-purple-600" bgColor="bg-purple-50" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari topik atau mata pelajaran..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Mata Pelajaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mapel</SelectItem>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Kesulitan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tingkat</SelectItem>
              <SelectItem value="Mudah">Mudah</SelectItem>
              <SelectItem value="Sedang">Sedang</SelectItem>
              <SelectItem value="Sulit">Sulit</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="PG">Pilihan Ganda</SelectItem>
              <SelectItem value="Isian">Isian Singkat</SelectItem>
              <SelectItem value="Esai">Esai</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Mata Pelajaran</TableHead>
                <TableHead>Topik</TableHead>
                <TableHead className="text-center">Tipe</TableHead>
                <TableHead className="text-center">Tingkat Kesulitan</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-24 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <EmptyState
                      icon={ClipboardList}
                      title="Tidak ada soal ditemukan"
                      description="Ubah filter atau buat soal baru untuk memulai."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((soal, idx) => (
                  <TableRow key={soal.id}>
                    <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'text-xs',
                          SUBJECT_BADGE_COLORS[soal.subject] ?? 'bg-muted text-muted-foreground'
                        )}
                      >
                        {soal.subject}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{soal.topic}</span>
                        {soal.hots && (
                          <Badge variant="outline" className="border-purple-300 text-xs text-purple-600">
                            <Brain className="mr-1 h-3 w-3" />
                            HOTS
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{soal.type}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn('text-xs', DIFFICULTY_BADGE[soal.difficulty])}>
                        {soal.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={soal.status === 'Terpublikasi' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {soal.status === 'Terpublikasi' ? (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        ) : (
                          <FileText className="mr-1 h-3 w-3" />
                        )}
                        {soal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toast.info('Edit soal: ' + soal.topic)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => toast.info('Hapus soal: ' + soal.topic)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. GURU TRYOUT VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruTryoutView() {
  const [activeTab, setActiveTab] = useState('Aktif');

  const filtered = MOCK_TRYOUT.filter((t) => t.status === activeTab);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Tryout"
        description="Buat, jadwalkan, dan pantau tryout untuk siswa Anda."
      >
        <Button
          className="bg-[#1F3864] hover:bg-[#152850]"
          onClick={() => toast.info('Fitur buat tryout segera hadir')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Buat Tryout
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="Aktif">
            <CircleDot className="mr-1.5 h-4 w-4 text-emerald-500" />
            Aktif
          </TabsTrigger>
          <TabsTrigger value="Terjadwal">
            <CalendarClock className="mr-1.5 h-4 w-4 text-blue-500" />
            Terjadwal
          </TabsTrigger>
          <TabsTrigger value="Selesai">
            <CheckCircle2 className="mr-1.5 h-4 w-4 text-gray-500" />
            Selesai
          </TabsTrigger>
        </TabsList>

        {['Aktif', 'Terjadwal', 'Selesai'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Judul Tryout</TableHead>
                      <TableHead>Mata Pelajaran</TableHead>
                      <TableHead className="text-center">Durasi</TableHead>
                      <TableHead className="text-center">Jumlah Soal</TableHead>
                      <TableHead className="text-center">Peserta</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-24 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48">
                          <EmptyState
                            icon={ClipboardList}
                            title={"Tidak ada tryout " + tab.toLowerCase()}
                            description={
                              tab === 'Aktif'
                                ? 'Tidak ada tryout yang sedang berlangsung saat ini.'
                                : tab === 'Terjadwal'
                                  ? 'Belum ada tryout yang dijadwalkan.'
                                  : 'Belum ada tryout yang selesai.'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((tryout) => {
                        const statusConf = TRYOUT_STATUS_BADGE[tryout.status];
                        const StatusIcon = statusConf.icon;
                        return (
                          <TableRow key={tryout.id}>
                            <TableCell className="font-medium">{tryout.title}</TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  'text-xs',
                                  SUBJECT_BADGE_COLORS[tryout.subject] ?? 'bg-muted text-muted-foreground'
                                )}
                              >
                                {tryout.subject}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1 text-sm">
                                <Timer className="h-4 w-4 text-muted-foreground" />
                                {tryout.duration}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{tryout.questionCount} soal</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {tryout.participants}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={cn('text-xs', statusConf.className)}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {tryout.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toast.info('Detail tryout: ' + tryout.title)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toast.info('Edit tryout: ' + tryout.title)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 4. GURU NILAI VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruNilaiView() {
  const [selectedClass, setSelectedClass] = useState('XII IPA 1');
  const [selectedTryout, setSelectedTryout] = useState('t1');
  const [nilaiMap, setNilaiMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const getNilai = useCallback(
    (id: string, defaultNilai: string) => nilaiMap[id] ?? defaultNilai,
    [nilaiMap]
  );

  const handleNilaiChange = useCallback((id: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setNilaiMap((prev) => ({ ...prev, [id]: value }));
    }
  }, []);

  const handleSave = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Nilai berhasil disimpan!');
    }, 1000);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Input & Kelola Nilai"
        description="Masukkan dan kelola nilai siswa berdasarkan hasil tryout."
      >
        <Button
          className="bg-[#1F3864] hover:bg-[#152850]"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Menyimpan...' : 'Simpan Nilai'}
        </Button>
      </PageHeader>

      {/* Selectors */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">Pilih Kelas</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <GraduationCap className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XII IPA 1">XII IPA 1</SelectItem>
                <SelectItem value="XII IPA 2">XII IPA 2</SelectItem>
                <SelectItem value="XII IPA 3">XII IPA 3</SelectItem>
                <SelectItem value="XII IPS 1">XII IPS 1</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">Pilih Tryout</label>
            <Select value={selectedTryout} onValueChange={setSelectedTryout}>
              <SelectTrigger>
                <ClipboardList className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="t1">TKA Prediksi Senin - Matematika</SelectItem>
                <SelectItem value="t2">TKA Prediksi Senin - Fisika</SelectItem>
                <SelectItem value="t4">Tryout Latihan 1 - Biologi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => toast.info('Memuat ulang data nilai...')}>
            Muat Data
          </Button>
        </CardContent>
      </Card>

      {/* Grade Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead className="text-center">NISN</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Benar
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CircleSlash className="h-3.5 w-3.5 text-red-500" />
                    Salah
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CircleSlash className="h-3.5 w-3.5 text-gray-400" />
                    Tidak Dijawab
                  </div>
                </TableHead>
                <TableHead className="text-center">Skor</TableHead>
                <TableHead className="w-32 text-center">Nilai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_NILAI.map((siswa) => {
                const currentNilai = getNilai(siswa.id, siswa.nilai);
                const numNilai = parseFloat(currentNilai);
                const nilaiColor =
                  numNilai >= 80 ? 'text-emerald-600' : numNilai >= 60 ? 'text-amber-600' : 'text-red-600';
                return (
                  <TableRow key={siswa.id}>
                    <TableCell className="text-center font-medium">{siswa.no}</TableCell>
                    <TableCell className="font-medium">{siswa.name}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{siswa.nisn}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                        {siswa.benar}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-red-300 text-red-700">
                        {siswa.salah}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-gray-300 text-gray-600">
                        {siswa.tidakDijawab}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{siswa.skor}</TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="text"
                        value={currentNilai}
                        onChange={(e) => handleNilaiChange(siswa.id, e.target.value)}
                        className={cn('h-8 w-20 text-center text-sm font-semibold', nilaiColor)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 5. GURU ANALISIS VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruAnalisisView() {
  const [selectedTryout, setSelectedTryout] = useState('t1');

  const avgKelas = 70.1;
  const nilaiTertinggi = 95.0;
  const nilaiTerendah = 30.0;
  const stdDeviasi = 14.2;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analisis Hasil Belajar"
        description="Analisis mendalam hasil tryout siswa untuk evaluasi pembelajaran."
      >
        <Select value={selectedTryout} onValueChange={setSelectedTryout}>
          <SelectTrigger className="w-[280px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="t1">TKA Prediksi Senin - Matematika</SelectItem>
            <SelectItem value="t4">Tryout Latihan 1 - Biologi</SelectItem>
            <SelectItem value="t6">Tryout Latihan 2 - Matematika</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={BarChart3} label="Rata-rata Kelas" value={avgKelas} color="text-[#1F3864]" bgColor="bg-[#1F3864]/10" />
        <StatCard icon={TrendingUp} label="Nilai Tertinggi" value={nilaiTertinggi} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard icon={TrendingDown} label="Nilai Terendah" value={nilaiTerendah} color="text-red-600" bgColor="bg-red-50" />
        <StatCard icon={Target} label="Standar Deviasi" value={stdDeviasi} color="text-amber-600" bgColor="bg-amber-50" />
      </div>

      {/* Subject Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performa Per Mata Pelajaran</CardTitle>
          <CardDescription>Rata-rata nilai siswa berdasarkan mata pelajaran</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {MOCK_SUBJECT_PERFORMANCE.map((sp) => (
              <div key={sp.subject} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        'text-xs',
                        SUBJECT_BADGE_COLORS[sp.subject] ?? 'bg-muted text-muted-foreground'
                      )}
                    >
                      {sp.subject}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{sp.students} siswa</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      Min: <span className="font-medium text-red-600">{sp.min}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Max: <span className="font-medium text-emerald-600">{sp.max}</span>
                    </span>
                    <span className="font-bold">{sp.avg}</span>
                  </div>
                </div>
                <PerformanceBar value={sp.avg} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Question Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analisis Butir Soal</CardTitle>
          <CardDescription>Detail performa setiap soal pada tryout yang dipilih</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20 text-center">Soal No</TableHead>
                <TableHead className="text-center">Tingkat Kesulitan</TableHead>
                <TableHead className="text-center">Daya Beda</TableHead>
                <TableHead className="text-center">Rata-rata Skor</TableHead>
                <TableHead className="min-w-[200px]">Distribusi Skor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_QUESTION_ANALYSIS.map((qa) => (
                <TableRow key={qa.no}>
                  <TableCell className="text-center font-semibold">{qa.no}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn('text-xs', DIFFICULTY_BADGE[qa.difficulty])}>
                      {qa.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn('text-xs', DAYA_BEDA_COLORS[qa.dayaBeda])}>
                      {qa.dayaBeda}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-semibold">{qa.avgSkor.toFixed(1)}</TableCell>
                  <TableCell>
                    <PerformanceBar value={qa.avgSkor} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 6. GURU LAPORAN VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruLaporanView() {
  const [activeTab, setActiveTab] = useState('buat');
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = useCallback((reportId: string, title: string) => {
    setGenerating(reportId);
    setTimeout(() => {
      setGenerating(null);
      toast.success('Laporan "' + title + '" berhasil dibuat!');
    }, 2000);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Siswa"
        description="Buat, unduh, dan kelola laporan hasil belajar siswa."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="buat">Buat Laporan</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat Laporan</TabsTrigger>
        </TabsList>

        {/* Buat Laporan */}
        <TabsContent value="buat" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {REPORT_TYPES.map((rt) => {
              const Icon = rt.icon;
              const isGenerating = generating === rt.id;
              return (
                <Card key={rt.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', rt.bgColor, rt.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{rt.title}</CardTitle>
                        <CardDescription className="mt-1 text-sm">{rt.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex justify-end gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleGenerate(rt.id, rt.title)}
                      disabled={isGenerating}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {isGenerating ? 'Memproses...' : 'Cetak'}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-[#1F3864] hover:bg-[#152850]"
                      onClick={() => handleGenerate(rt.id, rt.title)}
                      disabled={isGenerating}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {isGenerating ? 'Memproses...' : 'Unduh PDF'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Riwayat Laporan */}
        <TabsContent value="riwayat" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>Judul Laporan</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-center">Tanggal</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-24 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_REPORTS.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48">
                        <EmptyState
                          icon={FileBarChart}
                          title="Belum ada laporan"
                          description="Laporan yang telah dibuat akan ditampilkan di sini."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    MOCK_REPORTS.map((report, idx) => (
                      <TableRow key={report.id}>
                        <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{report.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{report.type}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{report.date}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={cn(
                              'text-xs',
                              report.status === 'Selesai'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            )}
                          >
                            {report.status === 'Selesai' ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : (
                              <Clock className="mr-1 h-3 w-3" />
                            )}
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toast.info('Mengunduh: ' + report.title)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toast.info('Mencetak: ' + report.title)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
