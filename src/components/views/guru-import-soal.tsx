'use client';

import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';

interface ParsedPreview {
  no: number;
  type: string;
  content: string;
  optionsCount: number;
  answer: string | null;
  id: string | null;
  error: string | null;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
}

interface ImportSoalWordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: SubjectItem[];
  onImportComplete?: () => void;
}

export function ImportSoalWordDialog({ open, onOpenChange, subjects, onImportComplete }: ImportSoalWordDialogProps) {
  const user = useAppStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    totalParsed: number;
    imported: number;
    failed: number;
    questions: ParsedPreview[];
    formatGuide?: string;
    rawTextPreview?: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith('.docx') && !selected.name.endsWith('.doc')) {
        toast.error('Hanya file .docx yang didukung');
        return;
      }
      setFile(selected);
      setResult(null); // Reset result when file changes
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      if (!dropped.name.endsWith('.docx')) {
        toast.error('Hanya file .docx yang didukung');
        return;
      }
      setFile(dropped);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file || !subjectId) {
      toast.error('Pilih file dan mata pelajaran terlebih dahulu');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subjectId', subjectId);
      formData.append('createdBy', user?.id || '');
      if (user?.schoolId) formData.append('schoolId', user.schoolId);

      const res = await fetch('/api/import/questions', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || 'Gagal mengimpor soal');
        setResult(data);
        return;
      }

      setResult(data);
      if (data.imported > 0) {
        toast.success(`${data.imported} soal berhasil diimpor!`);
        onImportComplete?.();
      }
      if (data.failed > 0) {
        toast.warning(`${data.failed} soal gagal diimpor`);
      }
    } catch {
      toast.error('Terjadi kesalahan saat mengimpor');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setSubjectId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5 text-amber-500" />
            Import Soal dari Word (.docx)
          </DialogTitle>
          <DialogDescription>
            Upload file .docx berisi soal — sistem akan otomatis mendeteksi tipe soal (PG, Isian, Esai).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Step 1: Select Subject */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Mata Pelajaran *</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
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

          {/* Step 2: Upload File */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">File Soal (.docx) *</Label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-amber-300 hover:bg-amber-50/30 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-amber-500" />
                  <div className="text-left">
                    <p className="font-medium text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-500">
                    Klik atau seret file .docx ke sini
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Format Guide */}
          <Card className="bg-slate-50 border-slate-100">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Format Soal yang Didukung
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 text-xs text-slate-600 space-y-2">
              <div>
                <p className="font-medium text-slate-700 mb-1">Pilihan Ganda (PG):</p>
                <pre className="bg-white rounded-lg p-2 font-mono text-[11px] leading-relaxed border">
{`1. Pertanyaan...
A. Pilihan A
B. Pilihan B
C. Pilihan C
D. Pilihan D
Jawaban: B
Pembahasan: Penjelasan...`}
                </pre>
              </div>
              <div>
                <p className="font-medium text-slate-700 mb-1">Isian / Esai:</p>
                <pre className="bg-white rounded-lg p-2 font-mono text-[11px] leading-relaxed border">
{`1. Pertanyaan...
Jawaban: jawaban singkat
Pembahasan: Penjelasan...`}
                </pre>
              </div>
              <p className="text-slate-400 italic">Bisa campuran PG + Esai dalam satu dokumen</p>
            </CardContent>
          </Card>

          {/* Import Result */}
          {result && (
            <div className="space-y-3">
              {/* Summary */}
              <div className={cn(
                'rounded-xl p-3 border',
                result.success && result.failed === 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : result.imported > 0
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-red-50 border-red-200'
              )}>
                <div className="flex items-center gap-2 mb-1">
                  {result.imported > 0
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : <AlertCircle className="h-4 w-4 text-red-600" />
                  }
                  <span className="text-sm font-medium">{result.message}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-700">✓ {result.imported} berhasil</span>
                  {result.failed > 0 && (
                    <span className="text-red-700">✗ {result.failed} gagal</span>
                  )}
                  <span className="text-slate-500">Dari {result.totalParsed} terdeteksi</span>
                </div>
              </div>

              {/* Preview parsed questions */}
              {result.questions && result.questions.length > 0 && (
                <ScrollArea className="max-h-60">
                  <div className="space-y-2">
                    {result.questions.map((q) => (
                      <div
                        key={q.no}
                        className={cn(
                          'rounded-lg border p-2.5 flex items-start gap-2',
                          q.error ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
                        )}
                      >
                        <div className="shrink-0">
                          <span className="text-xs font-mono text-slate-400">#{q.no}</span>
                          <div className="mt-1">
                            {q.error ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] px-1.5 py-0',
                                q.type === 'pg' ? 'border-sky-300 text-sky-700 bg-sky-50' :
                                q.type === 'isian' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                                'border-violet-300 text-violet-700 bg-violet-50'
                              )}
                            >
                              {q.type === 'pg' ? 'PG' : q.type === 'isian' ? 'Isian' : 'Esai'}
                            </Badge>
                            {q.optionsCount > 0 && (
                              <span className="text-[10px] text-slate-400">{q.optionsCount} pilihan</span>
                            )}
                            {q.answer && (
                              <span className="text-[10px] text-emerald-600">Jawaban: {q.answer}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 mt-1 line-clamp-2">{q.content}</p>
                          {q.error && (
                            <p className="text-[10px] text-red-600 mt-1">{q.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Format guide if no questions parsed */}
              {result.formatGuide && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-amber-800 mb-2">Tips Format Soal:</p>
                    <pre className="text-[11px] text-amber-700 whitespace-pre-wrap font-mono">
                      {result.formatGuide}
                    </pre>
                    {result.rawTextPreview && (
                      <div className="mt-2">
                        <p className="text-[11px] font-medium text-amber-700 mb-1">Preview teks terbaca dari file:</p>
                        <pre className="text-[10px] bg-white rounded p-2 max-h-20 overflow-auto border border-amber-200">
                          {result.rawTextPreview}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t">
          {result && result.imported > 0 ? (
            <Button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Selesai
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Batal
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || !subjectId || importing}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {importing ? 'Mengimpor...' : 'Import Soal'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper for className merging
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
