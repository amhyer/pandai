'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  X,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ====== CONSTANTS ======

const SUBJECTS = [
  { code: 'bindo', name: 'Bahasa Indonesia' },
  { code: 'bing', name: 'Bahasa Inggris' },
  { code: 'mat', name: 'Matematika' },
  { code: 'fis', name: 'Fisika' },
  { code: 'kim', name: 'Kimia' },
  { code: 'bio', name: 'Biologi' },
  { code: 'eko', name: 'Ekonomi' },
  { code: 'sos', name: 'Sosiologi' },
  { code: 'sej', name: 'Sejarah' },
  { code: 'geo', name: 'Geografi' },
] as const;

const TYPE_OPTIONS = [
  { value: 'pg', label: 'PG (Pilihan Ganda)' },
  { value: 'pg_kompleks', label: 'PG Kompleks' },
  { value: 'isian', label: 'Isian Singkat' },
  { value: 'esai', label: 'Esai' },
] as const;

const COGNITIVE_LEVELS = [
  { value: 'C1', label: 'C1 - Mengingat' },
  { value: 'C2', label: 'C2 - Memahami' },
  { value: 'C3', label: 'C3 - Menerapkan' },
  { value: 'C4', label: 'C4 - Menganalisis' },
  { value: 'C5', label: 'C5 - Mengevaluasi' },
  { value: 'C6', label: 'C6 - Mencipta' },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: 'mudah', label: 'Mudah' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'sulit', label: 'Sulit' },
] as const;

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

// ====== TYPES ======

interface Option {
  label: string;
  text: string;
  isCorrect: boolean;
}

// ====== HELPERS ======

const getTypeBadge = (type: string) => {
  const map: Record<string, string> = {
    pg: 'bg-blue-100 text-blue-700 border-blue-200',
    pg_kompleks: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    isian: 'bg-purple-100 text-purple-700 border-purple-200',
    esai: 'bg-orange-100 text-orange-700 border-orange-200',
  };
  const labelMap: Record<string, string> = {
    pg: 'PG',
    pg_kompleks: 'PG Kompleks',
    isian: 'Isian',
    esai: 'Esai',
  };
  return (
    <Badge variant="outline" className={map[type] || ''}>
      {labelMap[type] || type}
    </Badge>
  );
};

const getDifficultyBadge = (difficulty: string) => {
  const map: Record<string, string> = {
    mudah: 'bg-green-100 text-green-700 border-green-200',
    sedang: 'bg-amber-100 text-amber-700 border-amber-200',
    sulit: 'bg-red-100 text-red-700 border-red-200',
  };
  const labelMap: Record<string, string> = {
    mudah: 'Mudah',
    sedang: 'Sedang',
    sulit: 'Sulit',
  };
  return (
    <Badge variant="outline" className={map[difficulty] || ''}>
      {labelMap[difficulty] || difficulty}
    </Badge>
  );
};

// ====== COMPONENT ======

export function QuestionEditor() {
  const { user, navigateTo } = useAppStore();

  // Form state
  const [subjectId, setSubjectId] = useState<string>('');
  const [type, setType] = useState<string>('pg');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState<Option[]>([
    { label: 'A', text: '', isCorrect: true },
    { label: 'B', text: '', isCorrect: false },
    { label: 'C', text: '', isCorrect: false },
    { label: 'D', text: '', isCorrect: false },
  ]);
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [cognitiveLevel, setCognitiveLevel] = useState<string>('C3');
  const [difficulty, setDifficulty] = useState<string>('sedang');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');

  const isMultipleChoice = type === 'pg' || type === 'pg_kompleks';

  // Add option
  const addOption = () => {
    if (options.length >= 5) return;
    const nextLabel = OPTION_LABELS[options.length];
    if (!nextLabel) return;
    setOptions([...options, { label: nextLabel, text: '', isCorrect: false }]);
  };

  // Remove option
  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    const updated = options
      .filter((_, i) => i !== index)
      .map((opt, i) => ({ ...opt, label: OPTION_LABELS[i] }));
    setOptions(updated);
  };

  // Update option text
  const updateOptionText = (index: number, text: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], text };
    setOptions(updated);
  };

  // Set correct answer (for PG: single, for PG Kompleks: toggle)
  const setCorrectOption = (index: number) => {
    if (type === 'pg') {
      // Single correct answer
      setOptions(options.map((opt, i) => ({ ...opt, isCorrect: i === index })));
    } else {
      // Multiple correct answers (toggle)
      const updated = [...options];
      updated[index] = { ...updated[index], isCorrect: !updated[index].isCorrect };
      setOptions(updated);
    }
  };

  // Validation
  const validate = (): string | null => {
    if (!subjectId) return 'Pilih mata pelajaran';
    if (!content.trim()) return 'Isi konten soal';
    if (isMultipleChoice) {
      const emptyOption = options.find((o) => !o.text.trim());
      if (emptyOption) return `Isi pilihan ${emptyOption.label}`;
      const hasCorrect = options.some((o) => o.isCorrect);
      if (!hasCorrect) return 'Pilih jawaban yang benar';
    }
    if (type === 'isian' && !answer.trim()) return 'Isi jawaban';
    return null;
  };

  // Submit
  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        subjectId,
        schoolId: user?.schoolId || null,
        type,
        content: content.trim(),
        cognitiveLevel,
        difficulty,
        explanation: explanation.trim() || null,
        createdBy: user?.id,
      };

      if (isMultipleChoice) {
        body.options = options.map((o) => ({
          label: o.label,
          text: o.text.trim(),
          isCorrect: o.isCorrect,
        }));
      }

      if (type === 'isian') {
        body.answer = answer.trim();
      }

      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan soal');
      }

      toast.success('Soal berhasil disimpan!');
      navigateTo('questions');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan soal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview data
  const previewData = useMemo(() => {
    const subject = SUBJECTS.find((s) => s.code === subjectId);
    return { subjectName: subject?.name || '-' };
  }, [subjectId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigateTo('questions')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-navy">Buat Soal Baru</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tambahkan soal ke bank soal
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="edit" className="gap-2">
                <Save className="h-3.5 w-3.5" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </TabsTrigger>
            </TabsList>

            {/* ====== EDIT TAB ====== */}
            <TabsContent value="edit" className="mt-4 space-y-6">
              {/* Subject & Type Row */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Informasi Dasar
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-medium">
                        Mata Pelajaran <span className="text-red-500">*</span>
                      </Label>
                      <Select value={subjectId} onValueChange={setSubjectId}>
                        <SelectTrigger className="w-full" id="subject">
                          <SelectValue placeholder="Pilih mata pelajaran" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map((s) => (
                            <SelectItem key={s.code} value={s.code}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-sm font-medium">
                        Tipe Soal <span className="text-red-500">*</span>
                      </Label>
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="w-full" id="type">
                          <SelectValue placeholder="Pilih tipe" />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Cognitive Level & Difficulty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cognitiveLevel" className="text-sm font-medium">
                        Level Kognitif
                      </Label>
                      <Select value={cognitiveLevel} onValueChange={setCognitiveLevel}>
                        <SelectTrigger className="w-full" id="cognitiveLevel">
                          <SelectValue placeholder="Pilih level" />
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

                    <div className="space-y-2">
                      <Label htmlFor="difficulty" className="text-sm font-medium">
                        Tingkat Kesulitan
                      </Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger className="w-full" id="difficulty">
                          <SelectValue placeholder="Pilih kesulitan" />
                        </SelectTrigger>
                        <SelectContent>
                          {DIFFICULTY_OPTIONS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Question Content */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Konten Soal
                  </h2>
                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-sm font-medium">
                      Isi Soal <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="content"
                      placeholder="Tulis konten soal di sini..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[140px] text-sm leading-relaxed resize-y"
                    />
                    <p className="text-xs text-muted-foreground">
                      {content.length} karakter
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Options (PG / PG Kompleks) */}
              {isMultipleChoice && (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Pilihan Jawaban
                      </h2>
                      {type === 'pg_kompleks' && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 text-xs">
                          Multi jawaban benar
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-3">
                      {options.map((opt, idx) => (
                        <div key={`${opt.label}-${idx}`} className="flex items-start gap-3">
                          {/* Correct radio */}
                          <div className="flex items-center h-10 pt-0.5">
                            <RadioGroup
                              value={options.find((o) => o.isCorrect)?.label || ''}
                              onValueChange={() => setCorrectOption(idx)}
                              className="flex"
                            >
                              <RadioGroupItem
                                value={opt.label}
                                id={`correct-${opt.label}`}
                                className={`${
                                  opt.isCorrect
                                    ? 'border-emerald-500 text-emerald-600'
                                    : ''
                                }`}
                              />
                            </RadioGroup>
                          </div>

                          {/* Label */}
                          <div className="flex items-center h-10 shrink-0">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-navy/10 text-navy text-sm font-bold">
                              {opt.label}
                            </span>
                          </div>

                          {/* Text input */}
                          <div className="flex-1 min-w-0">
                            <Input
                              placeholder={`Pilihan ${opt.label}...`}
                              value={opt.text}
                              onChange={(e) => updateOptionText(idx, e.target.value)}
                              className={`h-10 ${
                                opt.isCorrect ? 'border-emerald-400 bg-emerald-50/50' : ''
                              }`}
                            />
                          </div>

                          {/* Remove button */}
                          {options.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-muted-foreground hover:text-red-600 shrink-0"
                              onClick={() => removeOption(idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Correct indicator */}
                          {opt.isCorrect && (
                            <div className="flex items-center h-10 shrink-0">
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add option */}
                    {options.length < 5 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addOption}
                        className="w-full border-dashed gap-2 text-muted-foreground hover:text-navy hover:border-navy"
                      >
                        <Plus className="h-4 w-4" />
                        Tambah Opsi
                      </Button>
                    )}

                    {type === 'pg' && (
                      <p className="text-xs text-muted-foreground">
                        Pilih satu jawaban benar menggunakan tombol radio di kiri.
                      </p>
                    )}
                    {type === 'pg_kompleks' && (
                      <p className="text-xs text-muted-foreground">
                        Tandai satu atau lebih jawaban benar menggunakan tombol radio.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Answer (for Isian) */}
              {type === 'isian' && (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                      Jawaban
                    </h2>
                    <div className="space-y-2">
                      <Label htmlFor="answer" className="text-sm font-medium">
                        Jawaban Benar <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="answer"
                        placeholder="Masukkan jawaban..."
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Explanation */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Pembahasan
                  </h2>
                  <div className="space-y-2">
                    <Label htmlFor="explanation" className="text-sm font-medium">
                      Penjelasan Jawaban
                    </Label>
                    <Textarea
                      id="explanation"
                      placeholder="Tulis pembahasan / penjelasan jawaban..."
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      className="min-h-[100px] text-sm leading-relaxed resize-y"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ====== PREVIEW TAB ====== */}
            <TabsContent value="preview" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-navy">
                      Preview Soal
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getTypeBadge(type)}
                      {getDifficultyBadge(difficulty)}
                      <Badge variant="outline" className="bg-navy/10 text-navy border-navy/20">
                        {cognitiveLevel}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{previewData.subjectName}</span>
                    <span>·</span>
                    <span>
                      {COGNITIVE_LEVELS.find((c) => c.value === cognitiveLevel)?.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question content */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {content || (
                        <span className="text-muted-foreground italic">
                          Konten soal akan muncul di sini...
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Options (PG/PG Kompleks) */}
                  {isMultipleChoice && (
                    <div className="space-y-2">
                      {options.map((opt) => (
                        <div
                          key={opt.label}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            opt.isCorrect
                              ? 'border-emerald-300 bg-emerald-50/50'
                              : 'border-transparent bg-muted/20'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-navy/10 text-navy text-xs font-bold mt-0.5 shrink-0">
                            {opt.label}
                          </span>
                          <p className="text-sm leading-relaxed flex-1">
                            {opt.text || (
                              <span className="text-muted-foreground italic">
                                Pilihan {opt.label}...
                              </span>
                            )}
                          </p>
                          {opt.isCorrect && (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answer (Isian) */}
                  {type === 'isian' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Jawaban:
                      </Label>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                        <p className="text-sm">
                          {answer || (
                            <span className="text-muted-foreground italic">
                              Jawaban akan muncul di sini...
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {explanation && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Pembahasan:
                        </Label>
                        <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {explanation}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Empty preview hint */}
                  {!content && !isMultipleChoice && !answer && !explanation && (
                    <div className="text-center py-8">
                      <Eye className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Mulai isi form di tab Editor untuk melihat preview.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => navigateTo('questions')}
              className="flex-1 sm:flex-none"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none bg-navy hover:bg-navy-light text-white gap-2 min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Simpan Soal
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right: Quick Info Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">
                Ringkasan Soal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mata Pelajaran</span>
                <span className="font-medium">
                  {previewData.subjectName}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tipe</span>
                <span className="flex items-center gap-1.5">
                  {getTypeBadge(type)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Level Kognitif</span>
                <Badge variant="outline" className="bg-navy/10 text-navy border-navy/20">
                  {cognitiveLevel}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Kesulitan</span>
                <span className="flex items-center gap-1.5">
                  {getDifficultyBadge(difficulty)}
                </span>
              </div>
              {isMultipleChoice && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Jumlah Opsi</span>
                    <span className="font-medium">{options.length}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Jawaban Benar</span>
                    <span className="font-medium text-emerald-600">
                      {options.filter((o) => o.isCorrect).map((o) => o.label).join(', ') || '-'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="bg-navy/5 border-navy/10">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-navy mb-2">
                💡 Tips Pembuatan Soal
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-navy mt-0.5">•</span>
                  Gunakan level kognitif C4-C6 untuk soal HOTS
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-navy mt-0.5">•</span>
                  Pastikan pilihan jawaban homogen dan tidak saling beririsan
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-navy mt-0.5">•</span>
                  Tambahkan pembahasan untuk membantu siswa memahami materi
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-navy mt-0.5">•</span>
                  Soal esai sebaiknya memiliki rubrik penilaian yang jelas
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
