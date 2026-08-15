'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Sparkles, FileText, ClipboardCheck, Brain, FileBarChart,
  BookOpen, Loader2, Check, X, Send, Plus, Eye, ChevronDown,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface SubjectItem { id: string; name: string; code: string; }
interface TopicItem { id: string; name: string; }
interface ClassItem { id: string; name: string; grade: number; }
interface StudentItem { id: string; name: string; nisn?: string; }
interface GeneratedQuestion {
  id: string; content: string; options: string; answer: string;
  explanation: string | null; difficulty: string; cognitiveLevel: string;
  status: string; subject?: { name: string };
  topic?: { name: string };
}
interface AiUsageItem {
  actionType: string; label: string; count: number; tokensUsed: number;
}

// ═══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════

function GradientIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm">
      {children}
    </div>
  );
}

function PageHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <GradientIcon>{icon}</GradientIcon>
      <div>
        <h1 className="text-2xl font-bold text-[#1F3864]">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function QuotaBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100);
  const isFull = used >= limit;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium', isFull ? 'text-red-500' : 'text-[#1F3864]')}>{used}/{limit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', isFull ? 'bg-red-400' : 'bg-gradient-to-r from-[#1F3864] to-[#F59E0B]')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function GuruPandaiAiView() {
  const { user } = useAppStore();
  const schoolId = user?.schoolId || '';
  const userId = user?.id || '';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Sparkles className="w-5 h-5" />}
        title="PANDAI AI"
        description="Asisten AI untuk membantu tugas mengajar Anda"
      />

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-1 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="generate" className="rounded-lg text-xs sm:text-sm gap-1.5 data-[state=active]:bg-[#1F3864] data-[state=active]:text-white">
            <FileText className="w-4 h-4" /><span className="hidden sm:inline">Generate Soal</span><span className="sm:hidden">Soal</span>
          </TabsTrigger>
          <TabsTrigger value="review" className="rounded-lg text-xs sm:text-sm gap-1.5 data-[state=active]:bg-[#1F3864] data-[state=active]:text-white">
            <ClipboardCheck className="w-4 h-4" /><span className="hidden sm:inline">Review Soal</span><span className="sm:hidden">Review</span>
          </TabsTrigger>
          <TabsTrigger value="difficulty" className="rounded-lg text-xs sm:text-sm gap-1.5 data-[state=active]:bg-[#1F3864] data-[state=active]:text-white">
            <Brain className="w-4 h-4" /><span className="hidden sm:inline">Analisis</span><span className="sm:hidden">Analisis</span>
          </TabsTrigger>
          <TabsTrigger value="report" className="rounded-lg text-xs sm:text-sm gap-1.5 data-[state=active]:bg-[#1F3864] data-[state=active]:text-white">
            <FileBarChart className="w-4 h-4" /><span className="hidden sm:inline">Rapor</span><span className="sm:hidden">Rapor</span>
          </TabsTrigger>
          <TabsTrigger value="summarize" className="rounded-lg text-xs sm:text-sm gap-1.5 data-[state=active]:bg-[#1F3864] data-[state=active]:text-white">
            <BookOpen className="w-4 h-4" /><span className="hidden sm:inline">Ringkasan</span><span className="sm:hidden">Ringkas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate"><GenerateSoalTab schoolId={schoolId} userId={userId} /></TabsContent>
        <TabsContent value="review"><ReviewSoalTab schoolId={schoolId} userId={userId} /></TabsContent>
        <TabsContent value="difficulty"><AnalisisKesulitanTab schoolId={schoolId} userId={userId} /></TabsContent>
        <TabsContent value="report"><DeskripsiRaporTab schoolId={schoolId} userId={userId} /></TabsContent>
        <TabsContent value="summarize"><RingkasanMateriTab schoolId={schoolId} userId={userId} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: GENERATE SOAL
// ═══════════════════════════════════════════════════════════════

function GenerateSoalTab({ schoolId, userId }: { schoolId: string; userId: string }) {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [topicId, setTopicId] = useState('');
  const [difficulty, setDifficulty] = useState('sedang');
  const [cognitiveLevel, setCognitiveLevel] = useState('C3');
  const [count, setCount] = useState('5');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([]);

  useEffect(() => {
    fetch('/api/subjects').then((r) => r.json()).then(setSubjects).catch(() => {});
  }, []);

  useEffect(() => {
    if (!subjectId) { setTopics([]); return; }
    const sub = subjects.find((s) => s.id === subjectId);
    setSubjectName(sub?.name || '');
    fetch(`/api/subjects?topicOf=${subjectId}`)
      .then((r) => r.json())
      .then((data) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setTopics([]));
  }, [subjectId, subjects]);

  const handleGenerate = async () => {
    if (!subjectId) { toast.error('Pilih mata pelajaran terlebih dahulu'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId, userId, subjectId, topicId: topicId || undefined,
          count: parseInt(count), difficulty, cognitiveLevel, subjectName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal');
      setGenerated(data.questions || []);
      toast.success(`${data.count} soal berhasil dihasilkan`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghasilkan soal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <Card className="lg:col-span-1 rounded-xl shadow-sm border-0 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-[#1F3864]">Pengaturan Soal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Mata Pelajaran</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Pilih mapel..." /></SelectTrigger>
              <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Topik (opsional)</Label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Semua topik" /></SelectTrigger>
              <SelectContent>{topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Kesulitan</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mudah">Mudah</SelectItem>
                  <SelectItem value="sedang">Sedang</SelectItem>
                  <SelectItem value="sulit">Sulit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Level Kognitif</Label>
              <Select value={cognitiveLevel} onValueChange={setCognitiveLevel}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="C1">C1 - Mengingat</SelectItem>
                  <SelectItem value="C2">C2 - Memahami</SelectItem>
                  <SelectItem value="C3">C3 - Menerapkan</SelectItem>
                  <SelectItem value="C4">C4 - Menganalisis</SelectItem>
                  <SelectItem value="C5">C5 - Mengevaluasi</SelectItem>
                  <SelectItem value="C6">C6 - Mencipta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Jumlah Soal</Label>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[3, 5, 10, 15, 20].map((n) => <SelectItem key={n} value={String(n)}>{n} soal</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading || !subjectId}
            className="w-full bg-gradient-to-r from-[#1F3864] to-[#2d5289] hover:opacity-90 text-white rounded-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {loading ? 'Menghasilkan...' : 'Generate Soal AI'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="lg:col-span-2 space-y-4">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="rounded-xl shadow-sm border-0 bg-white p-4">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            ))}
          </div>
        )}
        {!loading && generated.length === 0 && (
          <Card className="rounded-xl shadow-sm border-0 bg-white p-12 text-center">
            <div className="text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada soal dihasilkan</p>
              <p className="text-sm mt-1">Isi form di samping lalu klik "Generate Soal AI"</p>
            </div>
          </Card>
        )}
        {generated.map((q, idx) => {
          const opts = JSON.parse(q.options || '[]');
          return (
            <Card key={q.id} className="rounded-xl shadow-sm border-0 bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-[#1F3864] to-[#2d5289] px-4 py-2 flex items-center justify-between">
                <span className="text-white text-sm font-medium">Soal #{idx + 1}</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/20 text-white border-0 text-xs rounded-full">{q.difficulty}</Badge>
                  <Badge className="bg-white/20 text-white border-0 text-xs rounded-full">{q.cognitiveLevel}</Badge>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <p className="font-medium text-sm leading-relaxed">{q.content}</p>
                <div className="space-y-1.5">
                  {opts.map((o: { label: string; text: string }) => (
                    <div
                      key={o.label}
                      className={cn(
                        'flex items-start gap-2 px-3 py-1.5 rounded-lg text-sm',
                        o.label === q.answer ? 'bg-emerald-50 border border-emerald-200 font-medium' : 'bg-gray-50'
                      )}
                    >
                      <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        o.label === q.answer ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600')}>{o.label}</span>
                      <span>{o.text}</span>
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <span className="font-semibold">Pembahasan: </span>{q.explanation}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: REVIEW SOAL
// ═══════════════════════════════════════════════════════════════

function ReviewSoalTab({ schoolId, userId }: { schoolId: string; userId: string }) {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [usage, setUsage] = useState<AiUsageItem[]>([]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/questions?schoolId=${schoolId}&status=draft`);
      const data = await res.json();
      // Filter only AI-generated questions
      const aiQuestions = Array.isArray(data)
        ? data.filter((q: GeneratedQuestion) => q.status === 'draft')
        : [];
      setQuestions(aiQuestions);
    } catch { setQuestions([]); }
    finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => {
    fetchQuestions();
    fetch(`/api/ai/usage?userId=${userId}&schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((d) => setUsage(d.userUsage || []))
      .catch(() => {});
  }, [fetchQuestions, userId, schoolId]);

  const handleReview = async (questionId: string, action: 'approve' | 'reject') => {
    setActionLoading(questionId);
    try {
      const res = await fetch('/api/ai/review-question', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, action, reviewerId: userId, schoolId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal');
      toast.success(data.message);
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mereview soal');
    } finally {
      setActionLoading(null);
    }
  };

  const genUsage = usage.find((u) => u.actionType === 'generate_questions');

  return (
    <div className="space-y-4">
      {/* Quota Indicator */}
      <Card className="rounded-xl shadow-sm border-0 bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#1F3864] mb-2">Kuota Hari Ini - Generate Soal</h3>
            <div className="max-w-xs">
              <QuotaBar label="Terpakai" used={genUsage?.count || 0} limit={10} />
            </div>
          </div>
          <Badge className={cn('rounded-full px-3 py-1 text-xs font-medium',
            (genUsage?.count || 0) >= 10 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>
            {(genUsage?.count || 0)}/10 terpakai
          </Badge>
        </div>
      </Card>

      {/* Table */}
      <Card className="rounded-xl shadow-sm border-0 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#1F3864]">Soal AI Menunggu Review</CardTitle>
          <CardDescription>Soal yang dihasilkan AI dan perlu disetujui sebelum digunakan</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">Tidak ada soal menunggu review</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Soal</TableHead>
                    <TableHead className="w-24">Kesulitan</TableHead>
                    <TableHead className="w-24">Kognitif</TableHead>
                    <TableHead className="w-32 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q, idx) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium text-sm">{idx + 1}</TableCell>
                      <TableCell>
                        <p className="text-sm line-clamp-2 max-w-md">{q.content}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('rounded-full border-0 text-xs',
                          q.difficulty === 'mudah' ? 'bg-emerald-100 text-emerald-700' :
                          q.difficulty === 'sulit' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                          {q.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="rounded-full text-xs">{q.cognitiveLevel}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm" variant="outline" className="h-8 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 rounded-lg"
                            disabled={actionLoading === q.id}
                            onClick={() => handleReview(q.id, 'approve')}
                          >
                            {actionLoading === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Setujui
                          </Button>
                          <Button
                            size="sm" variant="outline" className="h-8 gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 rounded-lg"
                            disabled={actionLoading === q.id}
                            onClick={() => handleReview(q.id, 'reject')}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: ANALISIS KESULITAN
// ═══════════════════════════════════════════════════════════════

function AnalisisKesulitanTab({ schoolId, userId }: { schoolId: string; userId: string }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');

  useEffect(() => {
    fetch(`/api/classes?schoolId=${schoolId}`).then((r) => r.json()).then(setClasses).catch(() => {});
    fetch('/api/subjects').then((r) => r.json()).then(setSubjects).catch(() => {});
  }, [schoolId]);

  const handleAnalyze = async () => {
    if (!classId || !subjectId) { toast.error('Pilih kelas dan mata pelajaran'); return; }
    setLoading(true);
    setAnalysis('');
    try {
      const res = await fetch('/api/ai/analyze-difficulty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, userId, classId, subjectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal');
      setAnalysis(data.analysis);
      toast.success('Analisis selesai');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menganalisis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl shadow-sm border-0 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-[#1F3864]">Pilih Kelas & Mata Pelajaran</CardTitle>
          <CardDescription>AI akan menganalisis data jawaban salah siswa dan memberikan rekomendasi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium">Kelas</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium">Mata Pelajaran</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Pilih mapel..." /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={loading || !classId || !subjectId}
              className="bg-gradient-to-r from-[#1F3864] to-[#2d5289] hover:opacity-90 text-white rounded-lg whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
              {loading ? 'Menganalisis...' : 'Analisis Kesulitan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card className="rounded-xl shadow-sm border-0 bg-white p-6 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </Card>
      )}

      {!loading && analysis && (
        <Card className="rounded-xl shadow-sm border-0 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#1F3864]" />
              <CardTitle className="text-base font-semibold text-[#1F3864]">Hasil Analisis AI</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
              {analysis}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 4: DESKRIPSI RAPOR
// ═══════════════════════════════════════════════════════════════

function DeskripsiRaporTab({ schoolId, userId }: { schoolId: string; userId: string }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetch(`/api/classes?schoolId=${schoolId}`).then((r) => r.json()).then(setClasses).catch(() => {});
  }, [schoolId]);

  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    fetch(`/api/users?schoolId=${schoolId}&classId=${classId}&role=SISWA`)
      .then((r) => r.json())
      .then((d) => setStudents(Array.isArray(d) ? d : []))
      .catch(() => setStudents([]));
  }, [classId, schoolId]);

  const handleGenerate = async () => {
    if (!studentId) { toast.error('Pilih siswa terlebih dahulu'); return; }
    setLoading(true);
    setDescription('');
    try {
      const res = await fetch('/api/ai/generate-report-desc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, userId, studentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal');
      setDescription(data.description);
      toast.success('Deskripsi rapor berhasil dihasilkan');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghasilkan deskripsi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl shadow-sm border-0 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-[#1F3864]">Pilih Siswa</CardTitle>
          <CardDescription>AI akan membuat deskripsi rapor berdasarkan data akademik, kehadiran, dan 7 Kebiasaan Anak Hebat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium">Kelas</Label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(''); }}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium">Siswa</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Pilih siswa..." /></SelectTrigger>
                <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.nisn ? ` (${s.nisn})` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading || !studentId}
              className="bg-gradient-to-r from-[#1F3864] to-[#2d5289] hover:opacity-90 text-white rounded-lg whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileBarChart className="w-4 h-4 mr-2" />}
              {loading ? 'Memproses...' : 'Buat Deskripsi'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card className="rounded-xl shadow-sm border-0 bg-white p-6 space-y-3">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </Card>
      )}

      {!loading && description && (
        <Card className="rounded-xl shadow-sm border-0 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileBarChart className="w-5 h-5 text-[#1F3864]" />
                <CardTitle className="text-base font-semibold text-[#1F3864]">Deskripsi Rapor</CardTitle>
              </div>
              <Button
                variant="outline" size="sm" className="gap-1 rounded-lg"
                onClick={() => navigator.clipboard.writeText(description).then(() => toast.success('Disalin ke clipboard'))}
              >
                <Eye className="w-3 h-3" /> Salin
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
              {description}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 5: RINGKASAN MATERI
// ═══════════════════════════════════════════════════════════════

function RingkasanMateriTab({ schoolId, userId }: { schoolId: string; userId: string }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');

  const handleSummarize = async () => {
    if (!title.trim()) { toast.error('Judul materi diperlukan'); return; }
    if (content.trim().length < 50) { toast.error('Konten terlalu pendek (minimal 50 karakter)'); return; }
    setLoading(true);
    setSummary('');
    try {
      const res = await fetch('/api/ai/summarize-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, userId, title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal');
      setSummary(data.summary);
      toast.success('Ringkasan berhasil dibuat');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal meringkas materi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="rounded-xl shadow-sm border-0 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-[#1F3864]">Input Materi</CardTitle>
          <CardDescription>Tempel atau ketik materi yang ingin diringkas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Judul Materi</Label>
            <Input
              placeholder="Contoh: Hukum Newton tentang Gravitasi"
              value={title} onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Konten Materi</Label>
            <Textarea
              placeholder="Tempel teks materi di sini..."
              value={content} onChange={(e) => setContent(e.target.value)}
              className="rounded-lg min-h-[200px] resize-y"
            />
            <p className="text-xs text-muted-foreground text-right">{content.length} karakter</p>
          </div>
          <Button
            onClick={handleSummarize}
            disabled={loading || !title.trim() || content.trim().length < 50}
            className="w-full bg-gradient-to-r from-[#1F3864] to-[#2d5289] hover:opacity-90 text-white rounded-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BookOpen className="w-4 h-4 mr-2" />}
            {loading ? 'Meringkas...' : 'Ringkas Materi'}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm border-0 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-[#1F3864]">Hasil Ringkasan</CardTitle>
            {summary && (
              <Button variant="outline" size="sm" className="gap-1 rounded-lg"
                onClick={() => navigator.clipboard.writeText(summary).then(() => toast.success('Disalin ke clipboard'))}>
                <Eye className="w-3 h-3" /> Salin
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : summary ? (
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
              {summary}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada ringkasan</p>
              <p className="text-sm mt-1">Isi materi di samping lalu klik "Ringkas Materi"</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
