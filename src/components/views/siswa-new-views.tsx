'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Calculator,
  Atom,
  FlaskConical,
  Leaf,
  Languages,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  FileText,
  ClipboardList,
  Timer,
  PlayCircle,
  Eye,
  CalendarDays,
  TrendingUp,
  XCircle,
  ArrowRight,
  Sparkles,
  GraduationCap,
  BookMarked,
  BookCheck,
  ChevronDown,
  ChevronUp,
  Calendar,
  UserCheck,
  BriefcaseMedical,
  X,
  BarChart3,
  Loader2,
  FileQuestion,
  Trophy,
  Target,
  AlertTriangle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
//  SHARED TYPES
// ═══════════════════════════════════════════════════════════════════════

interface Material {
  id: string;
  title: string;
  description: string;
  subject: string;
  date: string;
  isRead: boolean;
}

interface SubjectData {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgLight: string;
  borderColor: string;
  materials: Material[];
}

interface Task {
  id: string;
  title: string;
  type: 'tugas' | 'kuis' | 'ujian';
  subject: string;
  dueDate: string;
  status: 'menunggu' | 'dikerjakan' | 'selesai' | 'terlambat';
  isUrgent: boolean;
  score?: number;
}

interface AttendanceDay {
  day: number;
  status: 'hadir' | 'izin' | 'sakit' | 'alpa' | 'weekend' | 'none';
}

// ═══════════════════════════════════════════════════════════════════════
//  BRAND CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const BRAND = '#1F3864';
const BRAND_LIGHT = '#E8EDF5';
const BRAND_DARK = '#152A4A';

// ═══════════════════════════════════════════════════════════════════════
//  MOCK DATA
// ═══════════════════════════════════════════════════════════════════════

const MOCK_SUBJECTS: SubjectData[] = [
  {
    id: 'matematika',
    name: 'Matematika',
    icon: <Calculator className="h-6 w-6" />,
    color: 'text-rose-600',
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200',
    materials: [
      { id: 'm1', title: 'Persamaan Kuadrat', description: 'Memahami bentuk umum persamaan kuadrat dan cara menyelesaikannya.', subject: 'Matematika', date: '2025-01-10', isRead: true },
      { id: 'm2', title: 'Fungsi Kuadrat', description: 'Grafik dan sifat-sifat fungsi kuadrat.', subject: 'Matematika', date: '2025-01-15', isRead: true },
      { id: 'm3', title: 'Sistem Persamaan Linear', description: 'Metode eliminasi dan substitusi untuk menyelesaikan SPLDV.', subject: 'Matematika', date: '2025-01-20', isRead: false },
      { id: 'm4', title: 'Logaritma', description: 'Sifat-sifat logaritma dan penerapannya.', subject: 'Matematika', date: '2025-01-25', isRead: false },
    ],
  },
  {
    id: 'fisika',
    name: 'Fisika',
    icon: <Atom className="h-6 w-6" />,
    color: 'text-blue-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    materials: [
      { id: 'f1', title: 'Hukum Newton', description: 'Tiga hukum gerak Newton dan penerapannya dalam kehidupan sehari-hari.', subject: 'Fisika', date: '2025-01-08', isRead: true },
      { id: 'f2', title: 'Usaha dan Energi', description: 'Konsep usaha, energi kinetik, dan energi potensial.', subject: 'Fisika', date: '2025-01-14', isRead: true },
      { id: 'f3', title: 'Momentum dan Impuls', description: 'Hukum kekekalan momentum dan tumbukan.', subject: 'Fisika', date: '2025-01-22', isRead: false },
    ],
  },
  {
    id: 'kimia',
    name: 'Kimia',
    icon: <FlaskConical className="h-6 w-6" />,
    color: 'text-purple-600',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    materials: [
      { id: 'k1', title: 'Struktur Atom', description: 'Model atom, partikel penyusun atom, dan konfigurasi elektron.', subject: 'Kimia', date: '2025-01-09', isRead: true },
      { id: 'k2', title: 'Ikatan Kimia', description: 'Ikatan ion, ikatan kovalen, dan ikatan logam.', subject: 'Kimia', date: '2025-01-16', isRead: true },
      { id: 'k3', title: 'Sistem Periodik Unsur', description: 'Tren sifat unsur dalam periode dan golongan.', subject: 'Kimia', date: '2025-01-23', isRead: false },
      { id: 'k4', title: 'Reaksi Kimia', description: 'Jenis-jenis reaksi kimia dan persamaan reaksi.', subject: 'Kimia', date: '2025-01-28', isRead: false },
    ],
  },
  {
    id: 'biologi',
    name: 'Biologi',
    icon: <Leaf className="h-6 w-6" />,
    color: 'text-green-600',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    materials: [
      { id: 'b1', title: 'Sel dan Organel', description: 'Struktur sel prokariotik dan eukariotik beserta fungsinya.', subject: 'Biologi', date: '2025-01-07', isRead: true },
      { id: 'b2', title: 'Jaringan Tumbuhan', description: 'Jenis-jenis jaringan pada tumbuhan dan fungsinya.', subject: 'Biologi', date: '2025-01-13', isRead: false },
      { id: 'b3', title: 'Fotosintesis', description: 'Proses fotosintesis dan faktor-faktor yang mempengaruhinya.', subject: 'Biologi', date: '2025-01-19', isRead: false },
    ],
  },
  {
    id: 'bindo',
    name: 'Bahasa Indonesia',
    icon: <BookOpen className="h-6 w-6" />,
    color: 'text-amber-600',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    materials: [
      { id: 'bi1', title: 'Teks Eksplanasi', description: 'Struktur dan ciri-ciri teks eksplanasi.', subject: 'Bahasa Indonesia', date: '2025-01-11', isRead: true },
      { id: 'bi2', title: 'Teks Persuasi', description: 'Teknik persuasi dalam teks dan iklan.', subject: 'Bahasa Indonesia', date: '2025-01-18', isRead: false },
      { id: 'bi3', title: 'Cerpen dan Unsur Intrinsik', description: 'Menganalisis unsur intrinsik cerpen.', subject: 'Bahasa Indonesia', date: '2025-01-24', isRead: false },
    ],
  },
  {
    id: 'bing',
    name: 'Bahasa Inggris',
    icon: <Languages className="h-6 w-6" />,
    color: 'text-cyan-600',
    bgLight: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    materials: [
      { id: 'be1', title: 'Past Tense & Present Perfect', description: 'Perbedaan penggunaan past tense dan present perfect.', subject: 'Bahasa Inggris', date: '2025-01-12', isRead: true },
      { id: 'be2', title: 'Passive Voice', description: 'Membuat kalimat pasif dalam berbagai tenses.', subject: 'Bahasa Inggris', date: '2025-01-17', isRead: true },
      { id: 'be3', title: 'Conditional Sentences', description: 'Tipe 0, 1, 2, dan 3 kalimat bersyarat.', subject: 'Bahasa Inggris', date: '2025-01-26', isRead: false },
      { id: 'be4', title: 'Analytical Exposition Text', description: 'Struktur dan bahasa teks eksposisi analitis.', subject: 'Bahasa Inggris', date: '2025-01-29', isRead: false },
    ],
  },
];

const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Latihan Soal Persamaan Kuadrat', type: 'tugas', subject: 'Matematika', dueDate: '2025-01-20', status: 'selesai', isUrgent: false, score: 85 },
  { id: 't2', title: 'Kuis Hukum Newton', type: 'kuis', subject: 'Fisika', dueDate: '2025-01-22', status: 'selesai', isUrgent: false, score: 90 },
  { id: 't3', title: 'Tugas Laporan Praktikum Ikatan Kimia', type: 'tugas', subject: 'Kimia', dueDate: '2025-01-28', status: 'menunggu', isUrgent: true },
  { id: 't4', title: 'Ujian Tengah Semester Biologi', type: 'ujian', subject: 'Biologi', dueDate: '2025-02-01', status: 'menunggu', isUrgent: false },
  { id: 't5', title: 'Essay Teks Eksplanasi', type: 'tugas', subject: 'Bahasa Indonesia', dueDate: '2025-01-15', status: 'terlambat', isUrgent: false },
  { id: 't6', title: 'Kuis Passive Voice', type: 'kuis', subject: 'Bahasa Inggris', dueDate: '2025-01-25', status: 'menunggu', isUrgent: true },
  { id: 't7', title: 'Tugas Analisis Data Fotosintesis', type: 'tugas', subject: 'Biologi', dueDate: '2025-01-30', status: 'dikerjakan', isUrgent: false },
  { id: 't8', title: 'Tryout UTBK Matematika', type: 'ujian', subject: 'Matematika', dueDate: '2025-02-05', status: 'menunggu', isUrgent: false },
  { id: 't9', title: 'Kuis Teks Persuasi', type: 'kuis', subject: 'Bahasa Indonesia', dueDate: '2025-01-18', status: 'selesai', isUrgent: false, score: 78 },
  { id: 't10', title: 'Tugas Reaksi Kimia', type: 'tugas', subject: 'Kimia', dueDate: '2025-01-12', status: 'selesai', isUrgent: false, score: 92 },
];

function generateMockAttendance(year: number, month: number): AttendanceDay[] {
  const days: AttendanceDay[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const statuses: Array<'hadir' | 'izin' | 'sakit' | 'alpa'> = ['hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'izin', 'sakit', 'alpa'];
  let statusIdx = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) {
      days.push({ day: d, status: 'weekend' });
    } else {
      const s = statuses[statusIdx % statuses.length];
      days.push({ day: d, status: s });
      statusIdx++;
    }
  }
  return days;
}

// ═══════════════════════════════════════════════════════════════════════
//  1. SISWA MATERI VIEW
// ═══════════════════════════════════════════════════════════════════════

export function SiswaMateriView() {
  const { user } = useAppStore();
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('semua');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMaterials() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          schoolId: user?.schoolId || '',
          classId: user?.classId || '',
          type: 'materi',
          status: 'published',
        });
        const res = await fetch(`/api/materials?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Map API data into our subject structure
            const mapped = MOCK_SUBJECTS.map((subj) => {
              const apiMaterials = (data as Material[]).filter(
                (m) => m.subject === subj.name
              );
              return apiMaterials.length > 0
                ? { ...subj, materials: apiMaterials }
                : subj;
            });
            setSubjects(mapped);
          } else {
            setSubjects(MOCK_SUBJECTS);
          }
        } else {
          setSubjects(MOCK_SUBJECTS);
        }
      } catch {
        setSubjects(MOCK_SUBJECTS);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMaterials();
  }, [user?.schoolId, user?.classId]);

  const toggleSubject = useCallback((subjectId: string) => {
    setExpandedSubject((prev) => (prev === subjectId ? null : subjectId));
  }, []);

  const filteredSubjects = useMemo(() => {
    return subjects.map((subj) => {
      let mats = subj.materials;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        mats = mats.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q)
        );
      }

      // Tab filter
      if (activeTab === 'belum') {
        mats = mats.filter((m) => !m.isRead);
      } else if (activeTab === 'selesai') {
        mats = mats.filter((m) => m.isRead);
      }

      return { ...subj, materials: mats, filteredCount: mats.length };
    });
  }, [subjects, searchQuery, activeTab]);

  const totalMaterials = useMemo(
    () => subjects.reduce((sum, s) => sum + s.materials.length, 0),
    [subjects]
  );
  const totalRead = useMemo(
    () => subjects.reduce((sum, s) => sum + s.materials.filter((m) => m.isRead).length, 0),
    [subjects]
  );
  const overallProgress = totalMaterials > 0 ? Math.round((totalRead / totalMaterials) * 100) : 0;

  const handleMarkRead = (materialId: string, subjectId: string) => {
    setSubjects((prev) =>
      prev.map((subj) => {
        if (subj.id !== subjectId) return subj;
        return {
          ...subj,
          materials: subj.materials.map((m) =>
            m.id === materialId ? { ...m, isRead: true } : m
          ),
        };
      })
    );
    toast.success('Materi ditandai sudah dibaca!');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Hero Banner ── */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 md:p-8"
        style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-5" style={{ background: 'white', transform: 'translate(-30%, 30%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
              <BookMarked className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Materi Pelajaran</h1>
          </div>
          <p className="text-white/80 text-sm md:text-base mb-4">
            Kelas {user?.className || 'XII IPA'} — Semua materi tersedia untuk dipelajari
          </p>
          <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span>{totalMaterials} Materi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookCheck className="h-4 w-4" />
              <span>{totalRead} Selesai</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span>{overallProgress}% Progres</span>
            </div>
          </div>
          <div className="mt-4 w-full max-w-xs">
            <div className="flex items-center justify-between text-xs text-white/70 mb-1">
              <span>Progres Keseluruhan</span>
              <span>{overallProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari materi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9">
            <TabsTrigger value="semua" className="text-xs px-3">Semua</TabsTrigger>
            <TabsTrigger value="belum" className="text-xs px-3">Belum Dibaca</TabsTrigger>
            <TabsTrigger value="selesai" className="text-xs px-3">Selesai</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Subject Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.map((subj) => {
          const total = subj.materials.length;
          const completed = subj.materials.filter((m) => m.isRead).length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const isExpanded = expandedSubject === subj.id;

          return (
            <div key={subj.id} className="space-y-2">
              <Card
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-2',
                  isExpanded ? subj.borderColor : 'border-transparent'
                )}
                onClick={() => toggleSubject(subj.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2.5 rounded-xl shrink-0', subj.bgLight, subj.color)}>
                      {subj.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm truncate">{subj.name}</h3>
                        <div className="flex items-center gap-1 text-muted-foreground shrink-0 ml-2">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        <span>{total} materi</span>
                        <span className="font-medium" style={{ color: BRAND }}>{completed} selesai</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs font-medium" style={{ color: BRAND }}>{pct}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Expanded Material List ── */}
              {isExpanded && (
                <div className="space-y-2 pl-2">
                  {subj.materials.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-4 text-center text-muted-foreground text-sm">
                        Tidak ada materi yang sesuai filter.
                      </CardContent>
                    </Card>
                  ) : (
                    subj.materials.map((mat) => (
                      <Card key={mat.id} className="transition-all duration-150 hover:shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={cn('mt-0.5 shrink-0', mat.isRead ? 'text-emerald-500' : 'text-muted-foreground')}>
                              {mat.isRead ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={cn('text-sm font-medium truncate', mat.isRead ? 'text-muted-foreground' : 'font-semibold')}>{mat.title}</h4>
                                <Badge
                                  variant={mat.isRead ? 'secondary' : 'default'}
                                  className={cn('text-[10px] px-1.5 py-0', !mat.isRead && 'bg-amber-500 hover:bg-amber-600 text-white')}
                                >
                                  {mat.isRead ? 'Dibaca' : 'Belum'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{mat.description}</p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <CalendarDays className="h-3 w-3" />
                                  <span>{new Date(mat.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                                {!mat.isRead && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs px-3"
                                    style={{ backgroundColor: BRAND }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkRead(mat.id, subj.id);
                                    }}
                                  >
                                    <PlayCircle className="h-3.5 w-3.5 mr-1" />
                                    Mulai Belajar
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Empty State ── */}
      {!isLoading && filteredSubjects.every((s) => s.materials.length === 0) && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-muted-foreground">Tidak ada materi ditemukan</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Coba ubah kata kunci pencarian atau filter.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  2. SISWA TUGAS VIEW
// ═══════════════════════════════════════════════════════════════════════

export function SiswaTugasView() {
  const { user } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('semua');

  useEffect(() => {
    async function fetchTasks() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          schoolId: user?.schoolId || '',
          classId: user?.classId || '',
          type: 'tugas',
          status: 'published',
        });
        const res = await fetch(`/api/materials?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Map API data to Task interface
            const mapped: Task[] = data.map((item: any) => ({
              id: item.id,
              title: item.title,
              type: (item.type || 'tugas') as Task['type'],
              subject: item.subject?.name || 'Umum',
              dueDate: item.dueDate || '2025-12-31',
              status: 'menunggu' as const,
              isUrgent: false,
            }));
            setTasks(mapped);
          } else {
            setTasks(MOCK_TASKS);
          }
        } else {
          setTasks(MOCK_TASKS);
        }
      } catch {
        setTasks(MOCK_TASKS);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTasks();
  }, [user?.schoolId, user?.classId]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (activeTab === 'tugas') filtered = tasks.filter((t) => t.type === 'tugas');
    else if (activeTab === 'kuis') filtered = tasks.filter((t) => t.type === 'kuis');
    else if (activeTab === 'ujian') filtered = tasks.filter((t) => t.type === 'ujian');
    return filtered;
  }, [tasks, activeTab]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const menunggu = tasks.filter((t) => t.status === 'menunggu').length;
    const selesai = tasks.filter((t) => t.status === 'selesai').length;
    const terlambat = tasks.filter((t) => t.status === 'terlambat').length;
    return { total, menunggu, selesai, terlambat };
  }, [tasks]);

  const getTypeIcon = (type: Task['type']) => {
    switch (type) {
      case 'tugas': return <FileText className="h-4 w-4" />;
      case 'kuis': return <FileQuestion className="h-4 w-4" />;
      case 'ujian': return <ClipboardList className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: Task['type']) => {
    switch (type) {
      case 'tugas': return 'Tugas';
      case 'kuis': return 'Kuis';
      case 'ujian': return 'Ujian';
    }
  };

  const getTypeBadgeClass = (type: Task['type']) => {
    switch (type) {
      case 'tugas': return 'bg-sky-100 text-sky-700 hover:bg-sky-100';
      case 'kuis': return 'bg-violet-100 text-violet-700 hover:bg-violet-100';
      case 'ujian': return 'bg-orange-100 text-orange-700 hover:bg-orange-100';
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'menunggu':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[11px]">Menunggu</Badge>;
      case 'dikerjakan':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[11px]">Dikerjakan</Badge>;
      case 'selesai':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[11px]">Selesai</Badge>;
      case 'terlambat':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[11px]">Terlambat</Badge>;
    }
  };

  const handleStartTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'dikerjakan' as const } : t))
    );
    toast.success('Tugas dimulai! Semangat mengerjakan! 💪');
  };

  const handleViewResult = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    toast.info(`Nilai ${task?.title}: ${task?.score}/100`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-72 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Tugas', value: stats.total, icon: <ClipboardList className="h-5 w-5" />, bg: 'bg-slate-50', color: 'text-slate-600' },
    { label: 'Menunggu', value: stats.menunggu, icon: <Clock className="h-5 w-5" />, bg: 'bg-amber-50', color: 'text-amber-600' },
    { label: 'Selesai', value: stats.selesai, icon: <CheckCircle2 className="h-5 w-5" />, bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { label: 'Terlambat', value: stats.terlambat, icon: <AlertCircle className="h-5 w-5" />, bg: 'bg-red-50', color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: BRAND_LIGHT }}>
          <Target className="h-6 w-6" style={{ color: BRAND }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND }}>Tugas & Ujian</h1>
          <p className="text-sm text-muted-foreground">Kelola dan pantau semua tugasmu di sini</p>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl', s.bg, s.color)}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: BRAND }}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="semua">Semua</TabsTrigger>
          <TabsTrigger value="tugas">Tugas</TabsTrigger>
          <TabsTrigger value="kuis">Kuis</TabsTrigger>
          <TabsTrigger value="ujian">Ujian/Tryout</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted w-fit mx-auto mb-4">
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground">Belum ada tugas</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {activeTab === 'semua'
                  ? 'Semua tugas sudah selesai dikerjakan. Kerja bagus!'
                  : `Tidak ada ${getTypeLabel(activeTab as Task['type'])} untuk saat ini.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((task) => {
                const isActionable = task.status === 'menunggu' || task.status === 'dikerjakan';
                const isCompleted = task.status === 'selesai' || task.status === 'terlambat';

                return (
                  <Card
                    key={task.id}
                    className={cn(
                      'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden',
                      task.isUrgent && isActionable && 'border-l-4 border-l-red-500'
                    )}
                  >
                    <CardContent className="p-4 md:p-5">
                      {/* Urgent banner */}
                      {task.isUrgent && isActionable && (
                        <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium mb-3">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Segera dikerjakan!</span>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn('text-[10px] px-2 py-0.5', getTypeBadgeClass(task.type))}>
                            {getTypeIcon(task.type)}
                            <span className="ml-1">{getTypeLabel(task.type)}</span>
                          </Badge>
                          {getStatusBadge(task.status)}
                        </div>
                        {task.score !== undefined && isCompleted && (
                          <div className={cn('text-sm font-bold', task.score >= 75 ? 'text-emerald-600' : 'text-red-500')}>
                            {task.score}
                          </div>
                        )}
                      </div>

                      <h3 className="font-semibold text-sm md:text-base mb-1 line-clamp-2">{task.title}</h3>

                      <div className="space-y-1.5 mb-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>{task.subject}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>
                            {task.type === 'ujian' ? 'Jadwal' : 'Tenggat'}: {new Date(task.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        {isActionable && (
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            style={{ backgroundColor: BRAND }}
                            onClick={() => handleStartTask(task.id)}
                          >
                            {task.status === 'dikerjakan' ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                Lanjutkan
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-3.5 w-3.5 mr-1" />
                                Mulai Kerjakan
                              </>
                            )}
                          </Button>
                        )}
                        {isCompleted && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => handleViewResult(task.id)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Lihat Hasil
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  3. SISWA KEHADIRAN VIEW
// ═══════════════════════════════════════════════════════════════════════

export function SiswaKehadiranView() {
  const { user } = useAppStore();
  const [attendance, setAttendance] = useState<AttendanceDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    async function fetchAttendance() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          studentId: user?.id || '',
          month: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
        });
        const res = await fetch(`/api/attendance?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setAttendance(data as AttendanceDay[]);
          } else {
            setAttendance(generateMockAttendance(currentYear, currentMonth));
          }
        } else {
          setAttendance(generateMockAttendance(currentYear, currentMonth));
        }
      } catch {
        setAttendance(generateMockAttendance(currentYear, currentMonth));
      } finally {
        setIsLoading(false);
      }
    }
    fetchAttendance();
  }, [user?.id, currentYear, currentMonth]);

  const stats = useMemo(() => {
    const hadir = attendance.filter((a) => a.status === 'hadir').length;
    const izin = attendance.filter((a) => a.status === 'izin').length;
    const sakit = attendance.filter((a) => a.status === 'sakit').length;
    const alpa = attendance.filter((a) => a.status === 'alpa').length;
    const totalSchoolDays = hadir + izin + sakit + alpa;
    const pct = totalSchoolDays > 0 ? Math.round((hadir / totalSchoolDays) * 100) : 0;
    return { hadir, izin, sakit, alpa, totalSchoolDays, pct };
  }, [attendance]);

  const prevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDayStatus = (day: number): AttendanceDay['status'] => {
    const found = attendance.find((a) => a.day === day);
    return found ? found.status : 'none';
  };

  const getCellColor = (status: AttendanceDay['status']) => {
    switch (status) {
      case 'hadir': return 'bg-emerald-500 text-white';
      case 'izin': return 'bg-blue-500 text-white';
      case 'sakit': return 'bg-amber-500 text-white';
      case 'alpa': return 'bg-red-500 text-white';
      case 'weekend': return 'bg-muted/50 text-muted-foreground/50';
      default: return 'bg-background text-muted-foreground/30';
    }
  };

  // Build calendar grid cells
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const statItems = [
    { label: 'Hadir', value: stats.hadir, icon: <UserCheck className="h-5 w-5" />, bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { label: 'Izin', value: stats.izin, icon: <BriefcaseMedical className="h-5 w-5" />, bg: 'bg-blue-50', color: 'text-blue-600' },
    { label: 'Sakit', value: stats.sakit, icon: <AlertCircle className="h-5 w-5" />, bg: 'bg-amber-50', color: 'text-amber-600' },
    { label: 'Alpa', value: stats.alpa, icon: <XCircle className="h-5 w-5" />, bg: 'bg-red-50', color: 'text-red-600' },
  ];

  const legendItems = [
    { color: 'bg-emerald-500', label: 'Hadir' },
    { color: 'bg-blue-500', label: 'Izin' },
    { color: 'bg-amber-500', label: 'Sakit' },
    { color: 'bg-red-500', label: 'Alpa' },
    { color: 'bg-muted/50', label: 'Akhir Pekan' },
    { color: 'bg-background border', label: 'Tidak Ada Data' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: BRAND_LIGHT }}>
          <CalendarDays className="h-6 w-6" style={{ color: BRAND }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND }}>Kehadiran Saya</h1>
          <p className="text-sm text-muted-foreground">Pantau rekam kehadiranmu setiap bulan</p>
        </div>
      </div>

      {/* ── Month Selector ── */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-bold capitalize" style={{ color: BRAND }}>{monthName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToToday}>
              Hari Ini
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statItems.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl', s.bg, s.color)}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: BRAND }}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Attendance Percentage ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Circular Progress */}
            <div className="relative shrink-0">
              <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={stats.pct >= 80 ? '#10B981' : stats.pct >= 60 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - stats.pct / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-2xl font-bold" style={{ color: BRAND }}>{stats.pct}%</span>
                </div>
              </div>
            </div>

            {/* Text summary */}
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold mb-1" style={{ color: BRAND }}>Persentase Kehadiran</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Kamu hadir <span className="font-semibold text-emerald-600">{stats.hadir}</span> dari{' '}
                <span className="font-semibold">{stats.totalSchoolDays}</span> hari sekolah bulan ini
              </p>
              {stats.pct >= 90 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  <Trophy className="h-3.5 w-3.5" />
                  Luar biasa! Terus pertahankan!
                </div>
              ) : stats.pct >= 75 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5" />
                  Bagus! Tingkatkan lagi kehadiranmu.
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Perbaiki kehadiranmu bulan depan.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Calendar Grid ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: BRAND }}>
            <Calendar className="h-4 w-4" />
            Kalender Kehadiran
          </CardTitle>
          <CardDescription>Klik pada tanggal untuk melihat detail kehadiran</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayLabels.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const status = getDayStatus(day);
              const isToday =
                day === new Date().getDate() &&
                currentMonth === new Date().getMonth() &&
                currentYear === new Date().getFullYear();

              return (
                <button
                  key={day}
                  className={cn(
                    'aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all duration-150 hover:scale-110 hover:shadow-md relative',
                    getCellColor(status),
                    isToday && 'ring-2 ring-offset-2 ring-[#1F3864]'
                  )}
                  onClick={() => {
                    const statusLabels: Record<string, string> = {
                      hadir: 'Hadir',
                      izin: 'Izin',
                      sakit: 'Sakit',
                      alpa: 'Alpa',
                      weekend: 'Akhir Pekan',
                      none: 'Tidak Ada Data',
                    };
                    toast.info(`${day} ${monthName}: ${statusLabels[status] || status}`);
                  }}
                  title={
                    status === 'hadir' ? 'Hadir' :
                    status === 'izin' ? 'Izin' :
                    status === 'sakit' ? 'Sakit' :
                    status === 'alpa' ? 'Alpa' :
                    status === 'weekend' ? 'Akhir Pekan' :
                    'Tidak Ada Data'
                  }
                >
                  {day}
                  {isToday && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: BRAND }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn('w-3 h-3 rounded-sm shrink-0', item.color)} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
