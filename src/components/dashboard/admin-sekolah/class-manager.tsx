'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  GraduationCap,
  Plus,
  Users,
  BookOpen,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getGradeOptions,
  getGradeLabel,
  getGradeColor,
  getGradeBg,
  extractGradeFromName,
} from '@/lib/school-grades';

// ─── Types ─────────────────────────────────────────────────────────

interface ClassInfo {
  className: string;
  studentCount: number;
}

interface ClassFormData {
  name: string;
  grade: string;
  academicYear: string;
}

// ─── Class Form Dialog ─────────────────────────────────────────────

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClassFormData) => void;
  isSubmitting: boolean;
  gradeOptions: string[];
}

function ClassFormDialog({ open, onOpenChange, onSubmit, isSubmitting, gradeOptions }: ClassFormDialogProps) {
  const [form, setForm] = useState<ClassFormData>({
    name: '',
    grade: gradeOptions[0] ?? '10',
    academicYear: new Date().getFullYear().toString(),
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
          <DialogTitle>Tambah Kelas Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">Nama Kelas *</Label>
            <Input
              id="class-name"
              placeholder="X IPA 1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class-grade">Tingkat</Label>
              <Select
                value={form.grade}
                onValueChange={(v) => setForm((f) => ({ ...f, grade: v }))}
              >
                <SelectTrigger id="class-grade">
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
              <Label htmlFor="class-year">Tahun Ajaran</Label>
              <Input
                id="class-year"
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
              {isSubmitting ? 'Menyimpan...' : 'Tambah Kelas'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function ClassManager() {
  const user = useAppStore((s) => s.user);
  const gradeOptions = getGradeOptions(user?.schoolType);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; role: string; className?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      setLoading(true);
      // Fetch all users (guru + siswa) to derive class info
      const [siswaRes, guruRes] = await Promise.all([
        fetch(`/api/users?schoolId=${user.schoolId}&role=SISWA`),
        fetch(`/api/users?schoolId=${user.schoolId}&role=GURU`),
      ]);

      const siswaData = siswaRes.ok ? (await siswaRes.json()) : [];
      const guruData = guruRes.ok ? (await guruRes.json()) : [];

      const siswaList = Array.isArray(siswaData) ? siswaData : siswaData.users ?? [];
      const guruList = Array.isArray(guruData) ? guruData : guruData.users ?? [];

      setAllUsers([...guruList, ...siswaList]);

      // Build class list from student classNames
      const classMap = new Map<string, number>();
      siswaList.forEach((s: { className?: string }) => {
        const cls = s.className?.trim();
        if (cls) {
          classMap.set(cls, (classMap.get(cls) ?? 0) + 1);
        }
      });

      setClasses(
        Array.from(classMap.entries()).map(([className, studentCount]) => ({
          className,
          studentCount,
        }))
      );
    } catch {
      toast.error('Gagal memuat data kelas');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (form: ClassFormData) => {
    if (!user?.schoolId) {
      toast.error('Data sekolah tidak ditemukan');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          grade: form.grade,
          academicYear: form.academicYear,
          schoolId: user.schoolId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Gagal membuat kelas (${res.status})`);
        return;
      }
      toast.success(`Kelas "${form.name}" berhasil dibuat!`);
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error('Gagal membuat kelas');
    } finally {
      setSubmitting(false);
    }
  };

  const totalStudents = allUsers.filter((u) => u.role === 'SISWA').length;
  const totalGuru = allUsers.filter((u) => u.role === 'GURU').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Kelas</h1>
          <p className="text-muted-foreground">Lihat dan kelola kelas di sekolah Anda.</p>
        </div>
        <Button
          className="bg-[#1F3864] hover:bg-[#152850]"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kelas
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Kelas</p>
              <p className="text-xl font-bold">{classes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Siswa</p>
              <p className="text-xl font-bold">{totalStudents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Guru</p>
              <p className="text-xl font-bold">{totalGuru}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-3" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : classes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const grade = extractGradeFromName(cls.className);
            return (
              <Card key={cls.className} className={`border-l-4 ${getGradeColor(grade)}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{cls.className}</CardTitle>
                  <CardDescription>
                    Tingkat {grade || '-'} • {new Date().getFullYear()}/{new Date().getFullYear() + 1}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{cls.studentCount} siswa</span>
                    </div>
                    {grade && (
                      <Badge className={getGradeBg(grade)} variant="outline">
                        <Hash className="mr-1 h-3 w-3" />
                        Kelas {grade}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm">Belum ada kelas. Tambah kelas dan assign siswa.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Class Form Dialog */}
      <ClassFormDialog
        key={dialogOpen ? 'class-form-open' : 'closed'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        gradeOptions={gradeOptions}
      />
    </div>
  );
}
