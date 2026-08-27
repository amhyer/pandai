'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════

interface Question {
  id: string;
  subjectId: string;
  topicId: string | null;
  schoolId: string | null;
  type: 'pg' | 'pg_kompleks' | 'isian' | 'esai';
  content: string;
  options: string | null;
  answer: string | null;
  explanation: string | null;
  cognitiveLevel: string;
  difficulty: 'mudah' | 'sedang' | 'sulit';
  status: 'draft' | 'published' | 'archived';
  source: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  subject: { id: string; name: string; code: string };
  topic: { id: string; name: string } | null;
  creator: { id: string; name: string };
}

interface QuestionOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

interface FormState {
  subjectId: string;
  type: 'pg' | 'pg_kompleks' | 'isian' | 'esai';
  content: string;
  options: QuestionOption[];
  answer: string;
  explanation: string;
  cognitiveLevel: string;
  difficulty: 'mudah' | 'sedang' | 'sulit';
}

const TYPE_LABELS: Record<string, string> = {
  pg: 'Pilihan Ganda',
  pg_kompleks: 'PG Kompleks',
  isian: 'Isian Singkat',
  esai: 'Esai',
};

const TYPE_COLORS: Record<string, string> = {
  pg: 'bg-blue-100 text-blue-700 border-blue-200',
  pg_kompleks: 'bg-purple-100 text-purple-700 border-purple-200',
  isian: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  esai: 'bg-amber-100 text-amber-700 border-amber-200',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  mudah: 'Mudah',
  sedang: 'Sedang',
  sulit: 'Sulit',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  mudah: 'bg-emerald-100 text-emerald-700',
  sedang: 'bg-amber-100 text-amber-700',
  sulit: 'bg-red-100 text-red-700',
};

const COGNITIVE_LEVELS = [
  { value: 'C1', label: 'C1 - Mengingat (Remembering)' },
  { value: 'C2', label: 'C2 - Memahami (Understanding)' },
  { value: 'C3', label: 'C3 - Menerapkan (Applying)' },
  { value: 'C4', label: 'C4 - Menganalisis (Analyzing)' },
  { value: 'C5', label: 'C5 - Mengevaluasi (Evaluating)' },
  { value: 'C6', label: 'C6 - Mencipta (Creating)' },
];

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ═══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function GradientIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'p-2.5 rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

function PageHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <GradientIcon>{icon}</GradientIcon>
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge
      className={cn(
        'rounded-full border-0 px-3 py-0.5 text-xs font-medium',
        TYPE_COLORS[type] || 'bg-gray-100 text-gray-700'
      )}
    >
      {TYPE_LABELS[type] || type}
    </Badge>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <Badge
      className={cn(
        'rounded-full border-0 px-3 py-0.5 text-xs font-medium',
        DIFFICULTY_COLORS[difficulty] || 'bg-gray-100 text-gray-700'
      )}
    >
      {DIFFICULTY_LABELS[difficulty] || difficulty}
    </Badge>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-amber-400',
    published: 'bg-emerald-400',
    archived: 'bg-gray-400',
  };
  const labels: Record<string, string> = {
    draft: 'Draft',
    published: 'Terbit',
    archived: 'Arsip',
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn('w-2 h-2 rounded-full', colors[status] || 'bg-gray-400')} />
      {labels[status] || status}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="rounded-xl border-dashed border-2 border-gray-200 bg-white">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="p-4 rounded-full bg-gradient-to-br from-[#1F3864]/10 to-[#2d5289]/10 mb-4">
          <BookOpen className="w-10 h-10 text-[#1F3864]/60" />
        </div>
        <h3 className="text-lg font-semibold text-[#1F3864] mb-2">Belum Ada Soal</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          Anda belum memiliki soal di bank soal. Mulai buat soal pertama Anda untuk mata
          pelajaran yang diampu.
        </p>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Buat Soal Pertama
        </Button>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// QUESTION CARD
// ═══════════════════════════════════════════════════════════════════

function QuestionCard({
  question,
  onEdit,
  onDelete,
}: {
  question: Question;
  onEdit: (q: Question) => void;
  onDelete: (q: Question) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const parseOptions = (optionsStr: string | null): QuestionOption[] => {
    if (!optionsStr) return [];
    try {
      return JSON.parse(optionsStr);
    } catch {
      return [];
    }
  };

  const parsedOptions = parseOptions(question.options);
  const contentPreview =
    question.content.length > 150
      ? question.content.slice(0, 150) + '...'
      : question.content;

  return (
    <Card className="rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 sm:p-6">
        {/* Top row: badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className="rounded-full px-3 py-0.5 text-xs font-medium bg-slate-50 text-slate-600 border-slate-200">
            {question.subject.name}
          </Badge>
          <TypeBadge type={question.type} />
          <DifficultyBadge difficulty={question.difficulty} />
          <StatusDot status={question.status} />
        </div>

        {/* Question content */}
        <div className="mb-3">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {expanded ? question.content : contentPreview}
          </p>
          {question.content.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 text-xs text-[#2d5289] hover:text-[#1F3864] mt-1 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Sembunyikan
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Tampilkan selengkapnya
                </>
              )}
            </button>
          )}
        </div>

        {/* Show parsed options for PG types when expanded */}
        {expanded && (question.type === 'pg' || question.type === 'pg_kompleks') && parsedOptions.length > 0 && (
          <div className="mb-3 pl-2 border-l-2 border-gray-100 space-y-1">
            {parsedOptions.map((opt, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                    opt.isCorrect
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-50 text-gray-500 border border-gray-200'
                  )}
                >
                  {opt.label}
                </span>
                <span className={cn(opt.isCorrect && 'font-medium text-emerald-700')}>
                  {opt.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Show explanation when expanded */}
        {expanded && question.explanation && (
          <div className="mb-3 p-3 rounded-lg bg-sky-50 border border-sky-100">
            <p className="text-xs font-medium text-sky-700 mb-1">Pembahasan</p>
            <p className="text-xs text-sky-600 leading-relaxed whitespace-pre-wrap">{question.explanation}</p>
          </div>
        )}

        {/* Bottom row: meta + actions */}
        <Separator className="mb-3" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Dibuat oleh {question.creator.name}</span>
            <span>•</span>
            <span>{formatDate(question.createdAt)}</span>
            {question.cognitiveLevel && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0">
                  {question.cognitiveLevel}
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="gap-1.5 text-xs h-8"
            >
              {expanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {expanded ? 'Sembunyikan' : 'Detail'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(question)}
              className="gap-1.5 text-xs h-8 text-[#2d5289] hover:text-[#1F3864] hover:bg-[#1F3864]/5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(question)}
              className="gap-1.5 text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CREATE / EDIT DIALOG
// ═══════════════════════════════════════════════════════════════════

function QuestionFormDialog({
  open,
  onClose,
  onSave,
  subjects,
  editQuestion,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormState) => Promise<void>;
  subjects: { id: string; name: string; code: string }[];
  editQuestion: Question | null;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    subjectId: '',
    type: 'pg',
    content: '',
    options: [
      { label: 'A', text: '', isCorrect: true },
      { label: 'B', text: '', isCorrect: false },
      { label: 'C', text: '', isCorrect: false },
      { label: 'D', text: '', isCorrect: false },
    ],
    answer: '',
    explanation: '',
    cognitiveLevel: 'C3',
    difficulty: 'sedang',
  });

  const isEdit = !!editQuestion;
  const isPG = form.type === 'pg' || form.type === 'pg_kompleks';

  // Populate form when editing
  useEffect(() => {
    if (editQuestion) {
      let parsedOptions: QuestionOption[] = [
        { label: 'A', text: '', isCorrect: true },
        { label: 'B', text: '', isCorrect: false },
        { label: 'C', text: '', isCorrect: false },
        { label: 'D', text: '', isCorrect: false },
      ];
      if (editQuestion.options) {
        try {
          parsedOptions = JSON.parse(editQuestion.options);
        } catch {
          // keep defaults
        }
      }
      setForm({
        subjectId: editQuestion.subjectId,
        type: editQuestion.type,
        content: editQuestion.content,
        options: parsedOptions,
        answer: editQuestion.answer || '',
        explanation: editQuestion.explanation || '',
        cognitiveLevel: editQuestion.cognitiveLevel || 'C3',
        difficulty: editQuestion.difficulty || 'sedang',
      });
    } else {
      setForm({
        subjectId: '',
        type: 'pg',
        content: '',
        options: [
          { label: 'A', text: '', isCorrect: true },
          { label: 'B', text: '', isCorrect: false },
          { label: 'C', text: '', isCorrect: false },
          { label: 'D', text: '', isCorrect: false },
        ],
        answer: '',
        explanation: '',
        cognitiveLevel: 'C3',
        difficulty: 'sedang',
      });
    }
  }, [editQuestion, open]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateOption = (index: number, field: keyof QuestionOption, value: string | boolean) => {
    setForm((prev) => {
      const newOptions = prev.options.map((opt, i) => {
        if (i === index) {
          return { ...opt, [field]: value } as QuestionOption;
        }
        // For PG (not kompleks), only one answer is correct
        if (field === 'isCorrect' && value === true && prev.type === 'pg') {
          return { ...opt, isCorrect: false };
        }
        return opt;
      });
      return { ...prev, options: newOptions };
    });
  };

  const addOption = () => {
    if (form.options.length >= 6) return;
    const nextLabel = OPTION_LABELS[form.options.length] || String.fromCharCode(65 + form.options.length);
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { label: nextLabel, text: '', isCorrect: false }],
    }));
  };

  const removeOption = (index: number) => {
    if (form.options.length <= 2) return;
    setForm((prev) => ({
      ...prev,
      options: prev.options
        .filter((_, i) => i !== index)
        .map((opt, i) => ({ ...opt, label: OPTION_LABELS[i] })),
    }));
  };

  const handleTypeChange = (newType: string) => {
    const typedType = newType as FormState['type'];
    const newIsPG = typedType === 'pg' || typedType === 'pg_kompleks';

    if (newIsPG && !isPG) {
      // Switching to PG: ensure at least one correct answer
      setForm((prev) => {
        const hasCorrect = prev.options.some((o) => o.isCorrect);
        return {
          ...prev,
          type: typedType,
          options: hasCorrect
            ? prev.options
            : prev.options.map((o, i) => ({ ...o, isCorrect: i === 0 })),
        };
      });
    } else if (!newIsPG && isPG) {
      // Switching away from PG: clear options
      setForm((prev) => ({ ...prev, type: typedType }));
    } else {
      setForm((prev) => ({ ...prev, type: typedType }));
    }
  };

  const validate = (): boolean => {
    if (!form.subjectId) {
      toast.error('Mata pelajaran wajib dipilih');
      return false;
    }
    if (!form.content.trim()) {
      toast.error('Isi soal tidak boleh kosong');
      return false;
    }
    if (isPG) {
      if (form.options.some((o) => !o.text.trim())) {
        toast.error('Semua opsi jawaban harus diisi');
        return false;
      }
      if (!form.options.some((o) => o.isCorrect)) {
        toast.error('Pilih jawaban yang benar');
        return false;
      }
    } else {
      if (!form.answer.trim()) {
        toast.error('Kunci jawaban wajib diisi');
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      // Error handled in onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg text-[#1F3864]">
            {isEdit ? 'Edit Soal' : 'Buat Soal Baru'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Perbarui soal yang sudah ada di bank soal.'
              : 'Isi detail soal untuk ditambahkan ke bank soal.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pe-3">
          <div className="space-y-5 pr-3">
            {/* Subject & Type row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Mata Pelajaran <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.subjectId}
                  onValueChange={(v) => updateField('subjectId', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih mata pelajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Tipe Soal <span className="text-red-500">*</span>
                </Label>
                <Select value={form.type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pg">Pilihan Ganda</SelectItem>
                    <SelectItem value="pg_kompleks">PG Kompleks</SelectItem>
                    <SelectItem value="isian">Isian Singkat</SelectItem>
                    <SelectItem value="esai">Esai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Difficulty & Cognitive Level row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tingkat Kesulitan</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) => updateField('difficulty', v as FormState['difficulty'])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mudah">Mudah</SelectItem>
                    <SelectItem value="sedang">Sedang</SelectItem>
                    <SelectItem value="sulit">Sulit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Level Kognitif</Label>
                <Select
                  value={form.cognitiveLevel}
                  onValueChange={(v) => updateField('cognitiveLevel', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COGNITIVE_LEVELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Question content */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Isi Soal <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={form.content}
                onChange={(e) => updateField('content', e.target.value)}
                placeholder="Tulis isi pertanyaan soal di sini..."
                rows={4}
                className="resize-y"
              />
            </div>

            {/* Dynamic options for PG / PG Kompleks */}
            {isPG && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Opsi Jawaban <span className="text-red-500">*</span>
                    {form.type === 'pg' && (
                      <span className="text-muted-foreground font-normal ml-1">(pilih 1 benar)</span>
                    )}
                    {form.type === 'pg_kompleks' && (
                      <span className="text-muted-foreground font-normal ml-1">(boleh lebih dari 1)</span>
                    )}
                  </Label>
                  {form.options.length < 6 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                      className="gap-1 h-7 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Tambah Opsi
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {form.options.map((opt, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex items-center pt-2">
                        <Checkbox
                          checked={opt.isCorrect}
                          onCheckedChange={(checked) =>
                            updateOption(index, 'isCorrect', !!checked)
                          }
                          className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                      </div>
                      <span className="flex items-center justify-center w-7 h-9 rounded-md bg-gray-100 text-xs font-bold text-gray-600 shrink-0">
                        {opt.label}
                      </span>
                      <Input
                        value={opt.text}
                        onChange={(e) => updateOption(index, 'text', e.target.value)}
                        placeholder={`Teks opsi ${opt.label}...`}
                        className="flex-1"
                      />
                      {form.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                          className="shrink-0 h-9 w-9 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Answer for non-PG types */}
            {!isPG && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Kunci Jawaban <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={form.answer}
                  onChange={(e) => updateField('answer', e.target.value)}
                  placeholder="Tulis kunci jawaban..."
                  rows={3}
                  className="resize-y"
                />
              </div>
            )}

            {/* Explanation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pembahasan (opsional)</Label>
              <Textarea
                value={form.explanation}
                onChange={(e) => updateField('explanation', e.target.value)}
                placeholder="Tulis pembahasan / penjelasan soal (opsional)..."
                rows={3}
                className="resize-y"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : isEdit ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Simpan Perubahan
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Buat Soal
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruSoalView() {
  const user = useAppStore((s) => s.user);

  // Data state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // FETCH
  // ═══════════════════════════════════════════════════════════════

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (!user?.schoolId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ schoolId: user.schoolId });
      if (filterSubject) params.set('subjectId', filterSubject);
      if (filterType) params.set('type', filterType);

      const res = await fetch(`/api/questions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Gagal memuat data soal');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId, filterSubject, filterType]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════

  const handleCreate = async (formData: FormState) => {
    if (!user?.id || !user?.schoolId) return;

    try {
      const payload: Record<string, unknown> = {
        subjectId: formData.subjectId,
        schoolId: user.schoolId,
        type: formData.type,
        content: formData.content,
        options: formData.type === 'pg' || formData.type === 'pg_kompleks' ? formData.options : null,
        answer:
          formData.type === 'isian' || formData.type === 'esai' ? formData.answer : null,
        explanation: formData.explanation || null,
        cognitiveLevel: formData.cognitiveLevel,
        difficulty: formData.difficulty,
        createdBy: user.id,
      };

      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal membuat soal' }));
        throw new Error(err.error || 'Gagal membuat soal');
      }

      toast.success('Soal berhasil ditambahkan');
      fetchQuestions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat soal');
      throw err;
    }
  };

  const handleEdit = async (formData: FormState) => {
    if (!editingQuestion) return;

    try {
      const payload: Record<string, unknown> = {
        id: editingQuestion.id,
        subjectId: formData.subjectId,
        type: formData.type,
        content: formData.content,
        options:
          formData.type === 'pg' || formData.type === 'pg_kompleks' ? formData.options : null,
        answer:
          formData.type === 'isian' || formData.type === 'esai' ? formData.answer : null,
        explanation: formData.explanation || null,
        cognitiveLevel: formData.cognitiveLevel,
        difficulty: formData.difficulty,
      };

      const res = await fetch('/api/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal mengupdate soal' }));
        throw new Error(err.error || 'Gagal mengupdate soal');
      }

      toast.success('Soal berhasil diperbarui');
      setEditingQuestion(null);
      fetchQuestions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengupdate soal');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deletingQuestion) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/questions?id=${deletingQuestion.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Gagal menghapus soal');
      }

      toast.success('Soal berhasil dihapus');
      setDeletingQuestion(null);
      fetchQuestions();
    } catch {
      toast.error('Gagal menghapus soal');
    } finally {
      setDeleting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // FILTERING (client-side for search & difficulty)
  // ═══════════════════════════════════════════════════════════════

  const filteredQuestions = questions.filter((q) => {
    // Client-side search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesContent = q.content.toLowerCase().includes(query);
      const matchesSubject = q.subject?.name?.toLowerCase().includes(query);
      const matchesType = (TYPE_LABELS[q.type] || '').toLowerCase().includes(query);
      if (!matchesContent && !matchesSubject && !matchesType) return false;
    }
    // Client-side difficulty filter
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    return true;
  });

  // ═══════════════════════════════════════════════════════════════
  // LOADING SKELETON
  // ═══════════════════════════════════════════════════════════════

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="rounded-xl border border-gray-100 bg-white animate-pulse">
          <CardContent className="p-6">
            <div className="flex gap-2 mb-3">
              <div className="h-6 w-24 rounded-full bg-gray-200" />
              <div className="h-6 w-20 rounded-full bg-gray-200" />
              <div className="h-6 w-16 rounded-full bg-gray-200" />
            </div>
            <div className="space-y-2 mb-3">
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-3/4 rounded bg-gray-200" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-32 rounded bg-gray-200" />
              <div className="h-3 w-20 rounded bg-gray-200" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  const dialogOpen = showCreateDialog || !!editingQuestion;
  const dialogClose = () => {
    setShowCreateDialog(false);
    setEditingQuestion(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        icon={<BookOpen className="w-5 h-5" />}
        title="Bank Soal"
        description="Kelola bank soal untuk mata pelajaran Anda"
        action={
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Buat Soal Baru
          </Button>
        }
      />

      {/* ── Filter Bar ── */}
      <Card className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Search row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari soal berdasarkan isi, mata pelajaran..."
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 shrink-0"
            >
              <Filter className="w-4 h-4" />
              Filter
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>

          {/* Expandable filter row */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Select value={filterSubject} onValueChange={(v) => setFilterSubject(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Semua Mapel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Mapel</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={(v) => setFilterType(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Tipe</SelectItem>
                  <SelectItem value="pg">Pilihan Ganda</SelectItem>
                  <SelectItem value="pg_kompleks">PG Kompleks</SelectItem>
                  <SelectItem value="isian">Isian Singkat</SelectItem>
                  <SelectItem value="esai">Esai</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDifficulty} onValueChange={(v) => setFilterDifficulty(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Semua Kesulitan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Kesulitan</SelectItem>
                  <SelectItem value="mudah">Mudah</SelectItem>
                  <SelectItem value="sedang">Sedang</SelectItem>
                  <SelectItem value="sulit">Sulit</SelectItem>
                </SelectContent>
              </Select>

              {(filterSubject || filterType || filterDifficulty) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterSubject('');
                    setFilterType('');
                    setFilterDifficulty('');
                  }}
                  className="gap-1.5 text-xs text-muted-foreground shrink-0"
                >
                  <X className="w-3 h-3" />
                  Reset Filter
                </Button>
              )}
            </div>
          )}

          {/* Results count */}
          {!loading && (
            <div className="text-xs text-muted-foreground pt-1">
              {filteredQuestions.length} soal ditemukan
              {questions.length !== filteredQuestions.length && (
                <span> (dari {questions.length} total)</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Content ── */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredQuestions.length === 0 ? (
        <EmptyState onCreate={() => setShowCreateDialog(true)} />
      ) : (
        <div
          className={cn(
            'space-y-4',
            filteredQuestions.length > 5 && 'max-h-[calc(100vh-360px)] overflow-y-auto'
          )}
          style={
            filteredQuestions.length > 5
              ? { scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }
              : undefined
          }
        >
          {filteredQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onEdit={(q) => setEditingQuestion(q)}
              onDelete={(q) => setDeletingQuestion(q)}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <QuestionFormDialog
        open={dialogOpen}
        onClose={dialogClose}
        onSave={async (formData) => {
          if (editingQuestion) {
            await handleEdit(formData);
          } else {
            await handleCreate(formData);
          }
        }}
        subjects={subjects}
        editQuestion={editingQuestion}
      />

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deletingQuestion} onOpenChange={(v) => !v && setDeletingQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Hapus Soal
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Apakah Anda yakin ingin menghapus soal ini? Tindakan ini tidak dapat dibatalkan. Soal
              yang sudah terhubung dengan ujian aktif tetap akan tersimpan di ujian tersebut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {deleting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Hapus Soal
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
