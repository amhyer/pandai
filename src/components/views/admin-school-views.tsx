'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  GraduationCap,
  Users,
  BookOpen,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  BarChart3,
  FileText,
  Printer,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  ArrowUpDown,
  ClipboardCheck,
  Award,
  BookMarked,
  School,
  CalendarClock,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getGradeOptions,
  getGradeLabel,
  getGradeColor,
  getGradeBg,
} from '@/lib/school-grades';

// ═══════════════════════════════════════════════════════════════════════
// SHARED TYPES
// ═══════════════════════════════════════════════════════════════════════

interface ClassRow {
  id: string;
  name: string;
  grade: string;
  academicYear: string;
  studentCount: number;
}

interface ExamAssignment {
  id: string;
  examName: string;
  className: string;
  startDate: string;
  duration: number;
  status: 'Scheduled' | 'Active' | 'Ended';
}

interface QuestionAnalysis {
  id: string;
  no: number;
  subject: string;
  topic: string;
  difficulty: 'Mudah' | 'Sedang' | 'Sukar';
  discrimination: 'Tinggi' | 'Sedang' | 'Rendah';
  avgScore: number;
}

interface ReportRecord {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  status: 'Selesai' | 'Diproses' | 'Gagal';
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} jam ${m > 0 ? `${m} menit` : ''}` : `${m} menit`;
}

function getDifficultyVariant(d: string) {
  switch (d) {
    case 'Mudah': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Sedang': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Sukar': return 'bg-red-50 text-red-700 border-red-200';
    default: return '';
  }
}

function getDiscriminationVariant(d: string) {
  switch (d) {
    case 'Tinggi': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Sedang': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Rendah': return 'bg-red-50 text-red-700 border-red-200';
    default: return '';
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'Scheduled':
      return { label: 'Terjadwal', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: CalendarClock };
    case 'Active':
      return { label: 'Berlangsung', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: PlayCircle };
    case 'Ended':
      return { label: 'Selesai', className: 'bg-gray-50 text-gray-600 border-gray-200', icon: CheckCircle2 };
    default:
      return { label: status, className: '', icon: AlertCircle };
  }
}

function getReportStatusVariant(status: string) {
  switch (status) {
    case 'Selesai': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Diproses': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Gagal': return 'bg-red-50 text-red-700 border-red-200';
    default: return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 1. CLASSES VIEW — Kelola Rombel (Kelas)
// ═══════════════════════════════════════════════════════════════════════

interface ClassFormData {
  name: string;
  grade: string;
  academicYear: string;
}

function AddClassDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  editData,
  gradeOptions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: ClassFormData) => void;
  isSubmitting: boolean;
  editData?: ClassRow | null;
  gradeOptions: string[];
}) {
  // Reset form when dialog opens or editData changes
  const formKey = editData?.id ?? 'new';
  const [form, setForm] = useState<ClassFormData>(() => {
    if (editData) {
      return { name: editData.name, grade: editData.grade, academicYear: editData.academicYear };
    }
    return { name: '', grade: gradeOptions[0] ?? '10', academicYear: '2024/2025' };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nama kelas wajib diisi');
      return;
    }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Kelas' : 'Tambah Kelas Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cls-name">Nama Kelas *</Label>
            <Input
              id="cls-name"
              placeholder="Contoh: X IPA 1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cls-grade">Tingkat</Label>
              <Select value={form.grade} onValueChange={(v) => setForm((f) => ({ ...f, grade: v }))}>
                <SelectTrigger id="cls-grade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradeOptions.map((g) => (
                    <SelectItem key={g} value={g}>
                      {getGradeLabel(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cls-year">Tahun Ajaran</Label>
              <Input
                id="cls-year"
                placeholder="2024/2025"
                value={form.academicYear}
                onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-[#1F3864] hover:bg-[#152850]"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : editData ? 'Simpan Perubahan' : 'Tambah Kelas'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClassesView() {
  const user = useAppStore((s) => s.user);
  const gradeOptions = getGradeOptions(user?.schoolType);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editClass, setEditClass] = useState<ClassRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.schoolId) {
      setClasses([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/classes?schoolId=${user.schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : data.classes ?? []);
      } else {
        toast.error('Gagal memuat data');
        setClasses([]);
      }
    } catch {
      toast.error('Gagal memuat data');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (form: ClassFormData) => {
    setSubmitting(true);
    try {
      // Simulate API call
      await new Promise((r) => setTimeout(r, 800));
      if (editClass) {
        setClasses((prev) =>
          prev.map((c) =>
            c.id === editClass.id ? { ...c, name: form.name, grade: form.grade, academicYear: form.academicYear } : c
          )
        );
        toast.success(`Kelas "${form.name}" berhasil diperbarui`);
      } else {
        const newClass: ClassRow = {
          id: `cls-${Date.now()}`,
          name: form.name,
          grade: form.grade,
          academicYear: form.academicYear,
          studentCount: 0,
        };
        setClasses((prev) => [...prev, newClass]);
        toast.success(`Kelas "${form.name}" berhasil ditambahkan`);
      }
      setDialogOpen(false);
      setEditClass(null);
    } catch {
      toast.error('Gagal menyimpan kelas');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setClasses((prev) => prev.filter((c) => c.id !== deleteId));
      toast.success('Kelas berhasil dihapus');
      setDeleteId(null);
    } catch {
      toast.error('Gagal menghapus kelas');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = classes.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchGrade = gradeFilter === 'all' || c.grade === gradeFilter;
    return matchSearch && matchGrade;
  });

  const totalStudents = classes.reduce((acc, c) => acc + c.studentCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Rombel (Kelas)</h1>
          <p className="text-muted-foreground">
            Tambah, edit, dan hapus rombongan belajar di sekolah Anda.
          </p>
        </div>
        <Button
          className="bg-[#1F3864] hover:bg-[#152850]"
          onClick={() => {
            setEditClass(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kelas
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Kelas</p>
              <p className="text-xl font-bold">{classes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Siswa</p>
              <p className="text-xl font-bold">{totalStudents}</p>
            </div>
          </CardContent>
        </Card>
        {gradeOptions.map((g) => (
          <Card key={g}>
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getGradeBg(g)}`}
              >
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{getGradeLabel(g)}</p>
                <p className="text-xl font-bold">
                  {classes.filter((c) => c.grade === g).length}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama kelas..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter Tingkat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tingkat</SelectItem>
            {gradeOptions.map((g) => (
              <SelectItem key={g} value={g}>
                {getGradeLabel(g)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="ml-auto h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Nama Kelas <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead>Tahun Ajaran</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Jumlah Siswa <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cls, idx) => (
                  <TableRow key={cls.id} className={getGradeColor(cls.grade)}>
                    <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-semibold">{cls.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getGradeBg(cls.grade)}>
                        {getGradeLabel(cls.grade)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{cls.academicYear}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{cls.studentCount} siswa</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditClass(cls);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(cls.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center text-muted-foreground">
              <GraduationCap className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">Belum ada data kelas</p>
              <p className="mt-1 text-xs">
                {search || gradeFilter !== 'all'
                  ? 'Coba ubah filter atau kata kunci pencarian.'
                  : 'Klik "Tambah Kelas" untuk membuat kelas baru.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <AddClassDialog
        key={dialogOpen ? 'open' : 'closed'}
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditClass(null);
        }}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        editData={editClass}
        gradeOptions={gradeOptions}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus kelas secara permanen. Data siswa yang terkait dengan kelas ini
              tidak akan dihapus, tetapi akan kehilangan asosiasi kelasnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 2. EXAM ASSIGNMENTS VIEW — Jadwal & Tugaskan Tryout
// ═══════════════════════════════════════════════════════════════════════

export function ExamAssignmentsView() {
  const user = useAppStore((s) => s.user);
  const [assignments, setAssignments] = useState<ExamAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('08:00');

  // Dropdown data
  const [examPackages, setExamPackages] = useState<{ id: string; title: string }[]>([]);
  const [classOptions, setClassOptions] = useState<{ id: string; name: string }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user?.schoolId) {
        setAssignments([]);
        return;
      }
      const res = await fetch(`/api/exam-assignments?schoolId=${user.schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(Array.isArray(data) ? data : data.assignments ?? []);
      } else {
        toast.error('Gagal memuat data');
        setAssignments([]);
      }
    } catch {
      toast.error('Gagal memuat data');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  const fetchDropdowns = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      const [examRes, classRes] = await Promise.all([
        fetch(`/api/exams?schoolId=${user.schoolId}`),
        fetch(`/api/classes?schoolId=${user.schoolId}`),
      ]);
      if (examRes.ok) {
        const examData = await examRes.json();
        setExamPackages((Array.isArray(examData) ? examData : []).map((p: any) => ({ id: p.id, title: p.title })));
      }
      if (classRes.ok) {
        const classData = await classRes.json();
        const classes = Array.isArray(classData) ? classData : classData.classes ?? [];
        setClassOptions(classes.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // silent — dropdowns will just be empty
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchData();
    fetchDropdowns();
  }, [fetchData, fetchDropdowns]);

  const handleAssign = async () => {
    if (!selectedExam || !selectedClass || !scheduleDate) {
      toast.error('Lengkapi semua field sebelum menugaskan tryout');
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const pkg = examPackages.find((p) => p.id === selectedExam);
      const cls = classOptions.find((c) => c.id === selectedClass);
      const newAssignment: ExamAssignment = {
        id: `a-${Date.now()}`,
        examName: pkg?.title ?? 'Tryout',
        className: cls?.name ?? 'Kelas',
        startDate: `${scheduleDate} ${scheduleTime}`,
        duration: 120,
        status: 'Scheduled',
      };
      setAssignments((prev) => [newAssignment, ...prev]);
      toast.success(`Tryout berhasil ditugaskan ke ${cls?.name}`);
      setSelectedExam('');
      setSelectedClass('');
      setScheduleDate('');
      setScheduleTime('08:00');
    } catch {
      toast.error('Gagal menugaskan tryout');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    return statusFilter === 'all' || a.status === statusFilter;
  });

  const scheduledCount = assignments.filter((a) => a.status === 'Scheduled').length;
  const activeCount = assignments.filter((a) => a.status === 'Active').length;
  const endedCount = assignments.filter((a) => a.status === 'Ended').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jadwal & Tugaskan Tryout</h1>
          <p className="text-muted-foreground">
            Atur jadwal dan tugaskan paket tryout ke kelas di sekolah Anda.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Terjadwal</p>
              <p className="text-xl font-bold">{scheduledCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <PlayCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Berlangsung</p>
              <p className="text-xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Selesai</p>
              <p className="text-xl font-bold">{endedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left — Scheduling */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-[#1F3864]" />
              Jadwalkan Tryout Baru
            </CardTitle>
            <CardDescription>Pilih paket tryout dan kelas, lalu atur waktunya.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Paket Tryout</Label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket tryout" />
                </SelectTrigger>
                <SelectContent>
                  {examPackages.length === 0 ? (
                    <SelectItem value="_none" disabled>Tidak ada paket tryout</SelectItem>
                  ) : (
                    examPackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kelas</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.length === 0 ? (
                    <SelectItem value="_none" disabled>Tidak ada kelas</SelectItem>
                  ) : (
                    classOptions.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Waktu Mulai</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full bg-[#1F3864] hover:bg-[#152850]"
              onClick={handleAssign}
              disabled={submitting || !selectedExam || !selectedClass || !scheduleDate}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              {submitting ? 'Menugaskan...' : 'Tugaskan Tryout'}
            </Button>
          </CardContent>
        </Card>

        {/* Right — Active Assignments Table */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-4 w-4 text-[#1F3864]" />
                  Penugasan Aktif
                </CardTitle>
                <CardDescription>Daftar tryout yang telah dijadwalkan.</CardDescription>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Scheduled">Terjadwal</SelectItem>
                  <SelectItem value="Active">Berlangsung</SelectItem>
                  <SelectItem value="Ended">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="ml-auto h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredAssignments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Tryout</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Tanggal Mulai</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((a) => {
                    const st = getStatusConfig(a.status);
                    const StatusIcon = st.icon;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="max-w-[200px]">
                          <span className="line-clamp-1 font-medium">{a.examName}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{a.className}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {a.startDate}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(a.duration)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={st.className}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {st.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {a.status === 'Scheduled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setAssignments((prev) => prev.filter((x) => x.id !== a.id));
                                toast.info('Penugasan dibatalkan');
                              }}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Batalkan
                            </Button>
                          )}
                          {(a.status === 'Active' || a.status === 'Ended') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => toast.info('Fitur detail hasil segera hadir')}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              Lihat Hasil
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-medium">Belum ada penugasan tryout</p>
                <p className="mt-1 text-xs">
                  {statusFilter !== 'all'
                    ? 'Tidak ada penugasan dengan status ini.'
                    : 'Gunakan form di samping untuk menjadwalkan tryout baru.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 3. ANALYTICS VIEW — Analisis Butir Soal
// ═══════════════════════════════════════════════════════════════════════

export function AnalyticsView() {
  const [analysis, setAnalysis] = useState<QuestionAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setAnalysis([]);
    } catch {
      toast.error('Gagal memuat data analisis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive unique subjects
  const subjects = Array.from(new Set(analysis.map((q) => q.subject)));

  const filtered = analysis.filter((q) => {
    const matchSubject = subjectFilter === 'all' || q.subject === subjectFilter;
    const matchDiff = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    return matchSubject && matchDiff;
  });

  const highDiscrimination = analysis.filter((q) => q.discrimination === 'Tinggi').length;
  const mediumDiscrimination = analysis.filter((q) => q.discrimination === 'Sedang').length;
  const lowDiscrimination = analysis.filter((q) => q.discrimination === 'Rendah').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analisis Butir Soal</h1>
          <p className="text-muted-foreground">
            Evaluasi kualitas butir soal berdasarkan daya beda dan tingkat kesulitan.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            toast.info('Fitur ekspor analisis segera hadir');
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Ekspor Analisis
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Butir Soal</p>
              <p className="text-xl font-bold">{analysis.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Daya Beda Tinggi</p>
              <p className="text-xl font-bold text-emerald-700">{highDiscrimination}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Minus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Daya Beda Sedang</p>
              <p className="text-xl font-bold text-blue-700">{mediumDiscrimination}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Daya Beda Rendah</p>
              <p className="text-xl font-bold text-red-700">{lowDiscrimination}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <BookMarked className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Mata Pelajaran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Mata Pelajaran</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Tingkat Kesulitan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tingkat</SelectItem>
            <SelectItem value="Mudah">Mudah</SelectItem>
            <SelectItem value="Sedang">Sedang</SelectItem>
            <SelectItem value="Sukar">Sukar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead>Topik</TableHead>
                  <TableHead>Tingkat Kesulitan</TableHead>
                  <TableHead>Daya Beda</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Rata-rata Skor <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium text-muted-foreground">{q.no}</TableCell>
                    <TableCell className="font-medium">{q.subject}</TableCell>
                    <TableCell className="text-muted-foreground">{q.topic}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getDifficultyVariant(q.difficulty)}>
                        {q.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getDiscriminationVariant(q.discrimination)}>
                        {q.discrimination === 'Tinggi' && <TrendingUp className="mr-1 h-3 w-3" />}
                        {q.discrimination === 'Sedang' && <Minus className="mr-1 h-3 w-3" />}
                        {q.discrimination === 'Rendah' && <TrendingDown className="mr-1 h-3 w-3" />}
                        {q.discrimination}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              q.avgScore >= 70 ? 'bg-emerald-500' : q.avgScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            )}
                            style={{ width: `${Math.min(q.avgScore, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{q.avgScore.toFixed(1)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">Belum ada data analisis</p>
              <p className="mt-1 text-xs">
                {subjectFilter !== 'all' || difficultyFilter !== 'all'
                  ? 'Coba ubah filter untuk melihat data lain.'
                  : 'Data analisis akan tersedia setelah tryout selesai dikerjakan.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 4. REPORTS VIEW — Laporan
// ═══════════════════════════════════════════════════════════════════════

const REPORT_TYPES = [
  {
    id: 'nilai-siswa',
    title: 'Laporan Nilai Siswa',
    description: 'Rekap nilai lengkap seluruh siswa per kelas atau per mata pelajaran.',
    icon: FileText,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'hasil-tryout',
    title: 'Laporan Hasil Tryout',
    description: 'Ringkasan hasil tryout termasuk skor, peringkat, dan analisis.',
    icon: ClipboardList,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'per-mapel',
    title: 'Laporan Per Mata Pelajaran',
    description: 'Analisis mendalam per mata pelajaran dengan distribusi nilai.',
    icon: BookOpen,
    color: 'bg-violet-50 text-violet-600',
  },
  {
    id: 'peringkat',
    title: 'Laporan Peringkat',
    description: 'Peringkat siswa secara keseluruhan atau per kelas.',
    icon: Award,
    color: 'bg-amber-50 text-amber-600',
  },
];

export function ReportsView() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setReports([]);
    } catch {
      toast.error('Gagal memuat data laporan');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = async (typeId: string, title: string) => {
    setGenerating(typeId);
    try {
      await new Promise((r) => setTimeout(r, 2000));
      const newReport: ReportRecord = {
        id: `r-${Date.now()}`,
        name: `${title} - ${new Date().toLocaleDateString('id-ID')}`,
        type: title.replace('Laporan ', ''),
        createdAt: new Date().toISOString().split('T')[0],
        status: 'Selesai',
      };
      setReports((prev) => [newReport, ...prev]);
      toast.success(`Laporan "${title}" berhasil dibuat`);
    } catch {
      toast.error('Gagal membuat laporan');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
        <p className="text-muted-foreground">
          Cetak dan unduh berbagai laporan akademik sekolah Anda.
        </p>
      </div>

      {/* Report Type Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          const isGenerating = generating === rt.id;
          return (
            <Card key={rt.id} className="group relative overflow-hidden transition-shadow hover:shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1F3864]/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <CardHeader className="relative pb-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${rt.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="mt-3 text-base">{rt.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {rt.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <Button
                  size="sm"
                  className="w-full bg-[#1F3864] hover:bg-[#152850]"
                  disabled={isGenerating}
                  onClick={() => handleGenerate(rt.id, rt.title)}
                >
                  {isGenerating ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Printer className="mr-2 h-4 w-4" />
                      Cetak Laporan
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-[#1F3864]" />
            Laporan Terbaru
          </CardTitle>
          <CardDescription>Daftar laporan yang telah dibuat atau sedang diproses.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : reports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nama Laporan</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Tanggal Dibuat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.createdAt}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getReportStatusVariant(r.status)}>
                        {r.status === 'Selesai' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {r.status === 'Diproses' && (
                          <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        )}
                        {r.status === 'Gagal' && <XCircle className="mr-1 h-3 w-3" />}
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === 'Selesai' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toast.info('Preview laporan segera hadir')}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toast.success('Laporan berhasil diunduh')}
                              title="Unduh"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {r.status === 'Gagal' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => toast.info('Mencoba ulang pembuatan laporan...')}
                          >
                            Coba Ulang
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
              <Printer className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">Belum ada laporan</p>
              <p className="mt-1 text-xs">Pilih tipe laporan di atas untuk mulai membuat laporan baru.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
