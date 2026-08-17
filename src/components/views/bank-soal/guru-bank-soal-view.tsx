'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Plus,
  Upload,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Archive,
  CheckCircle2,
  FileText,
  ListChecks,
  BookOpen,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Database,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImportSoalWordDialog } from '@/components/views/guru-import-soal';

// ===== Types =====
interface SubjectItem {
  id: string;
  name: string;
  code: string;
}

interface QuestionItem {
  id: string;
  subjectId: string;
  topicId: string | null;
  schoolId: string | null;
  type: string;
  content: string;
  options: string | null;
  answer: string | null;
  explanation: string | null;
  cognitiveLevel: string;
  difficulty: string;
  status: string;
  source: string;
  createdBy: string;
  createdAt: string;
  subject?: { id: string; name: string; code: string };
  topic?: { id: string; name: string } | null;
  creator?: { id: string; name: string };
}

interface OptionItem {
  label: string;
  text: string;
  isCorrect: boolean;
}

const QUESTION_TYPES = [
  { code: 'pg', name: 'Pilihan Ganda' },
  { code: 'pg_kompleks', name: 'PG Kompleks' },
  { code: 'isian', name: 'Isian Singkat' },
  { code: 'esai', name: 'Esai' },
];

const COGNITIVE_LEVELS = [
  { code: 'C1', name: 'C1 - Mengingat' },
  { code: 'C2', name: 'C2 - Memahami' },
  { code: 'C3', name: 'C3 - Menerapkan' },
  { code: 'C4', name: 'C4 - Menganalisis' },
  { code: 'C5', name: 'C5 - Mengevaluasi' },
  { code: 'C6', name: 'C6 - Mencipta' },
];

const DIFFICULTIES = [
  { code: 'mudah', name: 'Mudah', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { code: 'sedang', name: 'Sedang', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { code: 'sulit', name: 'Sulit', color: 'text-red-600 bg-red-50 border-red-200' },
];

const EMPTY_OPTIONS: OptionItem[] = [
  { label: 'A', text: '', isCorrect: false },
  { label: 'B', text: '', isCorrect: false },
  { label: 'C', text: '', isCorrect: false },
  { label: 'D', text: '', isCorrect: false },
];

// ===== Main Component =====
export function GuruBankSoalView() {
  const user = useAppStore((s) => s.user);

  // Data
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMineOnly, setFilterMineOnly] = useState(false);

  // UI
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formSaving, setFormSaving] = useState(false);
  const [form, setForm] = useState({
    subjectId: '',
    topicId: '',
    type: 'pg',
    content: '',
    options: [...EMPTY_OPTIONS],
    answer: '',
    explanation: '',
    cognitiveLevel: 'C3',
    difficulty: 'sedang',
  });

  // Stats
  const stats = useMemo(() => {
    const total = questions.length;
    const published = questions.filter((q) => q.status === 'published').length;
    const draft = questions.filter((q) => q.status === 'draft').length;
    const archived = questions.filter((q) => q.status === 'archived').length;
    const mine = questions.filter((q) => q.createdBy === user?.id).length;
    return { total, published, draft, archived, mine };
  }, [questions, user?.id]);

  // ===== Fetch =====
  const fetchQuestions = useCallback(async () => {
    if (!user?.schoolId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ schoolId: user.schoolId });
      if (filterSubject) params.append('subjectId', filterSubject);
      if (filterType) params.append('type', filterType);
      if (filterDifficulty) params.append('difficulty', filterDifficulty);
      if (filterStatus) params.append('status', filterStatus);
      if (filterMineOnly) params.append('createdBy', user.id);
      if (search) params.append('search', search);

      const res = await fetch(`/api/questions?${params}`);
      if (!res.ok) throw new Error('Gagal memuat soal');
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Gagal memuat bank soal');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId, user?.id, filterSubject, filterType, filterDifficulty, filterStatus, filterMineOnly, search]);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // ===== Form helpers =====
  const resetForm = () => {
    setForm({
      subjectId: '',
      topicId: '',
      type: 'pg',
      content: '',
      options: [...EMPTY_OPTIONS],
      answer: '',
      explanation: '',
      cognitiveLevel: 'C3',
      difficulty: 'sedang',
    });
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (q: QuestionItem) => {
    setEditingId(q.id);
    let parsedOptions: OptionItem[] = [...EMPTY_OPTIONS];
    if (q.options) {
      try {
        parsedOptions = JSON.parse(q.options);
      } catch {
        parsedOptions = [...EMPTY_OPTIONS];
      }
    }
    setForm({
      subjectId: q.subjectId,
      topicId: q.topicId || '',
      type: q.type,
      content: q.content,
      options: parsedOptions,
      answer: q.answer || '',
      explanation: q.explanation || '',
      cognitiveLevel: q.cognitiveLevel,
      difficulty: q.difficulty,
    });
    setFormOpen(true);
  };

  const updateOption = (index: number, field: keyof OptionItem, value: string | boolean) => {
    setForm((prev) => {
      const newOpts = [...prev.options];
      newOpts[index] = { ...newOpts[index], [field]: value };
      // If setting isCorrect, uncheck all others for PG type
      if (field === 'isCorrect' && value === true && prev.type === 'pg') {
        return {
          ...prev,
          options: newOpts.map((o, i) => (i === index ? { ...o, isCorrect: true } : { ...o, isCorrect: false })),
        };
      }
      return { ...prev, options: newOpts };
    });
  };

  const addOption = () => {
    if (form.options.length >= 6) return;
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { label: labels[prev.options.length], text: '', isCorrect: false }],
    }));
  };

  const removeOption = (index: number) => {
    if (form.options.length <= 2) return;
    setForm((prev) => ({
      ...prev,
      options: prev.options
        .filter((_, i) => i !== index)
        .map((o, i) => ({ ...o, label: ['A', 'B', 'C', 'D', 'E', 'F'][i] })),
    }));
  };

  const handleSave = async () => {
    if (!form.subjectId) {
      toast.error('Pilih mata pelajaran');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Isi soal tidak boleh kosong');
      return;
    }
    if ((form.type === 'pg' || form.type === 'pg_kompleks') && form.options.filter((o) => o.text.trim()).length < 2) {
      toast.error('Pilihan Ganda minimal 2 opsi');
      return;
    }

    setFormSaving(true);
    try {
      const payload: Record<string, unknown> = {
        subjectId: form.subjectId,
        topicId: form.topicId || null,
        schoolId: user?.schoolId,
        type: form.type,
        content: form.content.trim(),
        answer: form.answer.trim() || null,
        explanation: form.explanation.trim() || null,
        cognitiveLevel: form.cognitiveLevel,
        difficulty: form.difficulty,
        createdBy: user?.id,
      };

      if (form.type === 'pg' || form.type === 'pg_kompleks') {
        payload.options = form.options.filter((o) => o.text.trim());
      }

      let res: Response;
      if (editingId) {
        res = await fetch('/api/questions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        res = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan soal');
      }

      toast.success(editingId ? 'Soal berhasil diperbarui' : 'Soal berhasil dibuat');
      setFormOpen(false);
      resetForm();
      fetchQuestions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/questions?id=${deletingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus');
      toast.success('Soal berhasil dihapus');
      setDeleteOpen(false);
      setDeletingId(null);
      fetchQuestions();
    } catch {
      toast.error('Gagal menghapus soal');
    }
  };

  const toggleStatus = async (q: QuestionItem) => {
    try {
      const newStatus = q.status === 'published' ? 'draft' : 'published';
      const res = await fetch('/api/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: q.id, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(newStatus === 'published' ? 'Soal dipublikasi' : 'Soal disimpan sebagai draft');
      fetchQuestions();
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  // ===== Render Helpers =====
  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = { pg: 'PG', pg_kompleks: 'PGK', isian: 'Isian', esai: 'Esai' };
    return map[type] || type;
  };

  const getTypeColor = (type: string) => {
    const map: Record<string, string> = {
      pg: 'border-sky-300 text-sky-700 bg-sky-50',
      pg_kompleks: 'border-indigo-300 text-indigo-700 bg-indigo-50',
      isian: 'border-amber-300 text-amber-700 bg-amber-50',
      esai: 'border-violet-300 text-violet-700 bg-violet-50',
    };
    return map[type] || 'border-slate-300 text-slate-700 bg-slate-50';
  };

  const getDiffColor = (d: string) => {
    const found = DIFFICULTIES.find((x) => x.code === d);
    return found?.color || 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const parseOptions = (opts: string | null): OptionItem[] => {
    if (!opts) return [];
    try {
      return JSON.parse(opts);
    } catch {
      return [];
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ===== Render =====
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Soal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola soal — buat manual, impor dari Word, lalu ambil ke Tugas Terstruktur
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
            <Upload className="h-4 w-4" />
            Impor Word
          </Button>
          <Button size="sm" onClick={openCreateForm} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Buat Soal
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Soal', value: stats.total, icon: Database, color: 'text-slate-600 bg-slate-50' },
          { label: 'Dipublikasi', value: stats.published, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Draft', value: stats.draft, icon: FileText, color: 'text-amber-600 bg-amber-50' },
          { label: 'Diarsipkan', value: stats.archived, icon: Archive, color: 'text-slate-500 bg-slate-100' },
          { label: 'Soal Saya', value: stats.mine, icon: Sparkles, color: 'text-sky-600 bg-sky-50' },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold leading-tight">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari soal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            {/* Subject */}
            <Select value={filterSubject} onValueChange={(v) => setFilterSubject(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full lg:w-44">
                <BookOpen className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Mapel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Type */}
            <Select value={filterType} onValueChange={(v) => setFilterType(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full lg:w-36">
                <ListChecks className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {QUESTION_TYPES.map((t) => (
                  <SelectItem key={t.code} value={t.code}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Difficulty */}
            <Select value={filterDifficulty} onValueChange={(v) => setFilterDifficulty(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full lg:w-32">
                <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Tingkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d.code} value={d.code}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Status */}
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="published">Dipublikasi</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Diarsipkan</SelectItem>
              </SelectContent>
            </Select>
            {/* Mine only toggle */}
            <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap px-2">
              <Checkbox checked={filterMineOnly} onCheckedChange={(v) => setFilterMineOnly(!!v)} />
              <span className="text-sm text-muted-foreground">Hanya soal saya</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Question List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Memuat bank soal...</span>
        </div>
      ) : questions.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Database className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Belum Ada Soal</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Mulai buat soal manual atau impor dari dokumen Word untuk mengisi bank soal.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5">
                <Upload className="h-4 w-4" />
                Impor dari Word
              </Button>
              <Button onClick={openCreateForm} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4" />
                Buat Soal Baru
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Menampilkan {questions.length} soal
          </p>
          <ScrollArea className="max-h-[calc(100vh-420px)]">
            <div className="space-y-2 pb-4">
              {questions.map((q, idx) => {
                const opts = parseOptions(q.options);
                const isExpanded = expandedId === q.id;
                const isMine = q.createdBy === user?.id;

                return (
                  <Card
                    key={q.id}
                    className={`border shadow-sm transition-all hover:shadow-md ${isExpanded ? 'ring-1 ring-primary/20' : ''} ${
                      q.status === 'archived' ? 'opacity-60' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      {/* Row 1: Number + Content Preview + Actions */}
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-mono text-muted-foreground mt-0.5 w-6 text-right shrink-0">
                          {idx + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          {/* Badges row */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-2">
                            {q.subject && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                                {q.subject.name}
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getTypeColor(q.type)}`}>
                              {getTypeLabel(q.type)}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getDiffColor(q.difficulty)}`}>
                              {q.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">
                              {q.cognitiveLevel}
                            </Badge>
                            {q.status === 'published' && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                                Published
                              </Badge>
                            )}
                            {q.status === 'draft' && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                                Draft
                              </Badge>
                            )}
                            {q.status === 'archived' && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-100">
                                Archived
                              </Badge>
                            )}
                            {q.source === 'ai' && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 gap-0.5">
                                <Sparkles className="h-2.5 w-2.5" />AI
                              </Badge>
                            )}
                            {isMine && q.source !== 'ai' && (
                              <span className="text-[10px] text-slate-400 italic">oleh Anda</span>
                            )}
                            {!isMine && q.creator && (
                              <span className="text-[10px] text-slate-400 italic">oleh {q.creator.name}</span>
                            )}
                          </div>

                          {/* Content preview */}
                          <p className={`text-sm text-foreground leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                            {q.content}
                          </p>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="mt-3 space-y-3 border-t pt-3">
                              {/* Options */}
                              {opts.length > 0 && (
                                <div className="space-y-1.5">
                                  {opts.map((opt) => (
                                    <div
                                      key={opt.label}
                                      className={`flex items-start gap-2 text-sm px-2.5 py-1.5 rounded-lg ${
                                        opt.isCorrect
                                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                                          : 'bg-slate-50 border border-slate-100 text-slate-700'
                                      }`}
                                    >
                                      <span className="font-medium shrink-0 w-5">{opt.label}.</span>
                                      <span className="flex-1">{opt.text}</span>
                                      {opt.isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Answer (for isian/esai) */}
                              {q.answer && (q.type === 'isian' || q.type === 'esai') && (
                                <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                                  <p className="text-xs font-medium text-emerald-700 mb-1">Jawaban:</p>
                                  <p className="text-sm text-emerald-800">{q.answer}</p>
                                </div>
                              )}

                              {/* Explanation */}
                              {q.explanation && (
                                <div className="bg-sky-50 rounded-lg p-2.5 border border-sky-200">
                                  <p className="text-xs font-medium text-sky-700 mb-1">Pembahasan:</p>
                                  <p className="text-sm text-sky-800">{q.explanation}</p>
                                </div>
                              )}

                              {/* Meta */}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Dibuat: {formatDate(q.createdAt)}</span>
                                {q.topic && <span>Topik: {q.topic.name}</span>}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setExpandedId(isExpanded ? null : q.id)}
                            title={isExpanded ? 'Tutup detail' : 'Lihat detail'}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toggleStatus(q)}>
                                {q.status === 'published' ? (
                                  <>
                                    <EyeOff className="h-4 w-4 mr-2" /> Jadikan Draft
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-2" /> Publikasi
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditForm(q)}>
                                <Edit3 className="h-4 w-4 mr-2" /> Edit Soal
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeletingId(q.id);
                                  setDeleteOpen(true);
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ===== Create/Edit Dialog ===== */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { resetForm(); setFormOpen(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Soal' : 'Buat Soal Baru'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Perbarui isi dan pilihan soal.' : 'Isi detail soal untuk ditambahkan ke bank soal.'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-2">
              {/* Row: Subject + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Mata Pelajaran *</Label>
                  <Select value={form.subjectId} onValueChange={(v) => setForm((p) => ({ ...p, subjectId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih mapel" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tipe Soal *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((t) => (
                        <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row: Difficulty + Cognitive */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tingkat Kesulitan</Label>
                  <Select value={form.difficulty} onValueChange={(v) => setForm((p) => ({ ...p, difficulty: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((d) => (
                        <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Level Kognitif</Label>
                  <Select value={form.cognitiveLevel} onValueChange={(v) => setForm((p) => ({ ...p, cognitiveLevel: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COGNITIVE_LEVELS.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Isi Soal *</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  placeholder="Tulis isi pertanyaan / soal di sini..."
                  rows={4}
                  className="resize-y"
                />
              </div>

              {/* Options (PG only) */}
              {(form.type === 'pg' || form.type === 'pg_kompleks') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Pilihan Jawaban</Label>
                    {form.options.length < 6 && (
                      <Button type="button" variant="ghost" size="sm" onClick={addOption} className="h-7 text-xs gap-1">
                        <Plus className="h-3 w-3" /> Tambah Opsi
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Checkbox
                          checked={opt.isCorrect}
                          onCheckedChange={(v) => updateOption(i, 'isCorrect', !!v)}
                          className="shrink-0"
                        />
                        <span className="text-sm font-medium w-5 text-center">{opt.label}.</span>
                        <Input
                          value={opt.text}
                          onChange={(e) => updateOption(i, 'text', e.target.value)}
                          placeholder={`Pilihan ${opt.label}`}
                          className="flex-1 h-9"
                        />
                        {form.options.length > 2 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(i)} className="h-8 w-8 p-0">
                            <X className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Centang pilihan yang benar. Untuk PG Kompleks, bisa centang lebih dari satu.
                  </p>
                </div>
              )}

              {/* Answer (for isian/esai) */}
              {(form.type === 'isian' || form.type === 'esai') && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Jawaban / Kunci Jawaban</Label>
                  <Textarea
                    value={form.answer}
                    onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
                    placeholder={form.type === 'isian' ? 'Jawaban singkat...' : 'Kunci jawaban / rubrik penilaian...'}
                    rows={2}
                    className="resize-y"
                  />
                </div>
              )}

              {/* Explanation */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Pembahasan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                <Textarea
                  value={form.explanation}
                  onChange={(e) => setForm((p) => ({ ...p, explanation: e.target.value }))}
                  placeholder="Penjelasan jawaban..."
                  rows={2}
                  className="resize-y"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => { resetForm(); setFormOpen(false); }}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={formSaving} className="bg-emerald-600 hover:bg-emerald-700">
              {formSaving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : editingId ? (
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              {formSaving ? 'Menyimpan...' : editingId ? 'Perbarui Soal' : 'Simpan Soal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirmation ===== */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Soal?</AlertDialogTitle>
            <AlertDialogDescription>
              Soal yang dihapus tidak dapat dikembalikan. Pastikan soal ini tidak digunakan di tugas aktif.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Import Dialog ===== */}
      <ImportSoalWordDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        subjects={subjects}
        onImportComplete={() => {
          fetchQuestions();
          setImportOpen(false);
        }}
      />
    </div>
  );
}
