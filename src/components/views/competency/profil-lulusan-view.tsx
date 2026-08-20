'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/use-store';
import { COMPETENCY_DIMENSIONS, RATING_LABELS } from '@/lib/competency-dimensions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Save,
  Eye,
  Trash2,
  ChevronRight,
  BarChart3,
  Users,
  ClipboardList,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────

interface ClassItem {
  id: string;
  name: string;
  grade: number;
  _count?: { users: number };
}

interface StudentItem {
  id: string;
  name: string;
  nisn?: string;
  classId?: string;
  className?: string;
}

interface RecapItem {
  dimension: string;
  average: number;
  count: number;
  ratings?: number[];
  classAverage?: number;
  totalAssessments?: number;
  uniqueStudents?: number;
  studentAverages?: { studentId: string; average: number }[];
}

interface AssessmentRow {
  id: string;
  studentId: string;
  dimension: string;
  rating: number;
  term: string;
  note?: string;
  date: string;
  assessedBy: string;
  assessor?: { id: string; name: string };
  student?: { id: string; name: string; nisn?: string };
}

interface StudentRecapResponse {
  recap: RecapItem[];
  assessments: AssessmentRow[];
}

interface ClassRecapResponse {
  recap: RecapItem[];
}

// ─── Constants ───────────────────────────────────────────────

const DEFAULT_TERM = '2024/2025-Ganjil';

const TERM_OPTIONS = [
  '2024/2025-Ganjil',
  '2024/2025-Genap',
  '2025/2026-Ganjil',
  '2025/2026-Genap',
];

const RATING_COLORS: Record<number, { bg: string; hover: string; text: string; bar: string }> = {
  1: { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-red-500', bar: 'from-red-400 to-red-500' },
  2: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', text: 'text-amber-500', bar: 'from-amber-400 to-amber-500' },
  3: { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-green-500', bar: 'from-green-400 to-green-500' },
  4: { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', text: 'text-emerald-500', bar: 'from-emerald-400 to-emerald-500' },
};

const RATING_BADGE_STYLES: Record<number, string> = {
  1: 'bg-red-500 text-white hover:bg-red-600',
  2: 'bg-amber-500 text-white hover:bg-amber-600',
  3: 'bg-green-500 text-white hover:bg-green-600',
  4: 'bg-emerald-500 text-white hover:bg-emerald-600',
};

const RATING_BADGE_READONLY: Record<number, string> = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-amber-100 text-amber-700',
  3: 'bg-green-100 text-green-700',
  4: 'bg-emerald-100 text-emerald-700',
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

// ─── Sub-components ──────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <ClipboardList className="mb-3 h-12 w-12 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function DimensionBarChart({
  recap,
  maxRating = 4,
}: {
  recap: RecapItem[];
  maxRating?: number;
}) {
  const getBarColor = (avg: number): string => {
    if (avg >= 3.5) return 'from-emerald-400 to-emerald-500';
    if (avg >= 2.5) return 'from-green-400 to-green-500';
    if (avg >= 1.5) return 'from-amber-400 to-amber-500';
    return 'from-red-400 to-red-500';
  };

  const getTextColor = (avg: number): string => {
    if (avg >= 3.5) return 'text-emerald-600';
    if (avg >= 2.5) return 'text-green-600';
    if (avg >= 1.5) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-3">
      {COMPETENCY_DIMENSIONS.map((dim) => {
        const item = recap.find((r) => r.dimension === dim.key);
        const avg = item ? item.average : 0;
        const pct = maxRating > 0 ? (avg / maxRating) * 100 : 0;

        return (
          <motion.div
            key={dim.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="flex w-44 shrink-0 items-center gap-2 text-sm font-medium">
              <span>{dim.icon}</span>
              <span className="truncate">{dim.label}</span>
            </div>
            <div className="relative h-7 flex-1 rounded-full bg-muted">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${getBarColor(avg)}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, 0)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <div className={`w-14 shrink-0 text-right text-sm font-bold ${getTextColor(avg)}`}>
              {avg > 0 ? avg.toFixed(2) : '—'}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── GURU: Input Penilaian ───────────────────────────────────

function GuruInputTab({
  schoolId,
}: {
  schoolId: string;
}) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Fetch classes
  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    setLoadingClasses(true);
    fetch(`/api/classes?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((data: ClassItem[]) => {
        if (!cancelled) {
          setClasses(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => setClasses([]))
      .finally(() => !cancelled && setLoadingClasses(false));
    return () => { cancelled = true; };
  }, [schoolId]);

  // Fetch students when class changes
  useEffect(() => {
    if (!selectedClassId || !schoolId) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    setLoadingStudents(true);
    fetch(`/api/users?role=SISWA&schoolId=${schoolId}&classId=${selectedClassId}`)
      .then((r) => r.json())
      .then((data: StudentItem[]) => {
        if (!cancelled) {
          setStudents(Array.isArray(data) ? data : []);
          setSelectedStudentId('');
        }
      })
      .catch(() => setStudents([]))
      .finally(() => !cancelled && setLoadingStudents(false));
    return () => { cancelled = true; };
  }, [selectedClassId, schoolId]);

  // Fetch existing ratings when student+term changes
  useEffect(() => {
    if (!selectedStudentId || !term) {
      setRatings({});
      setNotes({});
      return;
    }
    let cancelled = false;
    fetch(`/api/competency-assessments?studentId=${selectedStudentId}&term=${encodeURIComponent(term)}`)
      .then((r) => r.json())
      .then((data: AssessmentRow[]) => {
        if (!cancelled && Array.isArray(data)) {
          const r: Record<string, number> = {};
          const n: Record<string, string> = {};
          data.forEach((a) => {
            r[a.dimension] = a.rating;
            if (a.note) n[a.dimension] = a.note;
          });
          setRatings(r);
          setNotes(n);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedStudentId, term]);

  const handleRating = (dimension: string, rating: number) => {
    setRatings((prev) => {
      if (prev[dimension] === rating) {
        const { [dimension]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [dimension]: rating };
    });
  };

  const handleNote = (dimension: string, note: string) => {
    setNotes((prev) => ({ ...prev, [dimension]: note }));
  };

  const handleSave = async () => {
    if (!selectedStudentId || !term || !date) {
      toast.error('Pilih siswa, periode, dan tanggal terlebih dahulu');
      return;
    }
    const dimensions = Object.keys(ratings);
    if (dimensions.length === 0) {
      toast.error('Berikan minimal satu penilaian');
      return;
    }

    setSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const dimension of dimensions) {
      try {
        const res = await fetch('/api/competency-assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: selectedStudentId,
            classId: selectedClassId || undefined,
            dimension,
            rating: ratings[dimension],
            term,
            note: notes[dimension] || undefined,
            date,
          }),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setSaving(false);
    if (failCount === 0) {
      toast.success(`Berhasil menyimpan ${successCount} penilaian`);
    } else {
      toast.warning(`Berhasil ${successCount}, gagal ${failCount} penilaian`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <motion.div {...fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Kelas</Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>{loadingClasses ? 'Memuat…' : <SelectValue placeholder="Pilih kelas" />}</SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} (Kelas {c.grade})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Siswa</Label>
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedClassId}>
            <SelectTrigger>{loadingStudents ? 'Memuat…' : <SelectValue placeholder="Pilih siswa" />}</SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}{s.nisn ? ` (${s.nisn})` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Periode</Label>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger><SelectValue placeholder="Pilih periode" /></SelectTrigger>
            <SelectContent>
              {TERM_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Tanggal</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </motion.div>

      <Separator />

      {/* Dimension cards grid */}
      {!selectedStudentId ? (
        <EmptyState message="Pilih kelas dan siswa untuk mulai menilai" />
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          {COMPETENCY_DIMENSIONS.map((dim) => (
            <motion.div key={dim.key} variants={fadeUp}>
              <Card className="h-full border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-xl">{dim.icon}</span>
                    {dim.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Rating buttons */}
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map((r) => {
                      const isSelected = ratings[dim.key] === r;
                      return (
                        <motion.button
                          key={r}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRating(dim.key, r)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? `${RATING_BADGE_STYLES[r]} shadow-sm`
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {r}
                          <span className="hidden sm:inline">{RATING_LABELS[r]}</span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Note */}
                  <Textarea
                    placeholder="Catatan (opsional)…"
                    value={notes[dim.key] || ''}
                    onChange={(e) => handleNote(dim.key, e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Save button */}
      {selectedStudentId && (
        <motion.div {...fadeUp} className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || Object.keys(ratings).length === 0} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Menyimpan…' : 'Simpan Penilaian'}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ─── GURU: Rekap Per Siswa ───────────────────────────────────

function RekapPerSiswa({
  schoolId,
  readOnly,
}: {
  schoolId: string;
  readOnly?: boolean;
}) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [studentsState, setStudentsState] = useState<StudentItem[]>([]);
  const students = (selectedClassId && schoolId) ? studentsState : [];
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [recapData, setRecapData] = useState<StudentRecapResponse | null>(null);
  const loading = !recapData && !!selectedStudentId && !!term;
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    fetch(`/api/classes?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((data: ClassItem[]) => {
        if (!cancelled) setClasses(Array.isArray(data) ? data : []);
      })
      .catch(() => setClasses([]))
      .finally(() => !cancelled && setLoadingClasses(false));
    return () => { cancelled = true; };
  }, [schoolId]);

  useEffect(() => {
    if (!selectedClassId || !schoolId) return;
    let cancelled = false;
    setLoadingStudents(true);
    fetch(`/api/users?role=SISWA&schoolId=${schoolId}&classId=${selectedClassId}`)
      .then((r) => r.json())
      .then((data: StudentItem[]) => {
        if (!cancelled) {
          setStudentsState(Array.isArray(data) ? data : []);
          setSelectedStudentId('');
        }
      })
      .catch(() => setStudentsState([]))
      .finally(() => !cancelled && setLoadingStudents(false));
    return () => { cancelled = true; };
  }, [selectedClassId, schoolId]);

  const fetchRecap = useCallback(() => {
    if (!selectedStudentId || !term) return;
    fetch(`/api/competency-assessments?recap=student&studentId=${selectedStudentId}&term=${encodeURIComponent(term)}`)
      .then((r) => r.json())
      .then((data: StudentRecapResponse) => {
        if (data && data.recap) setRecapData(data);
        else setRecapData(null);
      })
      .catch(() => setRecapData(null));
  }, [selectedStudentId, term]);

  useEffect(() => {
    fetchRecap();
  }, [fetchRecap]);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus penilaian ini?')) return;
    try {
      const res = await fetch(`/api/competency-assessments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Penilaian dihapus');
        setRecapData(null);
        fetchRecap();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Gagal menghapus');
      }
    } catch {
      toast.error('Gagal menghapus penilaian');
    }
  };

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <motion.div {...fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Kelas</Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>{loadingClasses ? 'Memuat…' : <SelectValue placeholder="Pilih kelas" />}</SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} (Kelas {c.grade})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Siswa</Label>
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedClassId}>
            <SelectTrigger>{loadingStudents ? 'Memuat…' : <SelectValue placeholder="Pilih siswa" />}</SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Periode</Label>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger><SelectValue placeholder="Pilih periode" /></SelectTrigger>
            <SelectContent>
              {TERM_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <Separator />

      {loading && <Spinner />}

      {!loading && (!selectedStudentId || !term) && (
        <EmptyState message="Pilih siswa dan periode untuk melihat rekap" />
      )}

      {!loading && selectedStudentId && recapData && (
        <AnimatePresence>
          <motion.div {...fadeUp} className="space-y-6">
            {/* Bar chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5" />
                  Rata-rata Per Dimensi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recapData.recap.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data penilaian</p>
                ) : (
                  <DimensionBarChart recap={recapData.recap} />
                )}
              </CardContent>
            </Card>

            {/* Raw assessments table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-5 w-5" />
                  Detail Penilaian
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recapData.assessments.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Belum ada penilaian</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">Dimensi</th>
                          <th className="pb-2 pr-4 font-medium">Penilai</th>
                          <th className="pb-2 pr-4 font-medium">Rating</th>
                          <th className="pb-2 pr-4 font-medium">Tanggal</th>
                          <th className="pb-2 pr-4 font-medium">Catatan</th>
                          {!readOnly && <th className="pb-2 font-medium">Aksi</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {recapData.assessments.map((a) => {
                          const dim = COMPETENCY_DIMENSIONS.find((d) => d.key === a.dimension);
                          return (
                            <tr key={a.id} className="border-b last:border-0">
                              <td className="py-2.5 pr-4">
                                <span className="flex items-center gap-1.5 font-medium">
                                  {dim?.icon} {dim?.label}
                                </span>
                              </td>
                              <td className="py-2.5 pr-4">{a.assessor?.name || '—'}</td>
                              <td className="py-2.5 pr-4">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${RATING_BADGE_READONLY[a.rating]}`}>
                                  {a.rating} – {RATING_LABELS[a.rating]}
                                </span>
                              </td>
                              <td className="py-2.5 pr-4 text-muted-foreground">
                                {a.date ? new Date(a.date).toLocaleDateString('id-ID') : '—'}
                              </td>
                              <td className="max-w-[200px] truncate py-2.5 pr-4 text-muted-foreground">
                                {a.note || '—'}
                              </td>
                              {!readOnly && (
                                <td className="py-2.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDelete(a.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── GURU/KEPSEK: Rekap Per Kelas ────────────────────────────

function RekapPerKelas({
  schoolId,
}: {
  schoolId: string;
}) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [recapData, setRecapData] = useState<ClassRecapResponse | null>(null);
  const loading = !recapData && !!selectedClassId && !!term;
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    fetch(`/api/classes?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((data: ClassItem[]) => {
        if (!cancelled) setClasses(Array.isArray(data) ? data : []);
      })
      .catch(() => setClasses([]))
      .finally(() => !cancelled && setLoadingClasses(false));
    return () => { cancelled = true; };
  }, [schoolId]);

  const fetchRecap = useCallback(() => {
    if (!selectedClassId || !term) return;
    fetch(`/api/competency-assessments?recap=class&classId=${selectedClassId}&term=${encodeURIComponent(term)}`)
      .then((r) => r.json())
      .then((data: ClassRecapResponse) => {
        if (data && data.recap) setRecapData(data);
        else setRecapData(null);
      })
      .catch(() => setRecapData(null));
  }, [selectedClassId, term]);

  useEffect(() => {
    fetchRecap();
  }, [fetchRecap]);

  // Build student summary across all dimensions
  const getStudentSummary = (): { studentId: string; totalAvg: number; count: number }[] => {
    if (!recapData) return [];
    const studentMap: Record<string, { total: number; count: number }> = {};
    for (const item of recapData.recap) {
      for (const sa of item.studentAverages || []) {
        if (!studentMap[sa.studentId]) {
          studentMap[sa.studentId] = { total: 0, count: 0 };
        }
        studentMap[sa.studentId].total += sa.average;
        studentMap[sa.studentId].count += 1;
      }
    }
    return Object.entries(studentMap).map(([studentId, data]) => ({
      studentId,
      totalAvg: data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : 0,
      count: data.count,
    }));
  };

  const studentSummary = getStudentSummary();

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <motion.div {...fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Kelas</Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>{loadingClasses ? 'Memuat…' : <SelectValue placeholder="Pilih kelas" />}</SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} (Kelas {c.grade})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Periode</Label>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger><SelectValue placeholder="Pilih periode" /></SelectTrigger>
            <SelectContent>
              {TERM_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <Separator />

      {loading && <Spinner />}

      {!loading && (!selectedClassId || !term) && (
        <EmptyState message="Pilih kelas dan periode untuk melihat rekap" />
      )}

      {!loading && selectedClassId && recapData && (
        <AnimatePresence>
          <motion.div {...fadeUp} className="space-y-6">
            {/* Class average bar chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5" />
                  Rata-rata Kelas Per Dimensi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recapData.recap.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data penilaian untuk kelas ini</p>
                ) : (
                  <DimensionBarChart recap={recapData.recap} />
                )}
              </CardContent>
            </Card>

            {/* Student list with averages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5" />
                  Rekap Per Siswa ({studentSummary.length} siswa)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {studentSummary.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data</p>
                ) : (
                  <div className="space-y-2">
                    {studentSummary
                      .sort((a, b) => b.totalAvg - a.totalAvg)
                      .map((s, idx) => {
                        const pct = (s.totalAvg / 4) * 100;
                        const getBarColor = (avg: number): string => {
                          if (avg >= 3.5) return 'from-emerald-400 to-emerald-500';
                          if (avg >= 2.5) return 'from-green-400 to-green-500';
                          if (avg >= 1.5) return 'from-amber-400 to-amber-500';
                          return 'from-red-400 to-red-500';
                        };
                        const getTextColor = (avg: number): string => {
                          if (avg >= 3.5) return 'text-emerald-600';
                          if (avg >= 2.5) return 'text-green-600';
                          if (avg >= 1.5) return 'text-amber-600';
                          return 'text-red-600';
                        };

                        // Try to find student name from the assessments in recap
                        const findStudentName = (studentId: string): string => {
                          for (const item of recapData.recap) {
                            const sa = item.studentAverages?.find((s) => s.studentId === studentId);
                            if (sa) {
                              // studentAverages doesn't have names, so we show ID
                              return `Siswa ${studentId.slice(0, 8)}…`;
                            }
                          }
                          return `Siswa ${studentId.slice(0, 8)}…`;
                        };

                        return (
                          <motion.div
                            key={s.studentId}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03, duration: 0.25 }}
                            className="flex items-center gap-3 rounded-lg border p-3"
                          >
                            <span className="w-6 shrink-0 text-right text-xs font-bold text-muted-foreground">
                              {idx + 1}.
                            </span>
                            <span className="w-36 shrink-0 truncate text-sm font-medium">
                              {findStudentName(s.studentId)}
                            </span>
                            <div className="relative h-5 flex-1 rounded-full bg-muted">
                              <motion.div
                                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${getBarColor(s.totalAvg)}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(pct, 0)}%` }}
                                transition={{ duration: 0.5, delay: idx * 0.03 }}
                              />
                            </div>
                            <span className={`w-12 shrink-0 text-right text-sm font-bold ${getTextColor(s.totalAvg)}`}>
                              {s.totalAvg.toFixed(2)}
                            </span>
                          </motion.div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── ORANG_TUA: Read-only view ───────────────────────────────

function OrtuView({
  userId,
  schoolId,
}: {
  userId: string;
  schoolId: string;
}) {
  const [children, setChildren] = useState<StudentItem[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [recapData, setRecapData] = useState<StudentRecapResponse | null>(null);
  const loading = !recapData && !!selectedChildId && !!term;
  const [loadingChildren, setLoadingChildren] = useState(true);

  // Fetch children
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/users?parentId=${userId}&schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((data: StudentItem[]) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setChildren(list);
          if (list.length === 1) setSelectedChildId(list[0].id);
        }
      })
      .catch(() => setChildren([]))
      .finally(() => !cancelled && setLoadingChildren(false));
    return () => { cancelled = true; };
  }, [userId, schoolId]);

  const fetchRecap = useCallback(() => {
    if (!selectedChildId || !term) return;
    fetch(`/api/competency-assessments?recap=student&studentId=${selectedChildId}&term=${encodeURIComponent(term)}`)
      .then((r) => r.json())
      .then((data: StudentRecapResponse) => {
        if (data && data.recap) setRecapData(data);
        else setRecapData(null);
      })
      .catch(() => setRecapData(null));
  }, [selectedChildId, term]);

  useEffect(() => {
    fetchRecap();
  }, [fetchRecap]);

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <motion.div {...fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Anak</Label>
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger>{loadingChildren ? 'Memuat…' : <SelectValue placeholder="Pilih anak" />}</SelectTrigger>
            <SelectContent>
              {children.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Periode</Label>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger><SelectValue placeholder="Pilih periode" /></SelectTrigger>
            <SelectContent>
              {TERM_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <Separator />

      {loading && <Spinner />}

      {!loading && (!selectedChildId || !term) && (
        <EmptyState message="Pilih anak dan periode untuk melihat profil lulusan" />
      )}

      {!loading && selectedChildId && recapData && (
        <AnimatePresence>
          <motion.div {...fadeUp} className="space-y-6">
            {/* Bar chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5" />
                  Profil Lulusan — 8 Dimensi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recapData.recap.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada data penilaian untuk periode ini
                  </p>
                ) : (
                  <DimensionBarChart recap={recapData.recap} />
                )}
              </CardContent>
            </Card>

            {/* Assessment detail cards */}
            {recapData.assessments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-5 w-5" />
                    Detail Penilaian
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recapData.assessments.map((a) => {
                      const dim = COMPETENCY_DIMENSIONS.find((d) => d.key === a.dimension);
                      return (
                        <div
                          key={a.id}
                          className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-4"
                        >
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            {dim?.icon} {dim?.label}
                          </span>
                          <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${RATING_BADGE_READONLY[a.rating]}`}>
                            {a.rating} – {RATING_LABELS[a.rating]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {a.date ? new Date(a.date).toLocaleDateString('id-ID') : ''}
                          </span>
                          {a.note && (
                            <span className="text-xs text-muted-foreground italic">{a.note}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function ProfilLulusanView() {
  const user = useAppStore((s) => s.user);
  const schoolId = user?.schoolId || '';
  const role = user?.role || '';

  const isGuru = role === 'GURU';
  const isOrtu = role === 'ORANG_TUA';
  const isKepsek = role === 'KEPALA_SEKOLAH';

  // ── ORANG_TUA ──
  if (isOrtu) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <motion.div {...fadeUp}>
          <h2 className="text-xl font-bold tracking-tight">Profil Lulusan Anak</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pantau perkembangan 8 dimensi profil lulusan anak Anda
          </p>
        </motion.div>
        <OrtuView userId={user!.id} schoolId={schoolId} />
      </div>
    );
  }

  // ── KEPALA_SEKOLAH ──
  if (isKepsek) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <motion.div {...fadeUp}>
          <h2 className="text-xl font-bold tracking-tight">Profil Lulusan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rekap 8 dimensi profil lulusan per kelas dan per siswa
          </p>
        </motion.div>
        <Tabs defaultValue="kelas" className="w-full">
          <TabsList>
            <TabsTrigger value="kelas" className="gap-1.5">
              <Users className="h-4 w-4" />
              Rekap Per Kelas
            </TabsTrigger>
            <TabsTrigger value="siswa" className="gap-1.5">
              <Eye className="h-4 w-4" />
              Rekap Per Siswa
            </TabsTrigger>
          </TabsList>
          <TabsContent value="kelas" className="mt-6">
            <RekapPerKelas schoolId={schoolId} />
          </TabsContent>
          <TabsContent value="siswa" className="mt-6">
            <RekapPerSiswa schoolId={schoolId} readOnly />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ── GURU (default) ──
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <motion.div {...fadeUp}>
        <h2 className="text-xl font-bold tracking-tight">Profil Lulusan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Penilaian 8 dimensi profil lulusan peserta didik
        </p>
      </motion.div>
      <Tabs defaultValue="input" className="w-full">
        <TabsList>
          <TabsTrigger value="input" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Input Penilaian
          </TabsTrigger>
          <TabsTrigger value="rekap-siswa" className="gap-1.5">
            <Eye className="h-4 w-4" />
            Rekap Per Siswa
          </TabsTrigger>
          <TabsTrigger value="rekap-kelas" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Rekap Per Kelas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="input" className="mt-6">
          <GuruInputTab schoolId={schoolId} />
        </TabsContent>
        <TabsContent value="rekap-siswa" className="mt-6">
          <RekapPerSiswa schoolId={schoolId} />
        </TabsContent>
        <TabsContent value="rekap-kelas" className="mt-6">
          <RekapPerKelas schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
