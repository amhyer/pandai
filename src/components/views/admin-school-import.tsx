'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  FilePlus,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  GraduationCap,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

const BRAND = '#1F3864';

interface ImportResult {
  success: boolean;
  message: string;
  imported?: number;
  failed?: number;
  errors?: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function GradientIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm bg-gradient-to-br from-[#1F3864] to-[#2d5289]">
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
        <Icon className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// Parse CSV string into array of objects (vanilla JS)
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  // Parse a single line respecting quoted fields
  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',' || ch === ';') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

// Generate and download CSV template
function downloadTemplate(headers: string[], filename: string) {
  const csv = headers.join(',') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════
// IMPORT TAB COMPONENT
// ═══════════════════════════════════════════════════════════════════════

function ImportTab({
  type,
}: {
  type: 'siswa' | 'guru';
}) {
  const { user } = useAppStore();
  const schoolId = user?.schoolId;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const EXPECTED_HEADERS =
    type === 'siswa'
      ? ['NISN', 'Nama', 'Jenis Kelamin', 'Kelas']
      : ['NIP', 'Nama', 'Jenis Kelamin', 'Mata Pelajaran'];

  const TEMPLATE_FILENAME =
    type === 'siswa' ? 'template_import_siswa.csv' : 'template_import_guru.csv';

  // Process the file
  const processFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      setPreview(parsed);

      // Validate headers
      if (parsed.headers.length === 0) {
        toast.error('File CSV kosong atau tidak valid');
        return;
      }

      const hasRequired = EXPECTED_HEADERS.every((h) =>
        parsed.headers.some((ph) => ph.toLowerCase().trim() === h.toLowerCase())
      );
      if (!hasRequired) {
        toast.error(`Kolom tidak sesuai. Harus mengandung: ${EXPECTED_HEADERS.join(', ')}`);
      }
    };
    reader.readAsText(f);
  }, [EXPECTED_HEADERS]);

  // Drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv')) {
      processFile(droppedFile);
    } else {
      toast.error('Hanya file CSV yang diperbolehkan');
    }
  };

  // File input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  };

  // Remove file
  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Start import
  async function handleImport() {
    if (!file || !schoolId) {
      toast.error('File dan data sekolah diperlukan');
      return;
    }
    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('schoolId', schoolId);

      const res = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({
        success: false,
        message: 'Gagal membaca respons server',
      }));

      if (res.ok && data.success) {
        toast.success(data.message || `Import ${type} berhasil!`);
      } else {
        toast.error(data.message || data.error || `Import ${type} gagal`);
      }
      setResult(data as ImportResult);
    } catch {
      const errorMsg = `Gagal mengimpor data ${type}. Periksa koneksi internet Anda.`;
      toast.error(errorMsg);
      setResult({ success: false, message: errorMsg });
    } finally {
      setImporting(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-5">
      {/* ── Download Template ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {type === 'siswa'
            ? 'Upload file CSV berisi data siswa yang akan diimpor ke sistem.'
            : 'Upload file CSV berisi data guru yang akan diimpor ke sistem.'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-lg"
          onClick={() => downloadTemplate(EXPECTED_HEADERS, TEMPLATE_FILENAME)}
        >
          <Download className="h-3.5 w-3.5" />
          Unduh Template
        </Button>
      </div>

      {/* ── Drop Zone ── */}
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-200',
            isDragging
              ? 'border-[#1F3864] bg-[#1F3864]/5 scale-[1.01]'
              : 'border-gray-300 bg-gray-50/50 hover:border-[#1F3864]/50 hover:bg-[#1F3864]/5'
          )}
        >
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-200',
              isDragging ? 'bg-[#1F3864]/10 text-[#1F3864]' : 'bg-muted text-muted-foreground'
            )}
          >
            <Upload className="h-8 w-8" />
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">
            {isDragging ? 'Lepaskan file di sini...' : 'Seret & lepas file CSV, atau klik untuk memilih'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Format: .csv — Kolom: {EXPECTED_HEADERS.join(', ')}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        /* ── File Info Card ── */
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                  {preview && ` · ${preview.rows.length} baris data`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600"
              onClick={removeFile}
              aria-label="Hapus file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Preview Table (first 5 rows) ── */}
      {preview && preview.headers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Pratinjau Data</h3>
            <Badge variant="outline" className="rounded-full text-xs">
              {Math.min(5, preview.rows.length)} dari {preview.rows.length} baris
            </Badge>
          </div>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="w-10 text-xs font-semibold text-center">#</TableHead>
                  {preview.headers.map((h, i) => (
                    <TableHead key={i} className="text-xs font-semibold">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.slice(0, 5).map((row, rowIdx) => (
                  <TableRow
                    key={rowIdx}
                    className={cn(rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}
                  >
                    <TableCell className="text-xs text-muted-foreground text-center">
                      {rowIdx + 1}
                    </TableCell>
                    {preview.headers.map((_, colIdx) => (
                      <TableCell key={colIdx} className="text-sm">
                        {row[colIdx] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {preview.rows.length > 5 && (
            <p className="text-xs text-center text-muted-foreground">
              ...dan {preview.rows.length - 5} baris lainnya
            </p>
          )}
        </div>
      )}

      {/* ── Import Button ── */}
      {file && preview && (
        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            disabled={importing}
            className="gap-2 rounded-lg px-6 transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
            style={{ backgroundColor: BRAND }}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importing ? 'Mengimpor...' : 'Mulai Import'}
          </Button>
        </div>
      )}

      {/* ── Result Display ── */}
      {result && (
        <Alert
          className={cn(
            'rounded-xl border',
            result.success
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-red-200 bg-red-50'
          )}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={cn(
                  'text-sm font-semibold',
                  result.success ? 'text-emerald-800' : 'text-red-800'
                )}
              >
                {result.success ? 'Import Berhasil' : 'Import Gagal'}
              </p>
              <AlertDescription
                className={cn(
                  'mt-1 text-sm',
                  result.success ? 'text-emerald-700' : 'text-red-700'
                )}
              >
                {result.message}
                {result.imported !== undefined && (
                  <span className="ml-2 font-semibold">({result.imported} data berhasil diimpor)</span>
                )}
                {result.failed !== undefined && result.failed > 0 && (
                  <span className="ml-2 font-semibold">({result.failed} gagal)</span>
                )}
              </AlertDescription>
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-xs text-red-600">
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN: IMPORT CSV VIEW
// ═══════════════════════════════════════════════════════════════════════

export function ImportCsvView() {
  const { user } = useAppStore();

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon>
            <FilePlus className="h-5 w-5" />
          </GradientIcon>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>
              Import Data
            </h1>
            <p className="text-sm text-muted-foreground">
              Impor data siswa dan guru dari file CSV ke {user?.schoolName ?? 'sekolah Anda'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Info Card ── */}
      <div className="rounded-xl border bg-gradient-to-r from-amber-50 to-orange-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Panduan Import Data
            </p>
            <ul className="mt-1 space-y-1 text-xs text-amber-800">
              <li>• Gunakan format file <strong>.csv</strong> (comma-separated values)</li>
              <li>• Pastikan baris pertama berisi judul kolom sesuai template</li>
              <li>• Data yang sudah ada dengan NISN/NIP yang sama akan dilewati</li>
              <li>• Unduh template terlebih dahulu untuk memastikan format yang benar</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Tabs defaultValue="siswa" className="w-full">
          <div className="border-b bg-gray-50/50 px-4">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
              <TabsTrigger
                value="siswa"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1F3864] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-[#1F3864] transition-colors gap-2"
              >
                <GraduationCap className="h-4 w-4" />
                Import Siswa
              </TabsTrigger>
              <TabsTrigger
                value="guru"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1F3864] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-[#1F3864] transition-colors gap-2"
              >
                <Users className="h-4 w-4" />
                Import Guru
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="siswa" className="p-4 sm:p-6 mt-0">
            <ImportTab type="siswa" />
          </TabsContent>

          <TabsContent value="guru" className="p-4 sm:p-6 mt-0">
            <ImportTab type="guru" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
