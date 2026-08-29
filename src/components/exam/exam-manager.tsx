'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Plus, Clock, Calendar, Pencil, Trash2, BarChart3, Play,
  ClipboardList, Users, BookOpen, AlertCircle, CheckCircle2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────

interface ExamPackage {
  id: string;
  title: string;
  description?: string;
  duration: number;
  totalQuestions: number;
  status: string;
  _count?: { examSessions: number; examItems: number };
}

interface ClassItem {
  id: string;
  name: string;
  grade: number;
  academicYear: string;
  _count?: { users: number };
}

interface ExamSession {
  id: string;
  title: string;
  examPackageId: string;
  schoolId?: string;
  startDate: string;
  endDate: string;
  duration: number;
  shuffleQuestions: boolean;
  status: string;
  examPackage?: ExamPackage;
  assignments?: { id: string; classId: string; class?: { id: string; name: string } }[];
}

// ─── Status badge helper ───────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Aktif', className: 'bg-green-100 text-green-700 border-green-200' },
    scheduled: { label: 'Terjadwal', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    ended: { label: 'Selesai', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    draft: { label: 'Draft', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    published: { label: 'Diterbitkan', className: 'bg-green-100 text-green-700 border-green-200' },
  in_progress: { label: 'Berlangsung', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  submitted: { label: 'Dikumpulkan', className: 'bg-green-100 text-green-700 border-green-200' },
  graded: { label: 'Dinilai', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  };
  const cfg = map[status] || { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return <Badge variant="outline" className={cn('text-xs font-medium', cfg.className)}>{cfg.label}</Badge>;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Empty state ───────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// ─── Exam Card (Guru/Admin) ────────────────────────────────────────────

function ExamSessionCard({ session, onEdit, onViewResults, onDelete, onStartExam }: {
  session: ExamSession;
  onEdit: () => void;
  onViewResults: () => void;
  onDelete: () => void;
  onStartExam?: () => void;
}) {
  const isStudent = !!onStartExam;
  const isActive = session.status === 'active';

  return (
    <Card className={cn(
      'transition-shadow hover:shadow-md border',
      isActive && 'border-l-4 border-l-green-500'
    )}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-3">
          {/* Top row: title + status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{session.title}</h3>
              {session.examPackage && (
                <p className="mt-0.5 text-sm text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  {session.examPackage.title}
                </p>
              )}
            </div>
            {statusBadge(session.status)}
          </div>

          {/* Info row */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {session.duration} menit
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(session.startDate)}
            </span>
          </div>

          {/* Assigned classes */}
          {session.assignments && session.assignments.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {session.assignments.map((a) => (
                <Badge key={a.classId} variant="secondary" className="text-xs">
                  {a.class?.name || a.classId}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 border-t">
            {isStudent ? (
              <Button
                size="sm"
                className={cn(
                  'gap-1.5',
                  isActive
                    ? 'bg-[#D4A017] hover:bg-[#B8860B] text-white'
                    : 'bg-[#1F3864] hover:bg-[#2A4A80] text-white'
                )}
                onClick={onStartExam}
                disabled={session.status === 'ended'}
              >
                <Play className="h-3.5 w-3.5" />
                {isActive ? 'Mulai Tryout' : session.status === 'ended' ? 'Sudah Selesai' : 'Belum Dibuka'}
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={onViewResults}>
                  <BarChart3 className="h-3.5 w-3.5" />
                  Hasil
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Create Exam Dialog ────────────────────────────────────────────────

function CreateExamDialog({
  open,
  onOpenChange,
  schoolId,
  userId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  userId: string;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [packageId, setPackageId] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('60');
  const [shuffle, setShuffle] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/exams?type=package&schoolId=${schoolId}`).then((r) => r.json()),
      fetch(`/api/classes?schoolId=${schoolId}`).then((r) => r.json()),
    ])
      .then(([pkgs, cls]) => {
        setPackages(pkgs || []);
        setClasses(cls || []);
      })
      .catch(() => toast.error('Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [open, schoolId]);

  const toggleClass = (classId: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !packageId || selectedClasses.length === 0 || !startDate || !endDate) {
      toast.error('Lengkapi semua field wajib');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-session',
          examPackageId: packageId,
          title,
          schoolId,
          classIds: selectedClasses,
          startDate,
          endDate,
          duration: parseInt(duration) || 60,
          shuffleQuestions: shuffle,
          createdBy: userId,
        }),
      });
      if (!res.ok) throw new Error('Gagal membuat tryout');
      toast.success('Tryout berhasil dibuat!');
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch {
      toast.error('Gagal membuat tryout');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setPackageId('');
    setSelectedClasses([]);
    setStartDate('');
    setEndDate('');
    setDuration('60');
    setShuffle(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Tryout Baru</DialogTitle>
          <DialogDescription>Atur jadwal tryout dan pilih kelas yang akan mengerjakan.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="exam-title">Judul Tryout *</Label>
              <Input
                id="exam-title"
                placeholder="contoh: Tryout TKA Desember 2024"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Package */}
            <div className="space-y-2">
              <Label>Paket Soal *</Label>
              <Select value={packageId} onValueChange={setPackageId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih paket soal" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.title} ({pkg.totalQuestions} soal, {pkg.duration} menit)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Classes */}
            <div className="space-y-2">
              <Label>Kelas *</Label>
              <div className="rounded-lg border p-3 max-h-40 overflow-y-auto space-y-2">
                {classes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada kelas tersedia</p>
                ) : (
                  classes.map((cls) => (
                    <label
                      key={cls.id}
                      className="flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedClasses.includes(cls.id)}
                        onCheckedChange={() => toggleClass(cls.id)}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{cls.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">({cls._count?.users || 0} siswa)</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-date">Tanggal Mulai *</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Tanggal Selesai *</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Duration + Shuffle */}
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="duration">Durasi (menit)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={600}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={shuffle} onCheckedChange={setShuffle} id="shuffle" />
                <Label htmlFor="shuffle" className="text-sm cursor-pointer">Acak soal</Label>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="bg-[#D4A017] hover:bg-[#B8860B] text-white"
          >
            {submitting ? 'Menyimpan...' : 'Buat Tryout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Student Available Tryouts ─────────────────────────────────────────

function StudentExamList({ schoolId, classId, userId }: { schoolId: string; classId: string; userId: string }) {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setSelectedExamId = useAppStore((s) => s.setSelectedExamId);

  useEffect(() => {
    fetch(`/api/exams?type=session&schoolId=${schoolId}&status=active`)
      .then((r) => r.json())
      .then((data) => {
        const filtered = (data || []).filter(
          (s: ExamSession) =>
            !s.assignments?.length ||
            s.assignments.some((a) => a.classId === classId)
        );
        setSessions(filtered);
      })
      .catch(() => toast.error('Gagal memuat tryout'))
      .finally(() => setLoading(false));
  }, [schoolId, classId]);

  const handleStartExam = (session: ExamSession) => {
    setSelectedExamId(session.id);
    navigateTo('exam-runner');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Belum ada tryout"
        description="Tidak ada tryout yang tersedia saat ini. Hubungi guru Anda untuk informasi lebih lanjut."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sessions.map((session) => (
        <ExamSessionCard
          key={session.id}
          session={session}
          onEdit={() => {}}
          onViewResults={() => {}}
          onDelete={() => {}}
          onStartExam={() => handleStartExam(session)}
        />
      ))}
    </div>
  );
}

// ─── Main ExamManager ──────────────────────────────────────────────────

export function ExamManager() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setSelectedExamId = useAppStore((s) => s.setSelectedExamId);

  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const isStudent = user?.role === 'SISWA';
  const schoolId = user?.schoolId || '';

  const fetchSessions = useCallback(async () => {
    if (isStudent) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/exams?type=session&schoolId=${schoolId}`);
      const data = await res.json();
      setSessions(data || []);
    } catch {
      toast.error('Gagal memuat data tryout');
    } finally {
      setLoading(false);
    }
  }, [schoolId, isStudent]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus tryout ini?')) return;
    try {
      await fetch(`/api/exams?id=${id}&type=session`, { method: 'DELETE' });
      toast.success('Tryout berhasil dihapus');
      fetchSessions();
    } catch {
      toast.error('Gagal menghapus tryout');
    }
  };

  const handleStartExam = (session: ExamSession) => {
    setSelectedExamId(session.id);
    navigateTo('exam-runner');
  };

  // ── Student view ──
  if (isStudent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tryout Tersedia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih tryout yang ingin Anda kerjakan
          </p>
        </div>
        <StudentExamList
          schoolId={schoolId}
          classId={user?.classId || ''}
          userId={user!.id}
        />
      </div>
    );
  }

  // ── Guru/Admin view ──
  const filteredSessions = sessions.filter((s) => {
    if (activeTab === 'active') return s.status === 'active';
    if (activeTab === 'scheduled') return s.status === 'scheduled';
    return s.status === 'ended';
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tryout & Ujian</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola jadwal tryout dan pantau hasil siswa
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-2 bg-[#D4A017] hover:bg-[#B8860B] text-white"
        >
          <Plus className="h-4 w-4" />
          Buat Tryout Baru
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="active" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 hidden sm:block" />
            Aktif
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5 hidden sm:block" />
            Terjadwal
          </TabsTrigger>
          <TabsTrigger value="ended" className="gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 hidden sm:block" />
            Selesai
          </TabsTrigger>
        </TabsList>

        {['active', 'scheduled', 'ended'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredSessions.length === 0 ? (
              <EmptyState
                icon={tab === 'active' ? CheckCircle2 : tab === 'scheduled' ? Calendar : ClipboardList}
                title={
                  tab === 'active'
                    ? 'Tidak ada tryout aktif'
                    : tab === 'scheduled'
                    ? 'Tidak ada tryout terjadwal'
                    : 'Tidak ada tryout selesai'
                }
                description={
                  tab === 'active'
                    ? 'Buat tryout baru dan aktifkan untuk siswa.'
                    : tab === 'scheduled'
                    ? 'Jadwalkan tryout untuk tanggal mendatang.'
                    : 'Hasil tryout yang sudah selesai akan muncul di sini.'
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredSessions.map((session) => (
                  <ExamSessionCard
                    key={session.id}
                    session={session}
                    onEdit={() => toast.info('Fitur edit dalam pengembangan')}
                    onViewResults={() => {
                      setSelectedExamId(session.id);
                      navigateTo('results');
                    }}
                    onDelete={() => handleDelete(session.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Dialog */}
      <CreateExamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        schoolId={schoolId}
        userId={user?.id || ''}
        onSuccess={fetchSessions}
      />
    </div>
  );
}
