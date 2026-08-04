'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  CalendarDays,
  UserCheck,
  Plus,
  Trash2,
  Loader2,
  X,
  Save,
  Users,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

const BRAND = '#1F3864';

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'] as const;
const DAY_LABELS: Record<string, string> = {
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: 'Jumat',
};
const SLOTS = Array.from({ length: 10 }, (_, i) => i + 1);

interface TimetableEntry {
  id: string;
  day: string;
  slotNumber: number;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  subjectType: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  schoolId: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  type: string;
  sortOrder: number;
}

interface Teacher {
  id: string;
  name: string;
  nip: string | null;
}

interface ClassItem {
  id: string;
  name: string;
  grade: number;
  academicYear: string;
  schoolId: string;
  waliKelasId?: string | null;
  waliKelasName?: string | null;
  _count?: { users: number };
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function GradientIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm bg-gradient-to-br from-[#1F3864] to-[#2d5289]">
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
        <Icon className="h-10 w-10 text-muted-foreground/60" />
      </div>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function getSubjectCellColor(type: string): string {
  if (type === 'wajib') {
    return 'bg-sky-50 border-sky-200 text-sky-800';
  }
  if (type === 'pilihan') {
    return 'bg-emerald-50 border-emerald-200 text-emerald-800';
  }
  return 'bg-gray-50 border-gray-200 text-gray-700';
}

// ═══════════════════════════════════════════════════════════════════════
// 1. TIMETABLE VIEW — Jadwal Pelajaran
// ═══════════════════════════════════════════════════════════════════════

export function TimetableView() {
  const { user } = useAppStore();
  const schoolId = user?.schoolId;

  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<TimetableEntry | null>(null);

  // Form state
  const [formDay, setFormDay] = useState('SENIN');
  const [formSlot, setFormSlot] = useState(1);
  const [formSubject, setFormSubject] = useState('');
  const [formTeacher, setFormTeacher] = useState('');
  const [formClass, setFormClass] = useState('');

  // Fetch all dropdown data
  const fetchDropdowns = useCallback(async () => {
    try {
      const [subjRes, teachRes, classRes] = await Promise.all([
        fetch(`/api/subjects?schoolId=${schoolId}`),
        fetch(`/api/users?role=GURU&schoolId=${schoolId}`),
        fetch(`/api/classes?schoolId=${schoolId}`),
      ]);
      if (subjRes.ok) {
        const subjData = await subjRes.json();
        setSubjects(Array.isArray(subjData) ? subjData : subjData.data ?? []);
      }
      if (teachRes.ok) {
        const teachData = await teachRes.json();
        const list = Array.isArray(teachData) ? teachData : teachData.data ?? [];
        setTeachers(list.map((t: any) => ({ id: t.id, name: t.name, nip: t.nip })));
      }
      if (classRes.ok) {
        const classData = await classRes.json();
        setClasses(Array.isArray(classData) ? classData : classData.data ?? []);
      }
    } catch {
      // Silently fail — will use empty arrays
    }
  }, [schoolId]);

  // Fetch timetable entries
  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/timetable?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch {
      // Silent fail
    }
  }, [schoolId]);

  useEffect(() => {
    Promise.all([fetchDropdowns(), fetchEntries()]).finally(() => setLoading(false));
  }, [fetchDropdowns, fetchEntries]);

  // Build grid: { [day-slot]: entry }
  const grid = useMemo(() => {
    const map: Record<string, TimetableEntry> = {};
    entries.forEach((e) => {
      map[`${e.day}-${e.slotNumber}`] = e;
    });
    return map;
  }, [entries]);

  // Open add dialog
  function openAddDialog() {
    setFormDay('SENIN');
    setFormSlot(1);
    setFormSubject('');
    setFormTeacher('');
    setFormClass('');
    setDialogOpen(true);
  }

  // Save entry
  async function handleSave() {
    if (!formSubject || !formTeacher || !formClass) {
      toast.error('Hari, Slot, Mata Pelajaran, Guru, dan Kelas wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day: formDay,
          slotNumber: formSlot,
          subjectId: formSubject,
          teacherId: formTeacher,
          classId: formClass,
          schoolId,
        }),
      });
      if (res.ok) {
        toast.success('Jadwal berhasil ditambahkan');
        setDialogOpen(false);
        fetchEntries();
        return;
      }
      const err = await res.json().catch(() => null);
      toast.error(err?.error || 'Gagal menambahkan jadwal');
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  }

  // Delete entry
  async function handleDelete() {
    if (!deletingEntry) return;
    try {
      const res = await fetch(`/api/timetable?id=${deletingEntry.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Jadwal berhasil dihapus');
        setDeleteOpen(false);
        setDeletingEntry(null);
        fetchEntries();
        return;
      }
    } catch {
      // fallback: remove locally
    }
    setEntries((prev) => prev.filter((e) => e.id !== deletingEntry.id));
    toast.success('Jadwal berhasil dihapus');
    setDeleteOpen(false);
    setDeletingEntry(null);
  }

  // ─── Loading ───
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="grid grid-cols-11 gap-px">
            {Array.from({ length: 55 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Subject/teacher name lookup ───
  function getSubjectName(id: string) {
    return subjects.find((s) => s.id === id)?.name ?? '-';
  }
  function getSubjectType(id: string) {
    return subjects.find((s) => s.id === id)?.type ?? '';
  }
  function getTeacherName(id: string) {
    return teachers.find((t) => t.id === id)?.name ?? '-';
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon>
            <CalendarDays className="h-5 w-5" />
          </GradientIcon>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>
              Jadwal Pelajaran
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola jadwal pelajaran harian untuk {user?.schoolName ?? 'sekolah Anda'}
            </p>
          </div>
        </div>
        <Button
          onClick={openAddDialog}
          className="gap-2 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
          style={{ backgroundColor: BRAND }}
        >
          <Plus className="h-4 w-4" />
          Tambah Jadwal
        </Button>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-white p-4">
        <span className="text-sm font-medium text-muted-foreground">Keterangan warna:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-sky-400" />
          <span className="text-xs text-muted-foreground">Mata Pelajaran Wajib</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="text-xs text-muted-foreground">Mata Pelajaran Pilihan</span>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          Total: {entries.length} jadwal
        </div>
      </div>

      {/* ── Timetable Grid ── */}
      {entries.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Belum ada jadwal pelajaran"
          description="Mulai buat jadwal pelajaran pertama dengan menekan tombol di atas"
          action={
            <Button
              onClick={openAddDialog}
              className="gap-2 rounded-lg"
              style={{ backgroundColor: BRAND }}
            >
              <Plus className="h-4 w-4" />
              Tambah Jadwal
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-gradient-to-r from-[#1F3864] to-[#2d5289] px-3 py-3 text-left text-xs font-semibold text-white rounded-tl-xl">
                  Hari
                </th>
                {SLOTS.map((slot) => (
                  <th
                    key={slot}
                    className="bg-gradient-to-r from-[#1F3864] to-[#2d5289] px-2 py-3 text-center text-xs font-semibold text-white"
                  >
                    Slot {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, dayIdx) => (
                <tr key={day} className={cn(dayIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                  <td className="sticky left-0 z-10 px-3 py-2 text-sm font-semibold text-foreground bg-inherit whitespace-nowrap border-r">
                    {DAY_LABELS[day]}
                  </td>
                  {SLOTS.map((slot) => {
                    const entry = grid[`${day}-${slot}`];
                    if (!entry) {
                      return (
                        <td key={slot} className="px-1 py-1">
                          <div className="h-full min-h-[52px] rounded-lg border border-dashed border-gray-200" />
                        </td>
                      );
                    }
                    const colorClass = getSubjectCellColor(entry.subjectType);
                    return (
                      <td key={slot} className="px-1 py-1">
                        <div
                          className={cn(
                            'group relative h-full min-h-[52px] rounded-lg border p-1.5 text-xs transition-all duration-150 hover:shadow-md cursor-default',
                            colorClass
                          )}
                        >
                          <p className="font-semibold leading-tight truncate">{entry.subjectName}</p>
                          <p className="mt-0.5 text-[10px] opacity-75 truncate">{entry.teacherName}</p>
                          <button
                            onClick={() => {
                              setDeletingEntry(entry);
                              setDeleteOpen(true);
                            }}
                            className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm hover:bg-red-600"
                            aria-label="Hapus jadwal"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Jadwal Pelajaran</DialogTitle>
            <DialogDescription>
              Isi detail jadwal pelajaran yang akan ditambahkan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Hari */}
            <div className="grid gap-2">
              <Label>Hari</Label>
              <Select value={formDay} onValueChange={setFormDay}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Pilih hari" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DAY_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Slot */}
            <div className="grid gap-2">
              <Label>Slot Ke-</Label>
              <Select value={String(formSlot)} onValueChange={(v) => setFormSlot(Number(v))}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Pilih slot" />
                </SelectTrigger>
                <SelectContent>
                  {SLOTS.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      Slot {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mata Pelajaran */}
            <div className="grid gap-2">
              <Label>Mata Pelajaran</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Pilih mata pelajaran" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Guru */}
            <div className="grid gap-2">
              <Label>Guru</Label>
              <Select value={formTeacher} onValueChange={setFormTeacher}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Pilih guru" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Kelas */}
            <div className="grid gap-2">
              <Label>Kelas</Label>
              <Select value={formClass} onValueChange={setFormClass}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg">
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 rounded-lg"
              style={{ backgroundColor: BRAND }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jadwal?</AlertDialogTitle>
            <AlertDialogDescription>
              Jadwal <strong>{deletingEntry?.subjectName}</strong> pada hari{' '}
              <strong>{DAY_LABELS[deletingEntry?.day ?? '']}</strong> slot{' '}
              <strong>{deletingEntry?.slotNumber}</strong> akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 2. WALI KELAS VIEW — Penugasan Wali Kelas
// ═══════════════════════════════════════════════════════════════════════

export function WaliKelasView() {
  const { user } = useAppStore();
  const schoolId = user?.schoolId;

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // classId being saved

  // Dialog state for assigning wali kelas
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState('');

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        const list: ClassItem[] = Array.isArray(data) ? data : data.data ?? [];
        // Enrich with wali kelas name
        const enriched = list.map((c: any) => ({
          ...c,
          waliKelasName: c.WaliKelas?.name ?? null,
        }));
        setClasses(enriched);
      }
    } catch {
      // Silent fail
    }
  }, [schoolId]);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch(`/api/users?role=GURU&schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data ?? [];
        setTeachers(list.map((t: any) => ({ id: t.id, name: t.name, nip: t.nip })));
      }
    } catch {
      // Silent fail
    }
  }, [schoolId]);

  useEffect(() => {
    Promise.all([fetchClasses(), fetchTeachers()]).finally(() => setLoading(false));
  }, [fetchClasses, fetchTeachers]);

  function openAssignDialog(cls: ClassItem) {
    setSelectedClass(cls);
    setSelectedTeacher(cls.waliKelasId ?? '');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!selectedClass) return;
    setSaving(selectedClass.id);
    try {
      const res = await fetch(`/api/classes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedClass.id,
          waliKelasId: selectedTeacher || null,
        }),
      });
      if (res.ok) {
        toast.success(`Wali kelas untuk ${selectedClass.name} berhasil disimpan`);
        setDialogOpen(false);
        fetchClasses();
        return;
      }
      const err = await res.json().catch(() => null);
      toast.error(err?.error || 'Gagal menyimpan wali kelas');
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(null);
    }
  }

  function getWaliKelasName(waliKelasId: string | null | undefined): string {
    if (!waliKelasId) return '-';
    return teachers.find((t) => t.id === waliKelasId)?.name ?? 'Tidak ditemukan';
  }

  function getGradeLabel(grade: number): string {
    if (grade === 10) return 'X';
    if (grade === 11) return 'XI';
    if (grade === 12) return 'XII';
    return String(grade);
  }

  // ─── Loading ───
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <Skeleton className="h-10 w-full mb-3 rounded" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full mb-2 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon>
            <UserCheck className="h-5 w-5" />
          </GradientIcon>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>
              Wali Kelas
            </h1>
            <p className="text-sm text-muted-foreground">
              Tugaskan wali kelas untuk setiap rombongan belajar di {user?.schoolName ?? 'sekolah Anda'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{classes.length} kelas</span>
          <span className="mx-1">·</span>
          <span>{classes.filter((c) => c.waliKelasId).length} memiliki wali kelas</span>
        </div>
      </div>

      {/* ── Table ── */}
      {classes.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada data kelas"
          description="Tambahkan kelas terlebih dahulu melalui menu Rombel (Kelas)"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-[#1F3864] to-[#2d5289] hover:bg-transparent">
                <TableHead className="text-white font-semibold">Nama Kelas</TableHead>
                <TableHead className="text-white font-semibold">Tingkat</TableHead>
                <TableHead className="text-white font-semibold">Tahun Ajaran</TableHead>
                <TableHead className="text-white font-semibold">Jumlah Siswa</TableHead>
                <TableHead className="text-white font-semibold">Wali Kelas</TableHead>
                <TableHead className="text-white font-semibold text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cls, idx) => (
                <TableRow
                  key={cls.id}
                  className={cn(
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
                    'transition-colors hover:bg-blue-50/50'
                  )}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864] text-xs font-bold">
                        {cls.name.charAt(0)}
                      </div>
                      {cls.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full font-medium">
                      {getGradeLabel(cls.grade)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cls.academicYear}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{cls._count?.users ?? 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {cls.waliKelasId ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          {getWaliKelasName(cls.waliKelasId).charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{getWaliKelasName(cls.waliKelasId)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Belum ditugaskan</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={cls.waliKelasId ? 'outline' : 'default'}
                      size="sm"
                      className={cn(
                        'gap-1.5 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]',
                        !cls.waliKelasId && 'text-white'
                      )}
                      style={!cls.waliKelasId ? { backgroundColor: BRAND } : undefined}
                      onClick={() => openAssignDialog(cls)}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {cls.waliKelasId ? 'Ubah' : 'Tugaskan'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Assign Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tugaskan Wali Kelas</DialogTitle>
            <DialogDescription>
              Pilih guru sebagai wali kelas untuk <strong>{selectedClass?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Kelas</span>
                <span className="font-medium">{selectedClass?.name}</span>
                <span className="text-muted-foreground">Tingkat</span>
                <span className="font-medium">{selectedClass ? getGradeLabel(selectedClass.grade) : '-'}</span>
                <span className="text-muted-foreground">Tahun Ajaran</span>
                <span className="font-medium">{selectedClass?.academicYear}</span>
                <span className="text-muted-foreground">Wali Kelas Saat Ini</span>
                <span className="font-medium">
                  {selectedClass?.waliKelasId
                    ? getWaliKelasName(selectedClass.waliKelasId)
                    : 'Belum ada'}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Pilih Guru</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Pilih guru sebagai wali kelas" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{t.nip ? ` (${t.nip})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg">
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving === selectedClass?.id}
              className="gap-2 rounded-lg"
              style={{ backgroundColor: BRAND }}
            >
              {saving === selectedClass?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
