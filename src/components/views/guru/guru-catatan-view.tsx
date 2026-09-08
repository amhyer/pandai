'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  NotebookPen,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Smile,
  Wrench,
  AlertCircle,
  FileText,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface StudentItem {
  id: string;
  name: string;
  nisn?: string | null;
  class?: { id: string; name: string } | null;
}

interface CatatanItem {
  id: string;
  studentId: string;
  classId: string | null;
  term: string;
  date: string;
  category: string;
  content: string;
  createdAt: string;
  student: StudentItem;
  teacher: { id: string; name: string };
  subject?: { id: string; name: string } | null;
}

const CATEGORIES = [
  { value: 'umum', label: 'Umum', icon: FileText, badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'apresiasi', label: 'Apresiasi', icon: Smile, badge: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { value: 'perbaikan', label: 'Perbaikan', icon: Wrench, badge: 'bg-amber-50 text-amber-600 border-amber-200' },
  { value: 'perhatian', label: 'Perlu Perhatian', icon: AlertCircle, badge: 'bg-red-50 text-red-600 border-red-200' },
];

function categoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[0];
}

function currentTerm(d = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const pair = m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  return `${pair}-${m >= 7 ? 'Ganjil' : 'Genap'}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════════
// VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruCatatanView() {
  const user = useAppStore((s) => s.user);
  const schoolId = user?.schoolId || '';

  // ── Filter ──
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState('');
  const [term, setTerm] = useState(currentTerm());
  const [categoryFilter, setCategoryFilter] = useState('all');

  // ── Data ──
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [catatanList, setCatatanList] = useState<CatatanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Dialog buat/edit ──
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    studentId: '',
    subjectId: '',
    date: todayStr(),
    category: 'umum',
    content: '',
  });
  const [saving, setSaving] = useState(false);

  // ── Hapus ──
  const [deleteTarget, setDeleteTarget] = useState<CatatanItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH
  // ═══════════════════════════════════════════════════════════════════

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : data.data ?? data.classes ?? []);
      }
    } catch {
      /* silent */
    }
  }, [schoolId]);

  const fetchStudents = useCallback(async () => {
    if (!classId) {
      setStudents([]);
      return;
    }
    try {
      const res = await fetch(`/api/users?schoolId=${schoolId}&classId=${classId}&role=SISWA`);
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : data.data ?? data.users ?? []);
      }
    } catch {
      /* silent */
    }
  }, [schoolId, classId]);

  const fetchCatatan = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classId) params.set('classId', classId);
      if (term) params.set('term', term);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const res = await fetch(`/api/guru-catatan?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCatatanList(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Gagal memuat catatan');
    } finally {
      setLoading(false);
    }
  }, [classId, term, categoryFilter]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetchCatatan();
  }, [fetchCatatan]);

  // ═══════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  const openCreate = () => {
    if (!classId) {
      toast.error('Pilih kelas terlebih dahulu');
      return;
    }
    setEditingId(null);
    setForm({ studentId: students[0]?.id ?? '', subjectId: '', date: todayStr(), category: 'umum', content: '' });
    setFormOpen(true);
  };

  const openEdit = (c: CatatanItem) => {
    setEditingId(c.id);
    setForm({
      studentId: c.studentId,
      subjectId: c.subject?.id ?? '',
      date: c.date,
      category: c.category,
      content: c.content,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.studentId) {
      toast.error('Pilih siswa');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Isi catatan');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/guru-catatan/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: form.category,
            content: form.content,
            date: form.date,
            subjectId: form.subjectId || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');
        toast.success('Catatan diperbarui');
      } else {
        const res = await fetch('/api/guru-catatan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: form.studentId,
            subjectId: form.subjectId || null,
            term,
            date: form.date,
            category: form.category,
            content: form.content,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');
        toast.success('Catatan tersimpan');
      }
      setFormOpen(false);
      fetchCatatan();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/guru-catatan/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus');
      toast.success('Catatan dihapus');
      setDeleteTarget(null);
      fetchCatatan();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setDeleting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864] flex items-center gap-2">
            <NotebookPen className="h-6 w-6" />
            Catatan Siswa
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catatan pembinaan &amp; pendampingan untuk siswa — periodik {term}
          </p>
        </div>
        <Button className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Catatan
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Kelas</Label>
              <Select value={classId || 'all'} onValueChange={(v) => setClassId(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Term</Label>
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="2025/2026-Ganjil" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Kategori</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List catatan */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Daftar Catatan {classId ? `— ${classes.find((c) => c.id === classId)?.name ?? ''}` : '(Semua Kelas)'}
          </CardTitle>
          <CardDescription className="text-xs">
            {catatanList.length} catatan · term {term}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : catatanList.length === 0 ? (
            <div className="py-12 text-center">
              <NotebookPen className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mt-2">
                Belum ada catatan. Tambahkan catatan pertama untuk siswa Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {catatanList.map((c) => {
                const meta = categoryMeta(c.category);
                const Icon = meta.icon;
                return (
                  <div key={c.id} className="rounded-lg border border-slate-100 bg-slate-50/40 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{c.student?.name ?? '-'}</p>
                          {c.student?.class && (
                            <span className="text-xs text-muted-foreground">{c.student.class.name}</span>
                          )}
                          <Badge variant="outline" className={`text-[10px] ${meta.badge}`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {meta.label}
                          </Badge>
                          {c.subject && (
                            <Badge variant="outline" className="text-[10px] text-slate-500">
                              {c.subject.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {c.date} · {c.term} · oleh {c.teacher?.name ?? 'Guru'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} title="Edit">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteTarget(c)}
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog buat/edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1F3864]">
              {editingId ? 'Edit Catatan' : 'Catatan Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Perbarui isi atau kategori catatan.'
                : 'Tulis catatan pembinaan untuk siswa.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Siswa</Label>
              <Select
                value={form.studentId || 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, studentId: v === 'none' ? '' : v }))}
                disabled={Boolean(editingId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih siswa" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.nisn ? `(${s.nisn})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Kategori</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tanggal</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Isi Catatan <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Tulis catatan pembinaan, apresiasi, atau arahan untuk siswa..."
                className="min-h-[120px] text-sm"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">{form.content.length}/2000</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editingId ? 'Simpan Perubahan' : 'Simpan Catatan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Catatan?</AlertDialogTitle>
            <AlertDialogDescription>
              Catatan untuk {deleteTarget?.student?.name} akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default GuruCatatanView;
