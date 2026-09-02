'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ArrowRight,
  Settings,
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

// Field yang tersedia untuk mapping
interface FieldConfig {
  key: string;
  label: string;
  required: boolean;
  description: string;
}

const SISWA_FIELDS: FieldConfig[] = [
  { key: 'nisn', label: 'NISN', required: true, description: 'Nomor Induk Siswa Nasional (10 digit)' },
  { key: 'name', label: 'Nama Lengkap', required: true, description: 'Nama lengkap siswa' },
  { key: 'jk', label: 'Jenis Kelamin', required: false, description: 'L = Laki-laki, P = Perempuan' },
  { key: 'kelas', label: 'Kelas', required: false, description: 'Nama kelas (akan auto-create jika belum ada)' },
  { key: 'phone', label: 'No. Telepon', required: false, description: 'Nomor telepon siswa' },
  { key: 'namaOrtu', label: 'Nama Orang Tua', required: false, description: 'Nama orang tua/wali siswa' },
  { key: 'email', label: 'Email', required: false, description: 'Email (opsional untuk siswa)' },
];

const GURU_FIELDS: FieldConfig[] = [
  { key: 'nip', label: 'NIP', required: true, description: 'Nomor Induk Pegawai' },
  { key: 'name', label: 'Nama Lengkap', required: true, description: 'Nama lengkap guru' },
  { key: 'jk', label: 'Jenis Kelamin', required: false, description: 'L = Laki-laki, P = Perempuan' },
  { key: 'mataPelajaran', label: 'Mata Pelajaran', required: false, description: 'Mata pelajaran yang diampu' },
  { key: 'phone', label: 'No. Telepon', required: false, description: 'Nomor telepon guru' },
  { key: 'email', label: 'Email', required: false, description: 'Email guru' },
  { key: 'nik', label: 'NIK', required: false, description: 'Nomor Induk Kependudukan (KTP)' },
];

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

// Parse CSV string into array of objects
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

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

// Parse Excel file using xlsx library
// Mendukung format Dapodik (header di row 4, data mulai row 6)
async function parseExcel(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
  
  if (data.length === 0) return { headers: [], rows: [] };
  
  // Deteksi format Dapodik:
  // - Row 0 = judul ("Daftar Peserta Didik")
  // - Row 1 = nama sekolah
  // - Row 2 = lokasi
  // - Row 3 = tanggal unduh
  // - Row 4 = header utama
  // - Row 5 = sub-header (Data Ayah/Ibu/Wali)
  // - Row 6+ = data
  
  const firstCell = String(data[0]?.[0] || '').toLowerCase();
  const isDapodik = firstCell.includes('daftar') || firstCell.includes('peserta didik');
  
  let headerRowIdx = 0;
  let dataStartRowIdx = 1;
  
  if (isDapodik && data.length > 5) {
    // Format Dapodik - header di row 4, data mulai row 6
    headerRowIdx = 4;
    dataStartRowIdx = 6;
  }
  
  const headers = (data[headerRowIdx] || []).map(String);
  const rows = data.slice(dataStartRowIdx)
    .filter((row) => row && row.some((cell) => cell !== null && cell !== undefined && cell !== ''))
    .map((row) => (row || []).map(String));
  
  return { headers, rows };
}

// Generate and download CSV template
function downloadTemplate(fields: FieldConfig[], filename: string) {
  const headers = fields.map((f) => f.label);
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

// Download Excel template
async function downloadExcelTemplate(fields: FieldConfig[], filename: string) {
  const XLSX = await import('xlsx');
  const headers = fields.map((f) => f.label);
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, filename);
}

// Generate auto-mapping based on header similarity
function autoMapHeaders(fileHeaders: string[], fieldConfigs: FieldConfig[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  // Keywords untuk matching yang lebih fleksibel (termasuk format Dapodik)
  const keywordMap: Record<string, string[]> = {
    nisn: ['nisn', 'nomor induk siswa nasional', 'nomor induk siswa', 'no induk siswa', 'no siswa', 'nomor siswa'],
    name: ['nama', 'nama lengkap', 'nama siswa', 'nama guru', 'fullname', 'full name', 'name'],
    jk: ['jenis kelamin', 'jk', 'kelamin', 'gender', 'sex'],
    kelas: ['kelas', 'class', 'rombel', 'rombongan belajar', 'rombel saat ini'],
    phone: ['phone', 'telepon', 'telp', 'hp', 'handphone', 'no hp', 'nomor telepon', 'no telepon'],
    namaOrtu: ['nama ortu', 'nama orang tua', 'orang tua', 'wali', 'parent', 'nama ayah', 'nama ibu'],
    email: ['email', 'e-mail', 'surel', 'e-mail'],
    mataPelajaran: ['mata pelajaran', 'mapel', 'subject', 'pelajaran'],
    nip: ['nip', 'nomor induk pegawai', 'no induk pegawai', 'nomor pegawai'],
    nik: ['nik', 'nomor induk kependudukan', 'no ktp', 'nomor ktp'],
  };
  
  for (const field of fieldConfigs) {
    const fieldLabel = field.label.toLowerCase();
    const fieldKey = field.key.toLowerCase();
    const keywords = keywordMap[fieldKey] || [fieldKey, fieldLabel];
    
    // Cari header yang paling cocok
    const match = fileHeaders.find((h) => {
      const header = h.toLowerCase().trim();
      // Exact match
      if (header === fieldLabel || header === fieldKey) return true;
      // Keyword match
      return keywords.some((kw) => header.includes(kw) || kw.includes(header));
    });
    
    if (match) {
      mapping[field.key] = match;
    }
  }
  
  return mapping;
}

// ═══════════════════════════════════════════════════════════════════════
// FIELD MAPPING DIALOG
// ═══════════════════════════════════════════════════════════════════════

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileHeaders: string[];
  fieldConfigs: FieldConfig[];
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
  onConfirm: () => void;
}

function FieldMappingDialog({
  open,
  onOpenChange,
  fileHeaders,
  fieldConfigs,
  mapping,
  onMappingChange,
  onConfirm,
}: FieldMappingDialogProps) {
  const handleAutoMap = () => {
    const autoMapped = autoMapHeaders(fileHeaders, fieldConfigs);
    onMappingChange(autoMapped);
    toast.success('Mapping otomatis berhasil!');
  };

  const handleClearAll = () => {
    onMappingChange({});
    toast.info('Mapping direset');
  };

  // Hitung field wajib yang sudah/belum ter-mapping
  const requiredFields = fieldConfigs.filter((f) => f.required);
  const mappedRequired = requiredFields.filter((f) => mapping[f.key] && mapping[f.key] !== '__skip__');
  const unmappedRequired = requiredFields.filter((f) => !mapping[f.key] || mapping[f.key] === '__skip__');
  const allRequiredMapped = unmappedRequired.length === 0;

  // Cek apakah ada kolom yang di-mapping ke lebih dari 1 field
  const usedHeaders = Object.values(mapping).filter((v) => v && v !== '__skip__');
  const duplicateHeaders = usedHeaders.filter((h, i) => usedHeaders.indexOf(h) !== i);
  const hasDuplicates = duplicateHeaders.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Mapping Kolom File
          </DialogTitle>
          <DialogDescription>
            Pilih field database untuk setiap kolom di file Anda.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Tombol Aksi */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoMap}
              className="gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Auto-Mapping
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="gap-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
              Reset Semua
            </Button>
          </div>

          {/* Status Field Wajib */}
          <div className={cn(
            'rounded-lg border p-3',
            allRequiredMapped 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-amber-50 border-amber-200'
          )}>
            <div className="flex items-start gap-2">
              {allRequiredMapped ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              )}
              <div className="text-xs">
                {allRequiredMapped ? (
                  <p className="text-emerald-800">
                    <strong>Semua field wajib sudah ter-mapping!</strong> Anda bisa melanjutkan import.
                  </p>
                ) : (
                  <>
                    <p className="text-amber-800 font-semibold mb-1">
                      Field wajib yang belum ter-mapping ({unmappedRequired.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {unmappedRequired.map((f) => (
                        <Badge key={f.key} variant="outline" className="text-xs border-amber-300 text-amber-700">
                          {f.label}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-amber-700 mt-1">
                      Silakan mapping field di atas ke kolom file Anda, atau tambahkan kolom tersebut di file Excel.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Peringatan Duplikat */}
          {hasDuplicates && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-800">
                <strong>⚠️ Peringatan:</strong> Kolom berikut di-mapping ke lebih dari 1 field. Setiap kolom hanya boleh di-mapping ke 1 field.
              </p>
            </div>
          )}
          
          {/* Daftar Kolom dari File */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                Kolom di File Anda ({fileHeaders.length})
              </p>
              <p className="text-xs text-muted-foreground">
                {Object.keys(mapping).filter((k) => mapping[k] && mapping[k] !== '__skip__').length} / {fieldConfigs.length} field ter-mapping
              </p>
            </div>
            
            {fileHeaders.length === 0 ? (
              <div className="rounded-lg bg-gray-50 border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Tidak ada kolom ditemukan di file. Pastikan file memiliki header di baris pertama.
                </p>
              </div>
            ) : (
              fileHeaders.map((header, idx) => {
                // Cari field yang ter-mapping untuk header ini
                const mappedFieldKey = Object.entries(mapping).find(([, v]) => v === header)?.[0];
                const mappedField = fieldConfigs.find((f) => f.key === mappedFieldKey);
                const isRequired = mappedField?.required;
                
                return (
                  <div key={idx} className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50/50 transition-colors',
                    mappedField && 'border-emerald-200 bg-emerald-50/30',
                    isRequired && 'border-l-2 border-l-emerald-500'
                  )}>
                    {/* Nomor & Nama Kolom */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground w-6 text-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{header}</p>
                        {mappedField ? (
                          <p className="text-xs text-emerald-600">
                            → {mappedField.label}
                            {isRequired && <span className="text-red-500 ml-1">*wajib</span>}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Belum di-mapping
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    {mappedField && (
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          'text-xs shrink-0',
                          isRequired ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {mappedField.label}
                      </Badge>
                    )}
                    
                    {/* Dropdown Pilih Field */}
                    <div className="w-56 shrink-0">
                      <Select
                        value={mappedFieldKey || '__skip__'}
                        onValueChange={(value) => {
                          const newMapping = { ...mapping };
                          // Hapus mapping lama jika header ini sudah di-mapping ke field lain
                          Object.entries(newMapping).forEach(([key, val]) => {
                            if (val === header) delete newMapping[key];
                          });
                          // Set mapping baru
                          if (value !== '__skip__') {
                            newMapping[value] = header;
                          }
                          onMappingChange(newMapping);
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Pilih field..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__skip__">-- Lewati --</SelectItem>
                          {fieldConfigs.map((field) => {
                            const isAlreadyUsed = usedHeaders.includes(field.key) && mapping[field.key] !== header;
                            return (
                              <SelectItem 
                                key={field.key} 
                                value={field.key}
                                disabled={isAlreadyUsed}
                              >
                                {field.label}
                                {field.required && ' *'}
                                {isAlreadyUsed && ' (sudah dipakai)'}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Ringkasan Mapping */}
          <div className="rounded-lg bg-gray-50 border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Ringkasan Field:</p>
            <div className="flex flex-wrap gap-2">
              {fieldConfigs.map((field) => {
                const isMapped = mapping[field.key] && mapping[field.key] !== '__skip__';
                return (
                  <Badge 
                    key={field.key} 
                    variant={isMapped ? 'default' : 'outline'} 
                    className={cn(
                      'text-xs',
                      isMapped ? 'bg-emerald-100 text-emerald-800' : '',
                      field.required && !isMapped ? 'border-red-300 text-red-600' : ''
                    )}
                  >
                    {field.label}
                    {isMapped && ' ✓'}
                    {field.required && !isMapped && ' !'}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button 
            onClick={onConfirm} 
            style={{ backgroundColor: BRAND }}
            disabled={!allRequiredMapped || hasDuplicates}
          >
            Konfirmasi & Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  const fieldConfigs = type === 'siswa' ? SISWA_FIELDS : GURU_FIELDS;
  const requiredFields = fieldConfigs.filter((f) => f.required);
  const TEMPLATE_FILENAME = type === 'siswa' ? 'template_import_siswa' : 'template_import_guru';

  // Process the file
  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setFieldMapping({});

    try {
      let parsed: { headers: string[]; rows: string[][] };
      
      // Check if Excel file
      if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
        parsed = await parseExcel(f);
      } else {
        // CSV file
        const text = await f.text();
        parsed = parseCsv(text);
      }

      setPreview(parsed);

      if (parsed.headers.length === 0) {
        toast.error('File kosong atau tidak valid');
        return;
      }

      // Auto-map headers
      const autoMapped = autoMapHeaders(parsed.headers, fieldConfigs);
      setFieldMapping(autoMapped);

      // Check required fields
      const mappedRequired = requiredFields.filter((f) => autoMapped[f.key]);
      if (mappedRequired.length < requiredFields.length) {
        toast.info('Beberapa field wajib belum ter-mapping. Silakan sesuaikan.');
      }
    } catch {
      toast.error('Gagal membaca file. Pastikan format file benar.');
    }
  }, [fieldConfigs, requiredFields]);

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
    if (droppedFile) {
      const ext = droppedFile.name.toLowerCase();
      if (ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
        processFile(droppedFile);
      } else {
        toast.error('Hanya file CSV atau Excel (.xlsx/.xls) yang diperbolehkan');
      }
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
    setFieldMapping({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Open mapping dialog
  const openMappingDialog = () => {
    setShowMappingDialog(true);
  };

  // Confirm mapping and start import
  const confirmMappingAndImport = async () => {
    setShowMappingDialog(false);
    
    // Validate required fields - cek apakah field wajib sudah punya mapping
    const missingRequired = requiredFields.filter((f) => {
      const mapped = fieldMapping[f.key];
      return !mapped || mapped === '__skip__';
    });
    
    if (missingRequired.length > 0) {
      toast.error(`Field wajib belum ter-mapping: ${missingRequired.map((f) => f.label).join(', ')}. Silakan mapping terlebih dahulu.`);
      return;
    }

    await handleImport();
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
      formData.append('fieldMapping', JSON.stringify(fieldMapping));

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
            ? 'Upload file CSV atau Excel berisi data siswa yang akan diimpor ke sistem.'
            : 'Upload file CSV atau Excel berisi data guru yang akan diimpor ke sistem.'}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-lg"
            onClick={() => downloadTemplate(fieldConfigs, `${TEMPLATE_FILENAME}.csv`)}
          >
            <Download className="h-3.5 w-3.5" />
            Template CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-lg"
            onClick={() => downloadExcelTemplate(fieldConfigs, `${TEMPLATE_FILENAME}.xlsx`)}
          >
            <Download className="h-3.5 w-3.5" />
            Template Excel
          </Button>
        </div>
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
            {isDragging ? 'Lepaskan file di sini...' : 'Seret & lepas file CSV/Excel, atau klik untuk memilih'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Format: .csv, .xlsx, .xls — Field: {fieldConfigs.filter((f) => f.required).map((f) => f.label).join(', ')}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openMappingDialog}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Mapping
              </Button>
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
          
          {/* ── Mapping Summary ── */}
          {Object.keys(fieldMapping).length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Field Mapping:</p>
              <div className="flex flex-wrap gap-2">
                {fieldConfigs
                  .filter((f) => fieldMapping[f.key] && fieldMapping[f.key] !== '__skip__')
                  .map((field) => (
                    <Badge key={field.key} variant="secondary" className="text-xs">
                      {field.label} ← {fieldMapping[field.key]}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
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
            onClick={openMappingDialog}
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

      {/* ── Field Mapping Dialog ── */}
      <FieldMappingDialog
        open={showMappingDialog}
        onOpenChange={setShowMappingDialog}
        fileHeaders={preview?.headers || []}
        fieldConfigs={fieldConfigs}
        mapping={fieldMapping}
        onMappingChange={setFieldMapping}
        onConfirm={confirmMappingAndImport}
      />
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
              Impor data siswa dan guru dari file CSV/Excel ke {user?.schoolName ?? 'sekolah Anda'}
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
              <li>• Gunakan format file <strong>.csv</strong> atau <strong>.xlsx/.xls</strong> (Excel)</li>
              <li>• Baris pertama harus berisi judul kolom</li>
              <li>• Mapping kolom akan dilakukan otomatis atau bisa disesuaikan manual</li>
              <li>• Data yang sudah ada dengan NISN/NIP yang sama akan dilewati</li>
              <li>• Kelas baru akan dibuat otomatis jika belum ada</li>
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
