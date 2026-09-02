'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Download,
  Upload,
  FileJson,
  Users,
  GraduationCap,
  BookOpen,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Wrench,
  ArrowRight,
  FileSpreadsheet,
  Database,
  Info,
  Sparkles,
  Wifi,
  Server,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const BRAND = '#1F3864';
const AMBER = '#F59E0B';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface UploadPreview {
  version?: string;
  exportedAt?: string;
  schoolName?: string;
  sourceTypes?: string[];
  totalRecords?: number;
  data: {
    pesertaDidik?: Record<string, unknown>[];
    guru?: Record<string, unknown>[];
    rombel?: Record<string, unknown>[];
    mataPelajaran?: Record<string, unknown>[];
  };
}

interface ImportResultItem {
  created: number;
  skipped: number;
  errors: string[];
}

interface ImportResults {
  pesertaDidik?: ImportResultItem;
  guru?: ImportResultItem;
  rombel?: ImportResultItem;
  mataPelajaran?: ImportResultItem;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: GradientIcon
// ═══════════════════════════════════════════════════════════════════════

function GradientIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-2.5 rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm', className)}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// WORKFLOW STEPS
// ═══════════════════════════════════════════════════════════════════════

const WORKFLOW_STEPS = [
  {
    num: 1,
    title: 'Unduh Data dari Dapodik',
    desc: 'Buka aplikasi Dapodik → menu Unduh/Export → pilih "Daftar Peserta Didik" → simpan sebagai file Excel (.xlsx).',
    icon: Download,
  },
  {
    num: 2,
    title: 'Upload Langsung ke PANDAI',
    desc: 'Buka tab "Impor Data" → seret & lepas file Excel Dapodik atau klik untuk memilih file.',
    icon: Upload,
  },
  {
    num: 3,
    title: 'Impor Otomatis',
    desc: 'Sistem akan otomatis membaca data siswa, kelas, dan informasi lainnya dari file Excel.',
    icon: Database,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// DATA TYPE CONFIGS
// ═══════════════════════════════════════════════════════════════════════

const TYPE_CONFIG = {
  pesertaDidik: {
    label: 'Peserta Didik',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-700',
    columns: ['nisn', 'nama', 'nama_peserta_didik', 'jenis_kelamin', 'no_hp', 'rombel'],
  },
  guru: {
    label: 'Guru',
    icon: GraduationCap,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    columns: ['nip', 'nama', 'no_hp', 'jenis_kelamin'],
  },
  rombel: {
    label: 'Rombongan Belajar',
    icon: LayoutGrid,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badgeColor: 'bg-purple-100 text-purple-700',
    columns: ['nama', 'tingkat', 'tahun_pelajaran', 'wali_kelas'],
  },
  mataPelajaran: {
    label: 'Mata Pelajaran',
    icon: BookOpen,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-700',
    columns: ['kode_mapel', 'nama', 'jenis'],
  },
} as const;

type DataTypeKey = keyof typeof TYPE_CONFIG;

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function DapodikSyncView() {
  const { user } = useAppStore();

  // State
  const [activeTab, setActiveTab] = useState<string>('koneksi');
  
  // Dapodik Local connection state
  const [localServer, setLocalServer] = useState('http://localhost:5775');
  const [localToken, setLocalToken] = useState('');
  const [localNpsn, setLocalNpsn] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<Record<string, { status: string; count: string }>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<UploadPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ═══════════════════════════════════════════════════════════════════════
  // FILE HANDLING
  // ═══════════════════════════════════════════════════════════════════════

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.toLowerCase();
    const isJson = ext.endsWith('.json');
    const isExcel = ext.endsWith('.xlsx') || ext.endsWith('.xls');
    
    if (!isJson && !isExcel) {
      setParseError('Format file tidak didukung. Gunakan .json, .xlsx, atau .xls');
      setUploadPreview(null);
      setUploadedFile(null);
      toast.error('Format file tidak didukung', { description: 'Gunakan file .json atau .xlsx/.xls' });
      return;
    }

    setParseError(null);
    setUploadedFile(file);
    setImportResults(null);

    try {
      let preview: UploadPreview;
      
      if (isJson) {
        // Parse JSON file
        const text = await file.text();
        const parsed = JSON.parse(text);
        
        if (!parsed.data || typeof parsed.data !== 'object') {
          setParseError('Struktur file tidak valid. File harus berisi objek "data".');
          setUploadPreview(null);
          toast.error('Struktur file tidak valid');
          return;
        }
        
        preview = {
          version: parsed.version,
          exportedAt: parsed.exportedAt,
          schoolName: parsed.schoolName,
          sourceTypes: parsed.sourceTypes,
          totalRecords: parsed.totalRecords,
          data: {
            pesertaDidik: Array.isArray(parsed.data.pesertaDidik) ? parsed.data.pesertaDidik : [],
            guru: Array.isArray(parsed.data.guru) ? parsed.data.guru : [],
            rombel: Array.isArray(parsed.data.rombel) ? parsed.data.rombel : [],
            mataPelajaran: Array.isArray(parsed.data.mataPelajaran) ? parsed.data.mataPelajaran : [],
          },
        };
      } else {
        // Parse Excel file (format Dapodik)
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>[]>(firstSheet, { header: 1 });
        
        if (data.length < 6) {
          setParseError('File Excel terlalu pendek. Pastikan file Dapodik lengkap.');
          setUploadPreview(null);
          toast.error('File tidak valid');
          return;
        }
        
        // Format Dapodik: header di row 4 (index 4), data mulai row 6 (index 6)
        const headers = (data[4] || []).map(String);
        const rows = data.slice(6)
          .filter((row) => row && (row as unknown[]).some((cell) => cell !== null && cell !== undefined && cell !== ''))
          .map((row) => {
            const obj: Record<string, unknown> = {};
            headers.forEach((h, i) => {
              if (h) obj[h.toLowerCase().replace(/\s+/g, '_')] = (row as unknown[])[i];
            });
            return obj;
          });
        
        // Map Dapodik columns to our format
        const pesertaDidik = rows.map((row) => ({
          nisn: String(row.nisn ?? '').trim(),
          nama: String(row.nama ?? '').trim(),
          nama_peserta_didik: String(row.nama ?? '').trim(),
          jenis_kelamin: String(row.jk ?? '').trim(),
          no_hp: String(row.hp ?? row.telepon ?? '').trim(),
          rombel: String(row['rombel_saat_ini'] ?? '').trim(),
          nisn_dapodik: String(row.nipd ?? '').trim(),
          tempat_lahir: String(row['tempat_lahir'] ?? '').trim(),
          tanggal_lahir: String(row['tanggal_lahir'] ?? '').trim(),
          agama: String(row.agama ?? '').trim(),
          alamat: String(row.alamat ?? '').trim(),
          nama_ayah: String(row['data_ayah'] ?? '').trim(),
          nama_ibu: String(row['data_ibu'] ?? '').trim(),
        }));
        
        // Extract unique rombel for class creation
        const rombelSet = new Set<string>();
        pesertaDidik.forEach((pd) => {
          if (pd.rombel) rombelSet.add(pd.rombel);
        });
        const rombel = Array.from(rombelSet).map((name) => ({
          nama: name,
          nama_rombel: name,
          tingkat: name.replace(/[^0-9IVX]/g, ''), // Extract grade from class name
        }));
        
        preview = {
          version: '2.0 (Dapodik Excel)',
          exportedAt: new Date().toISOString(),
          schoolName: file.name.replace('daftar_pd-', '').replace(/-\d{4}-\d{2}-\d{2}.*/, '').trim(),
          sourceTypes: ['excel-dapodik'],
          totalRecords: pesertaDidik.length,
          data: {
            pesertaDidik,
            guru: [], // File Dapodik siswa tidak berisi data guru
            rombel,
            mataPelajaran: [], // File Dapodik siswa tidak berisi data mapel
          },
        };
      }
      
      setUploadPreview(preview);
      
      // Auto-expand sections with data
      const initialExpand: Record<string, boolean> = {};
      (Object.keys(preview.data) as DataTypeKey[]).forEach((key) => {
        if (preview.data[key] && preview.data[key]!.length > 0) {
          initialExpand[key] = true;
        }
      });
      setExpandedSections(initialExpand);
      
      toast.success('File berhasil dibaca', {
        description: `${preview.totalRecords ?? '?'} record ditemukan dalam file.`,
      });
    } catch {
      setParseError('Gagal menguraikan file. Pastikan file tidak rusak.');
      setUploadPreview(null);
      toast.error('Gagal membaca file', { description: 'File tidak valid atau rusak.' });
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetUpload = useCallback(() => {
    setUploadedFile(null);
    setUploadPreview(null);
    setImportResults(null);
    setParseError(null);
    setExpandedSections({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // DAPODIK LOCAL CONNECTION
  // ═══════════════════════════════════════════════════════════════════════

  // Fetch via local proxy (localhost:5775) → Dapodik Local (localhost:5774)
  async function fetchDapodikLocal(endpoint: string, extraParams: Record<string, string> = {}): Promise<unknown> {
    const res = await fetch(localServer, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ws: endpoint,
        akses_token: localToken,
        npsn: localNpsn,
        ...extraParams,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Gagal mengambil data');
    const data = result.data;
    return Array.isArray(data) ? data : data?.rows ?? data ?? [];
  }

  async function testLocalConnection() {
    if (!localToken || !localNpsn) {
      toast.error('Token dan NPSN wajib diisi');
      return;
    }
    setIsConnecting(true);
    setConnectionStatus('idle');
    setConnectionMessage('');

    try {
      const data = await fetchDapodikLocal('getSekolah');
      const rows = Array.isArray(data) ? data : [];
      const sekolah = rows[0] as Record<string, unknown> | undefined;

      if (sekolah) {
        setConnectionStatus('success');
        setConnectionMessage(`Berhasil terhubung! Sekolah: ${(sekolah.nama as string) || 'Ditemukan'}`);
        toast.success('Koneksi berhasil!');
      } else {
        setConnectionStatus('error');
        setConnectionMessage('Data sekolah tidak ditemukan');
        toast.error('Koneksi gagal');
      }
    } catch (err) {
      setConnectionStatus('error');
      const msg = (err as Error).message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setConnectionMessage('Tidak bisa terhubung ke Dapodik Lokal. Pastikan Dapodik berjalan dan Web Service aktif.');
      } else {
        setConnectionMessage(`Gagal: ${msg}`);
      }
      toast.error('Koneksi gagal');
    } finally {
      setIsConnecting(false);
    }
  }

  async function pullFromDapodikLocal() {
    if (!localToken || !localNpsn) {
      toast.error('Token dan NPSN wajib diisi');
      return;
    }

    setIsPulling(true);
    setPullProgress({});

    const endpoints = [
      { key: 'sekolah', label: 'Sekolah', ws: 'getSekolah' },
      { key: 'pesertaDidik', label: 'Peserta Didik', ws: 'getPesertaDidik' },
      { key: 'ptk', label: 'Guru/PTK', ws: 'getPTK' },
      { key: 'rombonganBelajar', label: 'Rombongan Belajar', ws: 'getRombonganBelajar' },
    ];

    const allData: Record<string, unknown> = {};

    for (const ep of endpoints) {
      setPullProgress((prev) => ({ ...prev, [ep.key]: { status: 'loading', count: '...' } }));

      try {
        const rows = await fetchDapodikLocal(ep.ws) as unknown[];
        allData[ep.key] = rows;
        setPullProgress((prev) => ({ ...prev, [ep.key]: { status: 'done', count: `${rows.length} record` } }));
      } catch {
        setPullProgress((prev) => ({ ...prev, [ep.key]: { status: 'error', count: 'Gagal' } }));
      }
    }

    // Build preview from pulled data
    const preview: UploadPreview = {
      version: '2.0 (Dapodik Lokal)',
      exportedAt: new Date().toISOString(),
      schoolName: `NPSN: ${localNpsn}`,
      sourceTypes: ['dapodik-local'],
      totalRecords: [
        ...(allData.pesertaDidik as unknown[] || []),
        ...(allData.ptk as unknown[] || []),
        ...(allData.rombonganBelajar as unknown[] || []),
      ].length,
      data: {
        pesertaDidik: (allData.pesertaDidik as Record<string, unknown>[] || []).map((r) => ({
          nisn: String(r.nisn ?? '').trim(),
          nama: String(r.nama ?? '').trim(),
          nama_peserta_didik: String(r.nama ?? '').trim(),
          jenis_kelamin: String(r.jenis_kelamin ?? r.jk ?? '').trim(),
          no_hp: String(r.nomor_hp ?? r.nomor_telepon_rumah ?? '').trim(),
          rombel: String(r.rombongan_belajar_id ?? '').trim(),
          nik: String(r.nik ?? '').trim(),
          nama_ayah: String(r.nama_ayah ?? '').trim(),
          nama_ibu: String(r.nama_ibu_kandung ?? '').trim(),
          email: String(r.email ?? '').trim(),
          tempat_lahir: String(r.tempat_lahir ?? '').trim(),
          tanggal_lahir: String(r.tanggal_lahir ?? '').trim(),
        })),
        guru: (allData.ptk as Record<string, unknown>[] || []).map((r) => ({
          nip: String(r.nip ?? '').trim(),
          nama: String(r.nama ?? '').trim(),
          nama_pegawai: String(r.nama ?? '').trim(),
          jenis_kelamin: String(r.jenis_kelamin ?? r.jk ?? '').trim(),
          no_hp: String(r.nomor_hp ?? '').trim(),
          nik: String(r.nik ?? '').trim(),
          email: String(r.email ?? '').trim(),
          jenis_ptk: String(r.jenis_ptk ?? '').trim(),
        })),
        rombel: (allData.rombonganBelajar as Record<string, unknown>[] || []).map((r) => ({
          nama: String(r.nama ?? '').trim(),
          nama_rombel: String(r.nama ?? '').trim(),
          rombongan_belajar_id: String(r.rombongan_belajar_id ?? '').trim(),
          tingkat: String(r.tingkat_pendidikan_id ?? '').trim(),
          ptk_id: String(r.ptk_id ?? '').trim(),
        })),
        mataPelajaran: [],
      },
    };

    setUploadPreview(preview);
    setIsPulling(false);
    setActiveTab('impor');
    toast.success('Data berhasil ditarik dari Dapodik Lokal!');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // IMPORT HANDLER
  // ═══════════════════════════════════════════════════════════════════════

  async function handleImport() {
    if (!user?.schoolId) {
      toast.error('Sekolah tidak ditemukan', { description: 'ID sekolah tidak tersedia.' });
      return;
    }
    if (!uploadPreview) {
      toast.error('Tidak ada data untuk diimpor');
      return;
    }

    setIsImporting(true);
    try {
      // Build data in Dapodik format for the sync API
      const syncData = {
        pesertaDidik: (uploadPreview.data.pesertaDidik || []).map((r) => ({
          nisn: r.nisn as string,
          nama: (r.nama || r.nama_peserta_didik) as string,
          jenis_kelamin: r.jenis_kelamin as string,
          nomor_hp: r.no_hp as string,
          email: r.email as string,
          nik: r.nik as string,
          nama_ayah: r.nama_ayah as string,
          alamat_jalan: r.alamat as string,
          rombongan_belajar_id: r.rombel as string,
          tempat_lahir: r.tempat_lahir as string,
          tanggal_lahir: r.tanggal_lahir as string,
        })),
        ptk: (uploadPreview.data.guru || []).map((r) => ({
          nip: r.nip as string,
          nama: (r.nama || r.nama_pegawai) as string,
          jenis_kelamin: r.jenis_kelamin as string,
          nomor_hp: r.no_hp as string,
          email: r.email as string,
          nik: r.nik as string,
          jenis_ptk: r.jenis_ptk as string,
        })),
        rombonganBelajar: (uploadPreview.data.rombel || []).map((r) => ({
          rombongan_belajar_id: r.rombongan_belajar_id as string,
          nama: (r.nama || r.nama_rombel) as string,
          tingkat_pendidikan_id: r.tingkat as string,
          ptk_id: r.ptk_id as string,
        })),
      };

      const res = await fetch('/api/dapodik/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user.schoolId,
          data: syncData,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error('Impor gagal', { description: result.message || 'Terjadi kesalahan.' });
        return;
      }

      setImportResults(result.results);
      toast.success('Impor berhasil!', {
        description: result.message || 'Data Dapodik berhasil diimpor.',
      });
    } catch {
      toast.error('Kesalahan jaringan', { description: 'Tidak dapat terhubung ke server.' });
    } finally {
      setIsImporting(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Gradient Header ── */}
      <div className="bg-gradient-to-r from-[#1F3864] to-[#2d5289] rounded-xl px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tarik Data Dapodik</h1>
            <p className="text-sm text-white/80 mt-0.5">
              Impor data peserta didik, guru, rombel, dan mata pelajaran dari Dapodik
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/80 rounded-lg p-1">
          <TabsTrigger
            value="koneksi"
            className="rounded-md px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#1F3864] data-[state=active]:font-semibold transition-all"
          >
            <Wifi className="h-4 w-4 mr-1.5" />
            Koneksi Dapodik Lokal
          </TabsTrigger>
          <TabsTrigger
            value="ekstraksi"
            className="rounded-md px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#1F3864] data-[state=active]:font-semibold transition-all"
          >
            <Wrench className="h-4 w-4 mr-1.5" />
            Alat Ekstraksi
          </TabsTrigger>
          <TabsTrigger
            value="impor"
            className="rounded-md px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#1F3864] data-[state=active]:font-semibold transition-all"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Impor Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="koneksi" className="space-y-6">
          {/* Info Card */}
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-[#1F3864]" />
                <CardTitle className="text-lg" style={{ color: BRAND }}>
                  Koneksi ke Dapodik Lokal
                </CardTitle>
              </div>
              <CardDescription className="text-sm">
                Hubungkan langsung ke aplikasi Dapodik yang berjalan di laptop operator sekolah.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-4">
                <p className="text-sm text-amber-800">
                  <strong>Persiapan:</strong>
                </p>
                <ul className="text-xs text-amber-700 mt-2 space-y-1">
                  <li>1. Pastikan <strong>Dapodik Lokal</strong> sudah berjalan (port 5774)</li>
                  <li>2. Aktifkan Web Service: <strong>Pengaturan → Web Service → Aktif → Simpan</strong></li>
                  <li>3. Jalankan <strong>Proxy Lokal</strong>: <code className="bg-amber-100 px-1 rounded">node scripts/dapodik-proxy.mjs</code></li>
                  <li>4. Proxy berjalan di <strong>localhost:5775</strong> → menjembatani koneksi ke Dapodik</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="local-npsn">NPSN Sekolah</Label>
                    <Input
                      id="local-npsn"
                      placeholder="Contoh: 30100001"
                      value={localNpsn}
                      onChange={(e) => setLocalNpsn(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="local-token">Token Web Service</Label>
                    <Input
                      id="local-token"
                      type="password"
                      placeholder="Token dari Dapodik Lokal"
                      value={localToken}
                      onChange={(e) => setLocalToken(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="local-server">Server Dapodik (biasanya tidak perlu diubah)</Label>
                  <Input
                    id="local-server"
                    value={localServer}
                    onChange={(e) => setLocalServer(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Connection Status */}
                {connectionStatus !== 'idle' && (
                  <div className={cn(
                    'rounded-lg p-3 text-sm',
                    connectionStatus === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
                  )}>
                    {connectionStatus === 'success' ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{connectionMessage}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        <span>{connectionMessage}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Pull Progress */}
                {Object.keys(pullProgress).length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(pullProgress).map(([key, prog]) => (
                      <div key={key} className={cn(
                        'rounded-lg border p-3 text-center',
                        prog.status === 'done' ? 'bg-emerald-50 border-emerald-200' :
                        prog.status === 'loading' ? 'bg-amber-50 border-amber-200' :
                        prog.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                      )}>
                        <p className="text-xs text-muted-foreground capitalize">{key}</p>
                        <p className={cn(
                          'text-lg font-bold',
                          prog.status === 'done' ? 'text-emerald-600' :
                          prog.status === 'loading' ? 'text-amber-600' :
                          prog.status === 'error' ? 'text-red-600' : 'text-gray-400'
                        )}>{prog.count}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={testLocalConnection}
                    disabled={isConnecting || isPulling}
                    className="gap-2"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wifi className="h-4 w-4" />
                    )}
                    {isConnecting ? 'Menghubungkan...' : 'Tes Koneksi'}
                  </Button>
                  <Button
                    onClick={pullFromDapodikLocal}
                    disabled={isConnecting || isPulling || connectionStatus !== 'success'}
                    className="gap-2"
                    style={{ backgroundColor: BRAND }}
                  >
                    {isPulling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {isPulling ? 'Sedang Menarik...' : 'Tarik Semua Data'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ekstraksi" className="space-y-6">
          {/* Info Card */}
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-[#1F3864]" />
                <CardTitle className="text-lg" style={{ color: BRAND }}>
                  Cara Menggunakan Alat Ekstraksi
                </CardTitle>
              </div>
              <CardDescription className="text-sm">
                Ikuti 3 langkah sederhana untuk mengimpor data Dapodik ke PANDAI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {WORKFLOW_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.num} className="flex items-start gap-4">
                      {/* Step number circle */}
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                        style={{ backgroundColor: BRAND }}
                      >
                        {step.num}
                      </div>
                      {/* Connector line */}
                      {idx < WORKFLOW_STEPS.length - 1 && (
                        <div className="absolute ml-4 mt-9 h-[calc(100%-18px)] w-px bg-border" style={{ display: 'none' }} />
                      )}
                      {/* Content */}
                      <div className="flex-1 rounded-lg bg-muted/40 p-4 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-[#F59E0B]" />
                          <span className="font-semibold text-sm text-foreground">{step.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                      </div>
                      {idx < WORKFLOW_STEPS.length - 1 && (
                        <ArrowRight className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-4 hidden sm:block" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Download Card */}
          <Card className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 shadow-sm">
            <CardContent className="py-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white shadow-lg">
                <Download className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Alat Ekstraksi Dapodik</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  File HTML mandiri — cukup buka di browser, tidak perlu instalasi.
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href="/dapodik-tool.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    size="lg"
                    className="rounded-xl px-8 py-6 text-base font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                      color: 'white',
                    }}
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    Buka Alat
                  </Button>
                </a>
                <a
                  href="/dapodik-tool.html"
                  download="PANDAI-Alat-Ekstraksi-Dapodik.html"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-xl px-8 py-6 text-base font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download
                  </Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Format: HTML • Ukuran: ~45 KB • Kompatibel: Chrome, Edge, Firefox
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impor" className="space-y-6">
          {/* Upload Zone */}
          <div
            className={cn(
              'relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer',
              dragOver
                ? 'border-[#F59E0B] bg-amber-50/60 scale-[1.01]'
                : 'border-border hover:border-[#1F3864]/40 hover:bg-muted/20',
              uploadedFile && !parseError && 'border-emerald-300 bg-emerald-50/30'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center justify-center py-12 px-6 gap-3">
              {dragOver ? (
                <>
                  <div className="p-3 rounded-xl bg-amber-100">
                    <Upload className="h-8 w-8 text-[#F59E0B]" />
                  </div>
                  <p className="text-sm font-semibold text-[#F59E0B]">Lepaskan file di sini...</p>
                </>
              ) : uploadedFile && !parseError ? (
                <>
                  <div className="p-3 rounded-xl bg-emerald-100">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(uploadedFile.size / 1024).toFixed(1)} KB — Klik untuk ganti file
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-muted">
                    <FileJson className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      Seret & lepas file Dapodik di sini
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      atau klik untuk memilih file • Format: .json, .xlsx, .xls
                    </p>
                  </div>
                </>
              )}
              {parseError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-2 mt-1">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p className="text-xs font-medium">{parseError}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Summary Cards (after upload) ── */}
          {uploadPreview && (
            <div className="space-y-6">
              {/* Meta Info */}
              <div className="flex flex-wrap gap-3">
                {uploadPreview.schoolName && (
                  <Badge variant="outline" className="rounded-lg px-3 py-1 text-xs">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    {uploadPreview.schoolName}
                  </Badge>
                )}
                {uploadPreview.exportedAt && (
                  <Badge variant="outline" className="rounded-lg px-3 py-1 text-xs">
                    Diekspor: {uploadPreview.exportedAt}
                  </Badge>
                )}
                {uploadPreview.version && (
                  <Badge variant="outline" className="rounded-lg px-3 py-1 text-xs">
                    Versi: {uploadPreview.version}
                  </Badge>
                )}
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(Object.keys(TYPE_CONFIG) as DataTypeKey[]).map((key) => {
                  const config = TYPE_CONFIG[key];
                  const count = uploadPreview.data[key]?.length ?? 0;
                  const Icon = config.icon;
                  return (
                    <Card
                      key={key}
                      className={cn(
                        'rounded-xl border shadow-sm hover:shadow-md transition-all',
                        count > 0 ? config.borderColor : 'opacity-50'
                      )}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg', config.bgColor)}>
                          <Icon className={cn('h-5 w-5', config.color)} />
                        </div>
                        <div>
                          <p className="text-2xl font-bold" style={{ color: BRAND }}>{count}</p>
                          <p className="text-xs text-muted-foreground">{config.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* ── Collapsible Preview Tables ── */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Pratinjau Data</h3>
                {(Object.keys(TYPE_CONFIG) as DataTypeKey[]).map((key) => {
                  const config = TYPE_CONFIG[key];
                  const rows = uploadPreview.data[key] ?? [];
                  if (rows.length === 0) return null;
                  const isExpanded = expandedSections[key] ?? false;

                  return (
                    <Collapsible
                      key={key}
                      open={isExpanded}
                      onOpenChange={() => toggleSection(key)}
                    >
                      <Card className="rounded-xl border shadow-sm">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between py-3 px-4 hover:bg-muted/30 transition-colors rounded-t-xl cursor-pointer">
                            <div className="flex items-center gap-2">
                              <div className={cn('p-1.5 rounded-lg', config.bgColor)}>
                                {(() => { const DynIcon = config.icon; return <DynIcon className={cn('h-4 w-4', config.color)} />; })()}
                              </div>
                              <span className="text-sm font-semibold">{config.label}</span>
                              <Badge className={cn('rounded-full text-[10px] font-medium border', config.badgeColor)}>
                                {rows.length} record
                              </Badge>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-10 text-center text-xs">#</TableHead>
                                  {config.columns.map((col) => (
                                    <TableHead key={col} className="text-xs font-semibold">
                                      {col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rows.slice(0, 50).map((row, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="text-center text-xs text-muted-foreground">
                                      {idx + 1}
                                    </TableCell>
                                    {config.columns.map((col) => (
                                      <TableCell key={col} className="text-xs max-w-[200px] truncate">
                                        {(row[col] as string) ?? '-'}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            {rows.length > 50 && (
                              <div className="px-4 py-2 text-center text-xs text-muted-foreground border-t bg-muted/20">
                                Menampilkan 50 dari {rows.length} record
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>

              {/* ── Import Action ── */}
              {!importResults && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
                    <span>
                      Data duplikat (berdasarkan NISN/NIP/nama kelas/kode mapel) akan dilewati otomatis.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={resetUpload}>
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-lg px-6 font-semibold text-white"
                      style={{ backgroundColor: BRAND }}
                      onClick={handleImport}
                      disabled={isImporting}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Mengimpor...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Mulai Impor
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Import Results ── */}
              {importResults && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <h3 className="text-base font-bold" style={{ color: BRAND }}>
                      Hasil Impor
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(Object.keys(importResults) as DataTypeKey[]).map((key) => {
                      const config = TYPE_CONFIG[key];
                      const result = importResults[key];
                      if (!result) return null;
                      const Icon = config.icon;
                      const total = result.created + result.skipped;

                      return (
                        <Card key={key} className={cn('rounded-xl border shadow-sm', config.borderColor)}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className={cn('p-1.5 rounded-lg', config.bgColor)}>
                                <Icon className={cn('h-4 w-4', config.color)} />
                              </div>
                              <span className="text-sm font-semibold">{config.label}</span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Dibuat</span>
                                <span className="font-semibold text-emerald-600">{result.created}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Dilewati</span>
                                <span className="font-semibold text-amber-600">{result.skipped}</span>
                              </div>
                              <div className="h-px bg-border" />
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Total</span>
                                <span className="font-bold" style={{ color: BRAND }}>{total}</span>
                              </div>
                            </div>
                            {result.errors.length > 0 && (
                              <div className="space-y-1 mt-2">
                                <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  {result.errors.length} kesalahan
                                </p>
                                <div className="max-h-24 overflow-y-auto text-xs text-red-500 space-y-0.5">
                                  {result.errors.slice(0, 5).map((err, i) => (
                                    <p key={i} className="truncate">• {err}</p>
                                  ))}
                                  {result.errors.length > 5 && (
                                    <p className="text-muted-foreground">
                                      ...+{result.errors.length - 5} lainnya
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Note about default password */}
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-amber-800">Password Default</p>
                        <p className="text-amber-700 mt-0.5">
                          Semua akun baru (siswa & guru) dibuat dengan password default:{' '}
                          <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono font-bold">pandai123</code>.{' '}
                          Segera minta pengguna untuk mengubah password setelah login pertama.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reset button */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={resetUpload}
                    >
                      Impor Data Lain
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
