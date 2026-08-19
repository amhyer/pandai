'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, CheckCircle2, AlertTriangle, Plus, Pencil, Trash2,
  Save, ChevronDown, ChevronUp, Loader2, Scale, Users,
  GraduationCap, FileSpreadsheet, Eye, Calculator, Info,
  ListChecks, Award, BarChart3, CircleDot, AlertCircle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════

interface GradeComponent {
  id: string;
  name: string;
  weight: number;
  term: string;
  sortOrder: number;
  schoolId: string;
  subjectId: string | null;
  classId: string | null;
  subject?: { id: string; name: string } | null;
  class_?: { id: string; name: string } | null;
}

interface Student {
  id: string;
  name: string;
  nisn?: string | null;
  classId?: string | null;
  className?: string | null;
}

interface StudentGrade {
  id: string;
  studentId: string;
  componentId: string;
  score: number;
  maxScore: number;
  source: string;
  term?: string;
  subjectId?: string | null;
  classId?: string | null;
  student?: { id: string; name: string; nisn?: string | null } | null;
  component?: { id: string; name: string; weight: number } | null;
}

interface FinalGradeComponent {
  componentId: string;
  componentName: string;
  weight: number;
  score: number | null;
  maxScore: number;
  source: string;
  normalizedScore: number | null;
  weightedScore: number | null;
}

interface FinalGradeResult {
  studentId: string;
  studentName: string;
  subjectId?: string;
  term: string;
  components: FinalGradeComponent[];
  totalWeightFilled: number;
  totalWeightAll: number;
  filledCount: number;
  totalComponents: number;
  finalGrade: number | null;
  calculation: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface ChildInfo {
  id: string;
  name: string;
  className: string;
  classId: string;
}

const DEFAULT_TERM = '2024/2025-Ganjil';
const TERMS = [
  '2024/2025-Ganjil',
  '2024/2025-Genap',
  '2025/2026-Ganjil',
  '2025/2026-Genap',
];

function getPredikat(grade: number | null): { label: string; color: string } {
  if (grade === null) return { label: '-', color: 'bg-gray-100 text-gray-500' };
  if (grade >= 90) return { label: 'A', color: 'bg-emerald-100 text-emerald-700' };
  if (grade >= 80) return { label: 'B', color: 'bg-blue-100 text-blue-700' };
  if (grade >= 70) return { label: 'C', color: 'bg-amber-100 text-amber-700' };
  return { label: 'D', color: 'bg-red-100 text-red-700' };
}

function gradeCellColor(grade: number | null): string {
  if (grade === null) return '';
  return grade >= 70 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold';
}

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: 'easeOut' as const },
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function KomponenNilaiView() {
  const user = useAppStore((s) => s.user);
  const role = user?.role;

  if (!user || !role) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  switch (role) {
    case 'GURU':
      return <GuruView />;
    case 'ADMIN_SCHOOL':
      return <AdminView />;
    case 'SISWA':
      return <SiswaOrtuView mode="SISWA" />;
    case 'ORANG_TUA':
      return <SiswaOrtuView mode="ORANG_TUA" />;
    case 'KEPALA_SEKOLAH':
      return <KepsekView />;
    default:
      return <ReadOnlyMessage />;
  }
}

// ═══════════════════════════════════════════════════════════════════
// GURU VIEW
// ═══════════════════════════════════════════════════════════════════

function GuruView() {
  const user = useAppStore((s) => s.user)!;
  const schoolId = user.schoolId;

  // --- State ---
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedComponentId, setSelectedComponentId] = useState('');

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [components, setComponents] = useState<GradeComponent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [existingGrades, setExistingGrades] = useState<StudentGrade[]>([]);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('input');

  // --- Rekap state ---
  const [rekapClassId, setRekapClassId] = useState('');
  const [rekapTerm, setRekapTerm] = useState(DEFAULT_TERM);
  const [rekapData, setRekapData] = useState<FinalGradeResult[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // --- Fetch classes ---
  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/classes?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [schoolId]);

  // --- Fetch components when term changes ---
  useEffect(() => {
    if (!term || !schoolId) return;
    setLoading(true);
    fetch(`/api/grade-components?term=${encodeURIComponent(term)}&schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((data) => {
        setComponents(Array.isArray(data) ? data : []);
        setSelectedComponentId('');
      })
      .catch(() => setComponents([]))
      .finally(() => setLoading(false));
  }, [term, schoolId]);

  // --- Fetch students when class selected ---
  useEffect(() => {
    if (!selectedClassId || !schoolId) return;
    fetch(`/api/users?role=SISWA&schoolId=${schoolId}&classId=${selectedClassId}`)
      .then((r) => r.json())
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch(() => setStudents([]));
  }, [selectedClassId, schoolId]);

  // --- Fetch existing grades when component + class selected ---
  useEffect(() => {
    if (!selectedComponentId || !selectedClassId) {
      setExistingGrades([]);
      setScoreInputs({});
      return;
    }
    const params = new URLSearchParams({
      componentId: selectedComponentId,
      classId: selectedClassId,
      term,
    });
    fetch(`/api/student-grades?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const grades: StudentGrade[] = Array.isArray(data) ? data : [];
        setExistingGrades(grades);
        const inputs: Record<string, string> = {};
        grades.forEach((g) => {
          inputs[g.studentId] = String(g.score);
        });
        setScoreInputs(inputs);
      })
      .catch(() => {
        setExistingGrades([]);
        setScoreInputs({});
      });
  }, [selectedComponentId, selectedClassId, term]);

  // --- Save all scores ---
  const handleSaveAll = async () => {
    if (!selectedComponentId) return;
    setSaving(true);
    let successCount = 0;
    let failCount = 0;

    const selectedComponent = components.find((c) => c.id === selectedComponentId);

    for (const student of students) {
      const val = scoreInputs[student.id];
      if (val === undefined || val === '') continue;
      const score = parseFloat(val);
      if (isNaN(score) || score < 0 || score > 100) continue;

      try {
        const res = await fetch('/api/student-grades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student.id,
            componentId: selectedComponentId,
            score,
            maxScore: 100,
            source: 'MANUAL',
            classId: selectedClassId,
            subjectId: selectedComponent?.subjectId || null,
            term,
          }),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setSaving(false);
    if (successCount > 0) {
      toast.success(`${successCount} nilai berhasil disimpan`);
      // Re-fetch grades to reflect upsert
      const params = new URLSearchParams({
        componentId: selectedComponentId,
        classId: selectedClassId,
        term,
      });
      fetch(`/api/student-grades?${params}`)
        .then((r) => r.json())
        .then((data) => {
          const grades: StudentGrade[] = Array.isArray(data) ? data : [];
          setExistingGrades(grades);
          const inputs: Record<string, string> = {};
          grades.forEach((g) => { inputs[g.studentId] = String(g.score); });
          setScoreInputs(inputs);
        })
        .catch(() => {});
    }
    if (failCount > 0) {
      toast.error(`${failCount} nilai gagal disimpan`);
    }
  };

  // --- Fetch rekap ---
  const fetchRekap = useCallback(() => {
    if (!rekapClassId || !rekapTerm) return;
    setRekapLoading(true);
    const params = new URLSearchParams({
      mode: 'class',
      classId: rekapClassId,
      term: rekapTerm,
    });
    fetch(`/api/grades/final?${params}`)
      .then((r) => r.json())
      .then((data) => setRekapData(Array.isArray(data) ? data : []))
      .catch(() => setRekapData([]))
      .finally(() => setRekapLoading(false));
  }, [rekapClassId, rekapTerm]);

  useEffect(() => {
    fetchRekap();
  }, [fetchRekap]);

  const selectedComponent = components.find((c) => c.id === selectedComponentId);
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Komponen Nilai & Bobot</h1>
        <p className="text-muted-foreground">Kelola komponen penilaian dan input nilai siswa</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="input" className="gap-2">
            <Pencil className="h-4 w-4" /> Input Nilai Manual
          </TabsTrigger>
          <TabsTrigger value="rekap" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Rekap Nilai Akhir
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Input Nilai Manual ─── */}
        <TabsContent value="input">
          <AnimatePresence mode="wait">
            <motion.div key="input" {...fadeSlide}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" /> Input Nilai Siswa
                  </CardTitle>
                  <CardDescription>Pilih kelas dan komponen, lalu masukkan nilai 0–100</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Selectors row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Periode</Label>
                      <Select value={term} onValueChange={setTerm}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TERMS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Kelas</Label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Komponen</Label>
                      <Select value={selectedComponentId} onValueChange={setSelectedComponentId} disabled={loading}>
                        <SelectTrigger><SelectValue placeholder={loading ? 'Memuat...' : 'Pilih komponen'} /></SelectTrigger>
                        <SelectContent>
                          {components.length === 0 && !loading && (
                            <SelectItem value="_none" disabled>Tidak ada komponen</SelectItem>
                          )}
                          {components.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} ({c.weight}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Weight indicator */}
                  {components.length > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Scale className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Total bobot komponen</span>
                          <span className={cn('font-medium', totalWeight === 100 ? 'text-emerald-600' : 'text-amber-600')}>
                            {totalWeight}%
                          </span>
                        </div>
                        <Progress
                          value={totalWeight}
                          className={cn('h-2',
                            totalWeight === 100 ? '[&>[data-slot=progress-indicator]]:bg-emerald-500' : '[&>[data-slot=progress-indicator]]:bg-amber-400'
                          )}
                        />
                      </div>
                      {totalWeight === 100 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                    </div>
                  )}

                  {/* Students table */}
                  {!selectedClassId ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Pilih kelas untuk menampilkan daftar siswa</p>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Tidak ada siswa di kelas ini</p>
                    </div>
                  ) : !selectedComponentId ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Pilih komponen nilai untuk mulai menginput</p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">No</TableHead>
                              <TableHead>Nama Siswa</TableHead>
                              <TableHead className="w-40 text-center">Nilai (0–100)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students.map((s, idx) => {
                              const existing = existingGrades.find((g) => g.studentId === s.id);
                              return (
                                <TableRow key={s.id}>
                                  <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                                  <TableCell className="font-medium">{s.name}</TableCell>
                                  <TableCell className="text-center">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={scoreInputs[s.id] ?? ''}
                                      onChange={(e) =>
                                        setScoreInputs((prev) => ({
                                          ...prev,
                                          [s.id]: e.target.value,
                                        }))
                                      }
                                      className="w-28 mx-auto text-center"
                                      placeholder="-"
                                    />
                                    {existing && (
                                      <span className="text-[11px] text-muted-foreground ml-1">
                                        {existing.source === 'MANUAL' ? '✏️' : '🔗'}
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={handleSaveAll} disabled={saving || students.length === 0} className="gap-2">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Simpan Semua Nilai
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ─── Tab 2: Rekap Nilai Akhir ─── */}
        <TabsContent value="rekap">
          <AnimatePresence mode="wait">
            <motion.div key="rekap" {...fadeSlide}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" /> Rekap Nilai Akhir Kelas
                  </CardTitle>
                  <CardDescription>Nilai akhir dihitung dengan normalisasi SIMANTAP</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kelas</Label>
                      <Select value={rekapClassId} onValueChange={setRekapClassId}>
                        <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Periode</Label>
                      <Select value={rekapTerm} onValueChange={setRekapTerm}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TERMS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {rekapLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : !rekapClassId ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Pilih kelas untuk melihat rekap nilai</p>
                    </div>
                  ) : rekapData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Belum ada data nilai untuk kelas dan periode ini</p>
                    </div>
                  ) : (
                    <RekapTable
                      data={rekapData}
                      expandedStudent={expandedStudent}
                      setExpandedStudent={setExpandedStudent}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN VIEW — Atur Komponen + Rekap
// ═══════════════════════════════════════════════════════════════════

function AdminView() {
  const user = useAppStore((s) => s.user)!;
  const schoolId = user.schoolId;

  const [activeTab, setActiveTab] = useState('komponen');

  // Component management
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [components, setComponents] = useState<GradeComponent[]>([]);
  const [loading, setLoading] = useState(false);

  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newSortOrder, setNewSortOrder] = useState('0');
  const [adding, setAdding] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editing, setEditing] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Rekap
  const [rekapClassId, setRekapClassId] = useState('');
  const [rekapTerm, setRekapTerm] = useState(DEFAULT_TERM);
  const [rekapData, setRekapData] = useState<FinalGradeResult[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // Lookups
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  // --- Fetch lookups ---
  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/classes?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((d) => setClasses(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((d) => setSubjects(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [schoolId]);

  // --- Fetch components ---
  const fetchComponents = useCallback(() => {
    if (!term || !schoolId) return;
    setLoading(true);
    const params = new URLSearchParams({ term, schoolId });
    if (selectedSubjectId) params.set('subjectId', selectedSubjectId);
    if (selectedClassId) params.set('classId', selectedClassId);
    fetch(`/api/grade-components?${params}`)
      .then((r) => r.json())
      .then((d) => setComponents(Array.isArray(d) ? d : []))
      .catch(() => setComponents([]))
      .finally(() => setLoading(false));
  }, [term, schoolId, selectedSubjectId, selectedClassId]);

  useEffect(() => { fetchComponents(); }, [fetchComponents]);

  // --- Add component ---
  const handleAdd = async () => {
    const w = parseFloat(newWeight);
    if (!newName.trim() || isNaN(w) || w < 0 || w > 100) {
      toast.error('Nama wajib diisi dan bobot harus 0–100');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/grade-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          weight: w,
          term,
          subjectId: selectedSubjectId || null,
          classId: selectedClassId || null,
          sortOrder: parseInt(newSortOrder) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Gagal menambahkan'); return; }
      toast.success('Komponen ditambahkan');
      if (data._meta?.warning) toast.warning(data._meta.warning);
      setNewName(''); setNewWeight(''); setNewSortOrder('0');
      fetchComponents();
    } catch { toast.error('Gagal menambahkan'); }
    finally { setAdding(false); }
  };

  // --- Edit weight ---
  const handleEditSave = async () => {
    if (!editId) return;
    const w = parseFloat(editWeight);
    if (isNaN(w) || w < 0 || w > 100) { toast.error('Bobot harus 0–100'); return; }
    setEditing(true);
    try {
      const res = await fetch('/api/grade-components', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, weight: w }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Gagal update'); return; }
      toast.success('Bobot diperbarui');
      if (data._meta?.warning) toast.warning(data._meta.warning);
      setEditId(null); setEditWeight('');
      fetchComponents();
    } catch { toast.error('Gagal update'); }
    finally { setEditing(false); }
  };

  // --- Delete ---
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/grade-components?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Gagal hapus'); return; }
      toast.success('Komponen dihapus');
      setDeleteId(null);
      fetchComponents();
    } catch { toast.error('Gagal hapus'); }
    finally { setDeleting(false); }
  };

  // --- Rekap ---
  const fetchRekap = useCallback(() => {
    if (!rekapClassId || !rekapTerm) return;
    setRekapLoading(true);
    fetch(`/api/grades/final?mode=class&classId=${rekapClassId}&term=${encodeURIComponent(rekapTerm)}`)
      .then((r) => r.json())
      .then((d) => setRekapData(Array.isArray(d) ? d : []))
      .catch(() => setRekapData([]))
      .finally(() => setRekapLoading(false));
  }, [rekapClassId, rekapTerm]);

  useEffect(() => { fetchRekap(); }, [fetchRekap]);

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Komponen Nilai & Bobot</h1>
        <p className="text-muted-foreground">Atur komponen penilaian dan pantau rekap nilai akhir</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="komponen" className="gap-2">
            <Scale className="h-4 w-4" /> Atur Komponen & Bobot
          </TabsTrigger>
          <TabsTrigger value="rekap" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Rekap Nilai Akhir
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Atur Komponen ─── */}
        <TabsContent value="komponen">
          <AnimatePresence mode="wait">
            <motion.div key="komponen" {...fadeSlide}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="h-5 w-5" /> Komponen Penilaian
                  </CardTitle>
                  <CardDescription>Definisikan komponen dan bobotnya. Total idealnya 100%.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Periode</Label>
                      <Select value={term} onValueChange={setTerm}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TERMS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mata Pelajaran (opsional)</Label>
                      <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                        <SelectTrigger><SelectValue placeholder="Semua mapel" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Semua mapel</SelectItem>
                          {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Kelas (opsional)</Label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger><SelectValue placeholder="Semua kelas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Semua kelas</SelectItem>
                          {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Total weight bar */}
                  <div className="flex items-center gap-3 p-4 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Total Bobot</span>
                        <span className={cn(
                          'text-xl font-bold',
                          totalWeight === 100 ? 'text-emerald-600' : 'text-amber-600',
                        )}>
                          {totalWeight}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(totalWeight, 100)}
                        className={cn('h-3',
                          totalWeight === 100
                            ? '[&>[data-slot=progress-indicator]]:bg-emerald-500'
                            : totalWeight > 100
                              ? '[&>[data-slot=progress-indicator]]:bg-red-400'
                              : '[&>[data-slot=progress-indicator]]:bg-amber-400'
                        )}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {totalWeight === 100
                          ? '✅ Bobot sudah tepat 100%'
                          : totalWeight > 100
                            ? '⚠️ Bobot melebihi 100%'
                            : `⚠️ Kurang ${100 - totalWeight}% dari 100%`
                        }
                      </p>
                    </div>
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full shrink-0',
                      totalWeight === 100 ? 'bg-emerald-100' : 'bg-amber-100',
                    )}>
                      {totalWeight === 100
                        ? <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        : <AlertTriangle className="h-6 w-6 text-amber-600" />
                      }
                    </div>
                  </div>

                  {/* Add new component */}
                  <div className="flex flex-col sm:flex-row items-end gap-3 p-4 rounded-lg border bg-muted/30">
                    <div className="flex-1 w-full">
                      <Label className="text-sm">Nama Komponen</Label>
                      <Input
                        placeholder="cth: Tugas Harian"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                    </div>
                    <div className="w-full sm:w-28">
                      <Label className="text-sm">Bobot (%)</Label>
                      <Input
                        type="number" min={0} max={100} placeholder="20"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                      />
                    </div>
                    <div className="w-full sm:w-24">
                      <Label className="text-sm">Urutan</Label>
                      <Input
                        type="number" min={0} placeholder="0"
                        value={newSortOrder}
                        onChange={(e) => setNewSortOrder(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAdd} disabled={adding} className="gap-2 shrink-0">
                      {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Tambah
                    </Button>
                  </div>

                  {/* Components list */}
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : components.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Belum ada komponen untuk periode ini</p>
                      <p className="text-xs mt-1">Tambahkan komponen pertama di atas</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border divide-y">
                      {components.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                          <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium flex-1 min-w-0">{c.name}</span>
                          {c.subject && (
                            <Badge variant="outline" className="text-xs hidden sm:inline-flex">{c.subject.name}</Badge>
                          )}
                          {c.class_ && (
                            <Badge variant="outline" className="text-xs hidden sm:inline-flex">{c.class_.name}</Badge>
                          )}
                          {editId === c.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number" min={0} max={100}
                                value={editWeight}
                                onChange={(e) => setEditWeight(e.target.value)}
                                className="w-20 text-center"
                              />
                              <Button size="sm" onClick={handleEditSave} disabled={editing}>
                                {editing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>✕</Button>
                            </div>
                          ) : (
                            <>
                              <Badge
                                className={cn(
                                  'font-mono text-sm px-2.5',
                                  totalWeight === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                                )}
                              >
                                {c.weight}%
                              </Badge>
                              <Button size="sm" variant="ghost" onClick={() => { setEditId(c.id); setEditWeight(String(c.weight)); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ─── Tab 2: Rekap ─── */}
        <TabsContent value="rekap">
          <AnimatePresence mode="wait">
            <motion.div key="admin-rekap" {...fadeSlide}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" /> Rekap Nilai Akhir
                  </CardTitle>
                  <CardDescription>Peringkat dan nilai akhir siswa per kelas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kelas</Label>
                      <Select value={rekapClassId} onValueChange={setRekapClassId}>
                        <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Periode</Label>
                      <Select value={rekapTerm} onValueChange={setRekapTerm}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TERMS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {rekapLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : !rekapClassId ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Pilih kelas untuk melihat rekap nilai</p>
                    </div>
                  ) : rekapData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Belum ada data nilai untuk kelas dan periode ini</p>
                    </div>
                  ) : (
                    <RekapTable
                      data={rekapData}
                      expandedStudent={expandedStudent}
                      setExpandedStudent={setExpandedStudent}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Komponen?</AlertDialogTitle>
            <AlertDialogDescription>
              Komponen yang dihapus akan menghilang dari perhitungan nilai akhir. Nilai siswa yang terkait tidak akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SISWA / ORANG_TUA VIEW (read-only)
// ═══════════════════════════════════════════════════════════════════

function SiswaOrtuView({ mode }: { mode: 'SISWA' | 'ORANG_TUA' }) {
  const user = useAppStore((s) => s.user)!;

  const [term, setTerm] = useState(DEFAULT_TERM);
  const [finalData, setFinalData] = useState<FinalGradeResult[]>([]);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch children for ORANG_TUA
  useEffect(() => {
    if (mode !== 'ORANG_TUA' || !user.schoolId) return;
    fetch(`/api/users?role=SISWA&schoolId=${user.schoolId}&parentId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        const ch: ChildInfo[] = Array.isArray(data)
          ? data.map((d: any) => ({
              id: d.id,
              name: d.name,
              className: d.className || d.class?.name || '-',
              classId: d.classId || d.class?.id || '',
            }))
          : [];
        setChildren(ch);
        if (ch.length > 0) setSelectedChildId(ch[0].id);
      })
      .catch(() => setChildren([]));
  }, [mode, user.id, user.schoolId]);

  // Fetch final grades
  const fetchFinal = useCallback(() => {
    const studentId = mode === 'SISWA' ? user.id : selectedChildId;
    if (!studentId || !term) return;
    setLoading(true);
    const params = new URLSearchParams({
      mode: 'student',
      studentId,
      term,
    });
    if (user.schoolId) params.set('schoolId', user.schoolId);
    fetch(`/api/grades/final?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setFinalData(data);
        else if (data && data.studentId) setFinalData([data]);
        else setFinalData([]);
      })
      .catch(() => setFinalData([]))
      .finally(() => setLoading(false));
  }, [mode, user.id, user.schoolId, selectedChildId, term]);

  useEffect(() => { fetchFinal(); }, [fetchFinal]);

  const title = mode === 'SISWA' ? 'Nilai Akhir Saya' : 'Nilai Akhir Anak';
  const desc = mode === 'SISWA'
    ? 'Lihat komponen nilai dan perhitungan nilai akhir semester'
    : 'Pantau perkembangan nilai anak Anda';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{desc}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" /> {title}
              </CardTitle>
              <CardDescription>Normalisasi SIMANTAP — komponen kosong tidak dihitung 0</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {mode === 'ORANG_TUA' && children.length > 1 && (
                <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {children.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.className})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERMS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : finalData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Belum ada data nilai untuk periode ini</p>
              <p className="text-xs mt-1">Nilai akan muncul setelah guru menginput komponen nilai</p>
            </div>
          ) : (
            <AnimatePresence>
              {finalData.map((result) => (
                <motion.div
                  key={result.studentId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 mb-6"
                >
                  {/* Final grade summary */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex-1">
                      <p className="font-medium">{result.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.filledCount}/{result.totalComponents} komponen terisi · Bobot terisi {result.totalWeightFilled}%
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {result.finalGrade !== null && (
                        <span className={cn('text-3xl font-bold', gradeCellColor(result.finalGrade))}>
                          {result.finalGrade.toFixed(1)}
                        </span>
                      )}
                      <Badge className={getPredikat(result.finalGrade).color}>
                        {getPredikat(result.finalGrade).label}
                      </Badge>
                    </div>
                  </div>

                  {/* Components breakdown */}
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Komponen</TableHead>
                          <TableHead className="text-center">Bobot</TableHead>
                          <TableHead className="text-center">Nilai</TableHead>
                          <TableHead className="text-center">Normalisasi</TableHead>
                          <TableHead className="text-center">Tertimbang</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.components.map((comp) => (
                          <TableRow key={comp.componentId}>
                            <TableCell className="font-medium">{comp.componentName}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{comp.weight}%</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {comp.score !== null ? (
                                <span className={cn('font-medium', gradeCellColor(comp.normalizedScore))}>
                                  {comp.score}/{comp.maxScore}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {comp.normalizedScore !== null ? `${comp.normalizedScore.toFixed(1)}` : '—'}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {comp.weightedScore !== null ? comp.weightedScore.toFixed(2) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Calculation detail */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 text-sm">
                    <Calculator className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Perhitungan:</p>
                      <p className="text-xs leading-relaxed break-all whitespace-pre-wrap">{result.calculation}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// KEPALA SEKOLAH VIEW (read-only components + rekap)
// ═══════════════════════════════════════════════════════════════════

function KepsekView() {
  const user = useAppStore((s) => s.user)!;
  const schoolId = user.schoolId;

  const [activeTab, setActiveTab] = useState('komponen');
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [components, setComponents] = useState<GradeComponent[]>([]);
  const [loading, setLoading] = useState(false);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  // Rekap
  const [rekapClassId, setRekapClassId] = useState('');
  const [rekapTerm, setRekapTerm] = useState(DEFAULT_TERM);
  const [rekapData, setRekapData] = useState<FinalGradeResult[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/classes?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((d) => setClasses(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((d) => setSubjects(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [schoolId]);

  const fetchComponents = useCallback(() => {
    if (!term || !schoolId) return;
    setLoading(true);
    const params = new URLSearchParams({ term, schoolId });
    if (selectedSubjectId) params.set('subjectId', selectedSubjectId);
    if (selectedClassId) params.set('classId', selectedClassId);
    fetch(`/api/grade-components?${params}`)
      .then((r) => r.json())
      .then((d) => setComponents(Array.isArray(d) ? d : []))
      .catch(() => setComponents([]))
      .finally(() => setLoading(false));
  }, [term, schoolId, selectedSubjectId, selectedClassId]);

  useEffect(() => { fetchComponents(); }, [fetchComponents]);

  const fetchRekap = useCallback(() => {
    if (!rekapClassId || !rekapTerm) return;
    setRekapLoading(true);
    fetch(`/api/grades/final?mode=class&classId=${rekapClassId}&term=${encodeURIComponent(rekapTerm)}`)
      .then((r) => r.json())
      .then((d) => setRekapData(Array.isArray(d) ? d : []))
      .catch(() => setRekapData([]))
      .finally(() => setRekapLoading(false));
  }, [rekapClassId, rekapTerm]);

  useEffect(() => { fetchRekap(); }, [fetchRekap]);

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Komponen Nilai & Bobot</h1>
        <p className="text-muted-foreground">Lihat komponen penilaian dan rekap nilai akhir per kelas</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="komponen" className="gap-2">
            <Eye className="h-4 w-4" /> Lihat Komponen
          </TabsTrigger>
          <TabsTrigger value="rekap" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Rekap Per Kelas
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: View components (read-only) ─── */}
        <TabsContent value="komponen">
          <AnimatePresence mode="wait">
            <motion.div key="kepsek-komponen" {...fadeSlide}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" /> Komponen Penilaian (Hanya Lihat)
                  </CardTitle>
                  <CardDescription>Anda hanya dapat melihat, tidak mengubah komponen nilai.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Periode</Label>
                      <Select value={term} onValueChange={setTerm}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TERMS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mata Pelajaran (opsional)</Label>
                      <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                        <SelectTrigger><SelectValue placeholder="Semua mapel" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Semua mapel</SelectItem>
                          {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Kelas (opsional)</Label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger><SelectValue placeholder="Semua kelas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Semua kelas</SelectItem>
                          {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Total weight bar */}
                  <div className="flex items-center gap-3 p-4 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Total Bobot</span>
                        <span className={cn(
                          'text-xl font-bold',
                          totalWeight === 100 ? 'text-emerald-600' : 'text-amber-600',
                        )}>
                          {totalWeight}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(totalWeight, 100)}
                        className={cn('h-3',
                          totalWeight === 100
                            ? '[&>[data-slot=progress-indicator]]:bg-emerald-500'
                            : '[&>[data-slot=progress-indicator]]:bg-amber-400'
                        )}
                      />
                    </div>
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full shrink-0',
                      totalWeight === 100 ? 'bg-emerald-100' : 'bg-amber-100',
                    )}>
                      {totalWeight === 100
                        ? <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        : <AlertTriangle className="h-6 w-6 text-amber-600" />
                      }
                    </div>
                  </div>

                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : components.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Belum ada komponen untuk periode ini</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border divide-y">
                      {components.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                          <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium flex-1">{c.name}</span>
                          {c.subject && (
                            <Badge variant="outline" className="text-xs hidden sm:inline-flex">{c.subject.name}</Badge>
                          )}
                          <Badge className={cn(
                            'font-mono text-sm px-2.5',
                            totalWeight === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                          )}>
                            {c.weight}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ─── Tab 2: Rekap per kelas ─── */}
        <TabsContent value="rekap">
          <AnimatePresence mode="wait">
            <motion.div key="kepsek-rekap" {...fadeSlide}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" /> Rekap Nilai Akhir Per Kelas
                  </CardTitle>
                  <CardDescription>Peringkat dan nilai akhir siswa per kelas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kelas</Label>
                      <Select value={rekapClassId} onValueChange={setRekapClassId}>
                        <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Periode</Label>
                      <Select value={rekapTerm} onValueChange={setRekapTerm}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TERMS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {rekapLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : !rekapClassId ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Pilih kelas untuk melihat rekap nilai</p>
                    </div>
                  ) : rekapData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Belum ada data nilai untuk kelas dan periode ini</p>
                    </div>
                  ) : (
                    <RekapTable
                      data={rekapData}
                      expandedStudent={expandedStudent}
                      setExpandedStudent={setExpandedStudent}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SHARED REKAP TABLE
// ═══════════════════════════════════════════════════════════════════

function RekapTable({
  data,
  expandedStudent,
  setExpandedStudent,
}: {
  data: FinalGradeResult[];
  expandedStudent: string | null;
  setExpandedStudent: (id: string | null) => void;
}) {
  const componentNames = useMemo(() => {
    const nameSet = new Set<string>();
    data.forEach((r) => r.components.forEach((c) => nameSet.add(c.componentName)));
    return Array.from(nameSet);
  }, [data]);

  // Sort by finalGrade descending
  const sorted = useMemo(
    () => [...data].sort((a, b) => (b.finalGrade ?? -1) - (a.finalGrade ?? -1)),
    [data],
  );

  return (
    <div className="space-y-2">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MiniStat label="Total Siswa" value={String(data.length)} />
        <MiniStat
          label="Rata-rata"
          value={data.length > 0
            ? (data.reduce((s, d) => s + (d.finalGrade ?? 0), 0) / data.length).toFixed(1)
            : '-'
          }
        />
        <MiniStat
          label="Tertinggi"
          value={data.length > 0 ? String(Math.max(...data.map((d) => d.finalGrade ?? 0)).toFixed(1)) : '-'}
          color="text-emerald-600"
        />
        <MiniStat
          label="Terendah"
          value={data.length > 0 ? String(Math.min(...data.filter((d) => d.finalGrade !== null).map((d) => d.finalGrade!)).toFixed(1)) : '-'}
          color="text-red-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Nama Siswa</TableHead>
              {componentNames.map((name) => (
                <TableHead key={name} className="text-center min-w-[80px] whitespace-nowrap">
                  {name}
                </TableHead>
              ))}
              <TableHead className="text-center min-w-[80px]">Nilai Akhir</TableHead>
              <TableHead className="text-center min-w-[60px]">Predikat</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((result, idx) => {
              const isExpanded = expandedStudent === result.studentId;
              const predikat = getPredikat(result.finalGrade);
              return (
                <React.Fragment key={result.studentId}>
                  <TableRow
                    className={cn(isExpanded && 'bg-muted/50')}
                    onClick={() => setExpandedStudent(isExpanded ? null : result.studentId)}
                  >
                    <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{result.studentName}</TableCell>
                    {componentNames.map((name) => {
                      const comp = result.components.find((c) => c.componentName === name);
                      if (!comp || comp.score === null)
                        return <TableCell key={name} className="text-center text-muted-foreground">—</TableCell>;
                      return (
                        <TableCell key={name} className="text-center">
                          <span className={cn('text-sm', gradeCellColor(comp.normalizedScore))}>
                            {comp.score}
                          </span>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <span className={cn('text-lg font-bold', gradeCellColor(result.finalGrade))}>
                        {result.finalGrade !== null ? result.finalGrade.toFixed(1) : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={predikat.color}>{predikat.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4" />
                          : <ChevronDown className="h-4 w-4" />
                        }
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Expanded calculation detail */}
                  <TableRow>
                    <TableCell colSpan={componentNames.length + 5} className="p-0">
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 py-4 bg-muted/30 border-t space-y-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Info className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {result.filledCount}/{result.totalComponents} komponen terisi
                                  · Bobot terisi: {result.totalWeightFilled}%/{result.totalWeightAll}%
                                </span>
                              </div>

                              {/* Per-component detail */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {result.components.map((comp) => (
                                  <div key={comp.componentId} className="flex items-center justify-between p-2 rounded bg-background border text-sm">
                                    <span className="text-muted-foreground truncate mr-2">{comp.componentName}</span>
                                    <span className={cn(
                                      'shrink-0 font-medium',
                                      comp.score !== null ? gradeCellColor(comp.normalizedScore) : 'text-muted-foreground',
                                    )}>
                                      {comp.score !== null
                                        ? `${comp.score}/${comp.maxScore} → ${comp.normalizedScore} × {comp.weight}% = ${comp.weightedScore}`
                                        : `(belum, ${comp.weight}% diabaikan)`
                                      }
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-start gap-2 p-3 rounded bg-background border text-sm">
                                <Calculator className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <p className="text-xs leading-relaxed break-all whitespace-pre-wrap">{result.calculation}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-3 rounded-lg border bg-muted/30">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-xl font-bold', color)}>{value}</p>
    </div>
  );
}

function ReadOnlyMessage() {
  return (
    <div className="text-center py-20 text-muted-foreground">
      <Eye className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">Anda tidak memiliki akses ke halaman ini</p>
    </div>
  );
}
