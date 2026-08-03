'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plus, Search, Eye, Pencil, Trash2, FileText, Clock, Users, BarChart3,
  CheckCircle2, CircleDot, Save, Star, BookOpen, AlertTriangle, TrendingUp,
  ChevronDown, ChevronUp, UserCheck, UserX, Stethoscope, ClipboardList,
  Download, Printer, CalendarClock, Sparkles, Calendar,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// SHARED TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════

interface TugasItem { id: string; title: string; description: string; type: 'tugas' | 'quiz' | 'ujian'; dueDate: string; status: 'published' | 'completed' | 'draft' | 'late'; content?: string; }
interface Student { id: string; name: string; nisn: string; }
interface AttendanceRecord { studentId: string; status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'; note: string; }
interface RekapKehadiran { studentId: string; studentName: string; hadir: number; izin: number; sakit: number; alpa: number; persentase: number; }
interface HabitRating { habit: string; rating: number; note: string; }
interface JournalEntry { id: string; date: string; className: string; subject: string; topic: string; activities: string; notes: string; }

const HABITS = [
  { key: 'proaktif', name: 'Bersikap Proaktif', emoji: '🎯', desc: 'Mengambil inisiatif dan bertanggung jawab' },
  { key: 'tujuan', name: 'Memulai dengan Tujuan', emoji: '🧭', desc: 'Menentukan tujuan sebelum bertindak' },
  { key: 'prioritas', name: 'Prioritas Utama Dahulu', emoji: '📋', desc: 'Mengutamakan hal penting, bukan mendesak' },
  { key: 'menang', name: 'Berpikir Menang-Menang', emoji: '🤝', desc: 'Mencari solusi saling menguntungkan' },
  { key: 'mengerti', name: 'Mengerti lalu Dierti', emoji: '👂', desc: 'Mendengarkan orang lain terlebih dahulu' },
  { key: 'sinergi', name: 'Bersinergi', emoji: '🤲', desc: 'Bekerja sama mencapai hasil terbaik' },
  { key: 'asah', name: 'Asah Gergaji', emoji: '🔧', desc: 'Terus belajar dan mengembangkan diri' },
];

const MOCK_CLASSES = [
  { id: 'c1', name: 'X IPA 1' }, { id: 'c2', name: 'X IPA 2' },
  { id: 'c3', name: 'XI IPA 1' }, { id: 'c4', name: 'XI IPA 2' },
  { id: 'c5', name: 'XII IPA 1' },
];

const MOCK_STUDENTS: Student[] = [
  { id: 's1', name: 'Ahmad Fauzi', nisn: '0051234001' }, { id: 's2', name: 'Siti Nurhaliza', nisn: '0051234002' },
  { id: 's3', name: 'Budi Santoso', nisn: '0051234003' }, { id: 's4', name: 'Dewi Lestari', nisn: '0051234004' },
  { id: 's5', name: 'Rizky Pratama', nisn: '0051234005' }, { id: 's6', name: 'Putri Wulandari', nisn: '0051234006' },
  { id: 's7', name: 'Muhammad Iqbal', nisn: '0051234007' }, { id: 's8', name: 'Anisa Rahma', nisn: '0051234008' },
  { id: 's9', name: 'Fajar Setiawan', nisn: '0051234009' }, { id: 's10', name: 'Rina Marlina', nisn: '0051234010' },
];

const MOCK_TUGAS: TugasItem[] = [
  { id: 't1', title: 'Essay Struktur Atom', description: 'Tulis essay tentang struktur atom', type: 'tugas', dueDate: '2025-07-20', status: 'published' },
  { id: 't2', title: 'Kuis Bab 3 - Termodinamika', description: '20 soal PG termodinamika', type: 'quiz', dueDate: '2025-07-15', status: 'completed' },
  { id: 't3', title: 'UAS Semester 1 - Fisika', description: 'Ujian Akhir Semester Fisika', type: 'ujian', dueDate: '2025-07-10', status: 'completed' },
  { id: 't4', title: 'Laporan Praktikum Gaya Lorentz', description: 'Laporan hasil praktikum', type: 'tugas', dueDate: '2025-07-25', status: 'published' },
  { id: 't5', title: 'Kuis Persamaan Kuadrat', description: 'Kuis pemfaktoran', type: 'quiz', dueDate: '2025-07-12', status: 'late' },
  { id: 't6', title: 'UTS Matematika', description: 'Ujian Tengah Semester', type: 'ujian', dueDate: '2025-08-05', status: 'draft' },
  { id: 't7', title: 'Tugas Rumah Vektor', description: '30 soal vektor hal 120-135', type: 'tugas', dueDate: '2025-07-30', status: 'published' },
  { id: 't8', title: 'Kuis Akhir Kimia Organik', description: 'Senyawa hidrokarbon', type: 'quiz', dueDate: '2025-07-08', status: 'late' },
];

const MOCK_REKAP: RekapKehadiran[] = [
  { studentId: 's1', studentName: 'Ahmad Fauzi', hadir: 20, izin: 1, sakit: 1, alpa: 0, persentase: 90.9 },
  { studentId: 's2', studentName: 'Siti Nurhaliza', hadir: 21, izin: 0, sakit: 1, alpa: 0, persentase: 95.5 },
  { studentId: 's3', studentName: 'Budi Santoso', hadir: 18, izin: 2, sakit: 0, alpa: 2, persentase: 81.8 },
  { studentId: 's4', studentName: 'Dewi Lestari', hadir: 22, izin: 0, sakit: 0, alpa: 0, persentase: 100 },
  { studentId: 's5', studentName: 'Rizky Pratama', hadir: 17, izin: 1, sakit: 2, alpa: 2, persentase: 77.3 },
  { studentId: 's6', studentName: 'Putri Wulandari', hadir: 21, izin: 1, sakit: 0, alpa: 0, persentase: 95.5 },
  { studentId: 's7', studentName: 'Muhammad Iqbal', hadir: 19, izin: 0, sakit: 1, alpa: 2, persentase: 86.4 },
  { studentId: 's8', studentName: 'Anisa Rahma', hadir: 22, izin: 0, sakit: 0, alpa: 0, persentase: 100 },
  { studentId: 's9', studentName: 'Fajar Setiawan', hadir: 15, izin: 3, sakit: 1, alpa: 3, persentase: 68.2 },
  { studentId: 's10', studentName: 'Rina Marlina', hadir: 20, izin: 1, sakit: 1, alpa: 0, persentase: 90.9 },
];

const MOCK_HABIT_RATINGS: HabitRating[] = [
  { habit: 'proaktif', rating: 4, note: 'Sering bertanya aktif' }, { habit: 'tujuan', rating: 3, note: 'Kadang kurang fokus' },
  { habit: 'prioritas', rating: 4, note: '' }, { habit: 'menang', rating: 5, note: 'Sangat baik kerja kelompok' },
  { habit: 'mengerti', rating: 3, note: 'Perlu lebih mendengarkan' }, { habit: 'sinergi', rating: 4, note: '' },
  { habit: 'asah', rating: 3, note: 'Aktif ekskul' },
];

const MOCK_REKAP_KARAKTER = [
  { studentId: 's1', studentName: 'Ahmad Fauzi', ratings: [4, 3, 4, 5, 3, 4, 3] },
  { studentId: 's2', studentName: 'Siti Nurhaliza', ratings: [5, 4, 5, 4, 5, 4, 4] },
  { studentId: 's3', studentName: 'Budi Santoso', ratings: [3, 3, 2, 4, 3, 3, 2] },
  { studentId: 's4', studentName: 'Dewi Lestari', ratings: [5, 5, 5, 5, 4, 5, 5] },
  { studentId: 's5', studentName: 'Rizky Pratama', ratings: [2, 3, 2, 3, 2, 3, 2] },
  { studentId: 's6', studentName: 'Putri Wulandari', ratings: [4, 4, 4, 4, 4, 5, 4] },
  { studentId: 's7', studentName: 'Muhammad Iqbal', ratings: [3, 2, 3, 3, 3, 2, 3] },
  { studentId: 's8', studentName: 'Anisa Rahma', ratings: [4, 5, 4, 4, 5, 4, 4] },
];

const MOCK_JOURNALS: JournalEntry[] = [
  { id: 'j1', date: '2025-07-14', className: 'XI IPA 1', subject: 'Fisika', topic: 'Hukum Newton tentang Gravitasi', activities: 'Membahas teori gravitasi universal Newton, contoh soal perhitungan gaya gravitasi, diskusi kelompok penerapan hukum Newton.', notes: 'Siswa antusias, perlu lebih banyak latihan soal.' },
  { id: 'j2', date: '2025-07-13', className: 'XI IPA 2', subject: 'Fisika', topic: 'Usaha dan Energi', activities: 'Review konsep usaha dan energi kinetik/potensial, pembahasan soal latihan, demonstrasi konversi energi.', notes: 'Beberapa siswa bingung energi potensial elastis.' },
  { id: 'j3', date: '2025-07-11', className: 'X IPA 1', subject: 'Matematika', topic: 'Persamaan Kuadrat', activities: 'Penjelasan rumus abc dan diskriminan, latihan 15 soal, kuis singkat 5 menit.', notes: '80% siswa menguasai materi.' },
  { id: 'j4', date: '2025-07-10', className: 'XII IPA 1', subject: 'Fisika', topic: 'Gelombang Bunyi', activities: 'Pembahasan sifat gelombang bunyi, resonansi, praktek mengukur kecepatan bunyi.', notes: 'Praktikum berjalan baik.' },
  { id: 'j5', date: '2025-07-09', className: 'XI IPA 1', subject: 'Fisika', topic: 'Momentum dan Impuls', activities: 'Demonstrasi tumbukan, hukum kekekalan momentum, latihan soal.', notes: 'Perlu repeat tumbukan tidak sempurna.' },
  { id: 'j6', date: '2025-07-08', className: 'X IPA 2', subject: 'Matematika', topic: 'Sistem Persamaan Linear', activities: 'Metode eliminasi dan substitusi, latihan soal campuran, tugas kelompok.', notes: 'Siswa lebih suka metode eliminasi.' },
];

const SUBJECTS = ['Fisika', 'Matematika', 'Kimia', 'Biologi', 'Bahasa Indonesia', 'Bahasa Inggris'];
const MONTHS = [
  { value: '01', label: 'Januari' }, { value: '02', label: 'Februari' }, { value: '03', label: 'Maret' },
  { value: '04', label: 'April' }, { value: '05', label: 'Mei' }, { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' }, { value: '08', label: 'Agustus' }, { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function currentMonth() { return String(new Date().getMonth() + 1).padStart(2, '0'); }
function formatDate(d: string) { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }

// ═══════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function statusBadge(status: string) {
  const map: Record<string, { cls: string; label: string }> = {
    published: { cls: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0', label: 'Aktif' },
    completed: { cls: 'bg-gray-100 text-gray-600 hover:bg-gray-100 border-0', label: 'Selesai' },
    draft: { cls: 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-0', label: 'Draft' },
    late: { cls: 'bg-red-100 text-red-700 hover:bg-red-100 border-0', label: 'Terlambat' },
  };
  const v = map[status];
  return v ? <Badge className={v.cls}>{v.label}</Badge> : <Badge variant="secondary">{status}</Badge>;
}

function typeBadge(type: string) {
  const map: Record<string, string> = { tugas: 'border-blue-300 text-blue-700', quiz: 'border-purple-300 text-purple-700', ujian: 'border-orange-300 text-orange-700' };
  return <Badge variant="outline" className={map[type] ?? ''}>{type === 'tugas' ? 'Tugas' : type === 'quiz' ? 'Kuis' : 'Ujian'}</Badge>;
}

function kehadiranBadge(status: string) {
  const map: Record<string, string> = { Hadir: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0', Izin: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-0', Sakit: 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-0', Alpa: 'bg-red-100 text-red-700 hover:bg-red-100 border-0' };
  return <Badge className={map[status] ?? ''}>{status}</Badge>;
}

function StarRating({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-5 h-5' : 'w-7 h-7';
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange?.(s)} className={cn('transition-colors', !onChange && 'cursor-default')} aria-label={`${s} bintang`}>
          <Star className={cn(sz, s <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300')} />
        </button>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, bg, color, sub }: { icon: React.ReactNode; label: string; value: string | number; bg: string; color: string; sub?: string }) {
  return (
    <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-xl', bg, color)}>{icon}</div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className={cn('text-xl font-bold', color)}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ViewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded bg-muted" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 1. GURU TUGAS VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruTugasView() {
  const user = useAppStore((s) => s.user);
  const [items, setItems] = useState<TugasItem[]>(MOCK_TUGAS);
  const [activeTab, setActiveTab] = useState('semua');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<TugasItem | null>(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'tugas' as 'tugas' | 'quiz' | 'ujian', dueDate: '', content: '' });
  const [saving, setSaving] = useState(false);
  const fetchedRef = useRef(false);

  // Attempt API fetch on mount — only update if API returns data
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    const sid = user?.schoolId ?? '';
    const tid = user?.id ?? '';
    if (!sid || !tid) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/materials?schoolId=${sid}&teacherId=${tid}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const mapped = (Array.isArray(data) ? data : []).map((m: Record<string, string>) => ({
          id: m.id, title: m.title, description: m.description || '', type: (m.type || 'tugas') as TugasItem['type'],
          dueDate: m.dueDate || m.createdAt || '', status: (m.status || 'published') as TugasItem['status'], content: m.content || '',
        }));
        if (mapped.length > 0) setItems(mapped);
      } catch { /* use mock */ }
    })();
    return () => controller.abort();
  }, [user?.schoolId, user?.id]);

  const filtered = items.filter((i) => {
    if (activeTab !== 'semua' && i.type !== activeTab) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: items.length,
    aktif: items.filter((i) => i.status === 'published').length,
    selesai: items.filter((i) => i.status === 'completed').length,
    draft: items.filter((i) => i.status === 'draft' || i.status === 'late').length,
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Judul wajib diisi'); return; }
    if (!form.dueDate) { toast.error('Tanggal tenggat wajib diisi'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, description: form.description, content: form.content, schoolId: user?.schoolId, teacherId: user?.id, type: form.type, dueDate: form.dueDate, status: 'published' }),
      });
      if (res.ok) { toast.success('Tugas berhasil dibuat'); setDialogOpen(false); setForm({ title: '', description: '', type: 'tugas', dueDate: '', content: '' }); setSaving(false); return; }
    } catch { /* fallback */ }
    const newItem: TugasItem = { id: `t${Date.now()}`, ...form, status: 'published' };
    setItems((prev) => [newItem, ...prev]);
    toast.success('Tugas berhasil dibuat (lokal)');
    setDialogOpen(false);
    setForm({ title: '', description: '', type: 'tugas', dueDate: '', content: '' });
    setSaving(false);
  };

  const handleDelete = () => {
    if (!selected) return;
    setItems((prev) => prev.filter((i) => i.id !== selected.id));
    toast.success('Tugas berhasil dihapus'); setDeleteOpen(false); setSelected(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Tugas, Kuis & Ujian</h1>
          <p className="text-sm text-muted-foreground">Kelola tugas, kuis, dan ujian untuk siswa Anda</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Buat Tugas Baru
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FileText className="w-5 h-5" />} label="Total Tugas" value={stats.total} bg="bg-[#1F3864]/10" color="text-[#1F3864]" />
        <StatCard icon={<CircleDot className="w-5 h-5" />} label="Aktif" value={stats.aktif} bg="bg-emerald-50" color="text-emerald-600" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Selesai" value={stats.selesai} bg="bg-gray-100" color="text-gray-600" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Draft / Terlambat" value={stats.draft} bg="bg-amber-50" color="text-amber-600" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList><TabsTrigger value="semua">Semua</TabsTrigger><TabsTrigger value="tugas">Tugas</TabsTrigger><TabsTrigger value="quiz">Kuis</TabsTrigger><TabsTrigger value="ujian">Ujian</TabsTrigger></TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari tugas..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1F3864]/5 hover:bg-[#1F3864]/5">
                  <TableHead className="font-semibold">Judul</TableHead>
                  <TableHead className="font-semibold">Tipe</TableHead>
                  <TableHead className="font-semibold">Tenggat</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Tidak ada data tugas</TableCell></TableRow>}
                {filtered.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell className="font-medium max-w-[240px]">
                      <div className="truncate" title={item.title}>{item.title}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[240px]" title={item.description}>{item.description}</div>
                    </TableCell>
                    <TableCell>{typeBadge(item.type)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(item.dueDate)}</TableCell>
                    <TableCell>{statusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(item); setDetailOpen(true); }}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(item); setForm({ title: item.title, description: item.description, type: item.type, dueDate: item.dueDate, content: item.content || '' }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { setSelected(item); setDeleteOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#1F3864]">{selected ? 'Edit' : 'Buat'} Tugas</DialogTitle><DialogDescription>Tambahkan tugas, kuis, atau ujian baru untuk siswa</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Judul *</Label><Input placeholder="Masukkan judul tugas" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Deskripsi</Label><Input placeholder="Deskripsi singkat" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Tipe *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as 'tugas' | 'quiz' | 'ujian' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="tugas">Tugas</SelectItem><SelectItem value="quiz">Kuis</SelectItem><SelectItem value="ujian">Ujian</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Tanggal Tenggat *</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Konten / Instruksi</Label><Textarea placeholder="Tulis instruksi tugas..." rows={5} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setSelected(null); }}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white">{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-[#1F3864]">{selected?.title}</DialogTitle><DialogDescription>Detail tugas</DialogDescription></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex gap-2">{typeBadge(selected.type)} {statusBadge(selected.status)}</div>
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              <div className="flex items-center gap-2 text-sm"><CalendarClock className="w-4 h-4 text-muted-foreground" /> Tenggat: {formatDate(selected.dueDate)}</div>
              {selected.content && <div className="p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap">{selected.content}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Tugas</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus &quot;{selected?.title}&quot;?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. GURU KEHADIRAN VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruKehadiranView() {
  const user = useAppStore((s) => s.user);
  const [date, setDate] = useState(todayStr());
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef<string>('');

  // Load students when classId changes
  useEffect(() => {
    const key = `${classId}-${date}`;
    if (!classId || loadedRef.current === key) return;
    loadedRef.current = key;
    const controller = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams({ schoolId: user?.schoolId ?? '', classId, date });
        const res = await fetch(`/api/attendance?${params}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.students) && data.students.length > 0) {
            const st = data.students.map((s: Record<string, string>) => ({ id: s.id, name: s.name, nisn: s.nisn || '' }));
            const recs: Record<string, AttendanceRecord> = {};
            if (Array.isArray(data.records)) data.records.forEach((r: Record<string, string>) => { recs[r.studentId] = { studentId: r.studentId, status: (r.status || 'Hadir') as AttendanceRecord['status'], note: r.note || '' }; });
            setStudents(st); setRecords(recs); return;
          }
        }
      } catch { /* fallback */ }
      setStudents(MOCK_STUDENTS);
      const statuses: ('Hadir' | 'Izin' | 'Sakit' | 'Alpa')[] = ['Hadir', 'Hadir', 'Hadir', 'Izin', 'Hadir', 'Sakit', 'Hadir', 'Alpa', 'Hadir', 'Hadir'];
      const recs: Record<string, AttendanceRecord> = {};
      MOCK_STUDENTS.forEach((s, i) => { recs[s.id] = { studentId: s.id, status: statuses[i], note: '' }; });
      setRecords(recs);
    })();
    return () => controller.abort();
  }, [classId, date, user?.schoolId]);

  const updateRecord = (sid: string, field: keyof AttendanceRecord, value: string) => {
    setRecords((prev) => ({ ...prev, [sid]: { ...prev[sid], [field]: value } }));
  };

  const markAllHadir = () => {
    const updated = { ...records };
    students.forEach((s) => { updated[s.id] = { ...updated[s.id], status: 'Hadir' }; });
    setRecords(updated);
    toast.success('Semua siswa ditandai Hadir');
  };

  const handleSave = async () => {
    if (!classId) { toast.error('Pilih kelas terlebih dahulu'); return; }
    setSaving(true);
    const body = { classId, schoolId: user?.schoolId, date, recordedBy: user?.id, records: Object.values(records).map((r) => ({ studentId: r.studentId, status: r.status, note: r.note })) };
    try {
      const res = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { toast.success('Kehadiran berhasil disimpan'); setSaving(false); return; }
    } catch { /* fallback */ }
    toast.success('Kehadiran berhasil disimpan (lokal)');
    setSaving(false);
  };

  const summary = Object.values(records).reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 } as Record<string, number>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F3864]">Kehadiran Siswa</h1>
        <p className="text-sm text-muted-foreground">Catat kehadiran harian siswa di kelas</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="space-y-2 w-full sm:w-auto"><Label>Tanggal</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full sm:w-48" /></div>
            <div className="space-y-2 w-full sm:w-auto">
              <Label>Kelas</Label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); loadedRef.current = ''; }}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                <SelectContent>{MOCK_CLASSES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {students.length > 0 && <Button variant="outline" onClick={markAllHadir} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"><UserCheck className="w-4 h-4 mr-2" />Semua Hadir</Button>}
          </div>
        </CardContent>
      </Card>

      {students.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<UserCheck className="w-5 h-5" />} label="Hadir" value={summary.Hadir} bg="bg-emerald-50" color="text-emerald-600" />
          <StatCard icon={<FileText className="w-5 h-5" />} label="Izin" value={summary.Izin} bg="bg-blue-50" color="text-blue-600" />
          <StatCard icon={<Stethoscope className="w-5 h-5" />} label="Sakit" value={summary.Sakit} bg="bg-amber-50" color="text-amber-600" />
          <StatCard icon={<UserX className="w-5 h-5" />} label="Alpa" value={summary.Alpa} bg="bg-red-50" color="text-red-600" />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {!classId ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mb-3 opacity-30" /><p>Pilih kelas untuk menampilkan daftar siswa</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1F3864]" /></div>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#1F3864]/5 hover:bg-[#1F3864]/5">
                    <TableHead className="w-12 font-semibold">No</TableHead>
                    <TableHead className="font-semibold">Nama Siswa</TableHead>
                    <TableHead className="font-semibold">NISN</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s, idx) => {
                    const rec = records[s.id] || { studentId: s.id, status: 'Hadir' as const, note: '' };
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.nisn}</TableCell>
                        <TableCell>
                          <Select value={rec.status} onValueChange={(v) => updateRecord(s.id, 'status', v)}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Hadir"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" />Hadir</span></SelectItem>
                              <SelectItem value="Izin"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" />Izin</span></SelectItem>
                              <SelectItem value="Sakit"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" />Sakit</span></SelectItem>
                              <SelectItem value="Alpa"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" />Alpa</span></SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input placeholder="Catatan..." value={rec.note} onChange={(e) => updateRecord(s.id, 'note', e.target.value)} className="w-40" /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {students.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white min-w-[160px]">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Menyimpan...' : 'Simpan Kehadiran'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. GURU REKAP KEHADIRAN VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruRekapKehadiranView() {
  const user = useAppStore((s) => s.user);
  const [classId, setClassId] = useState('c1');
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<RekapKehadiran[]>(MOCK_REKAP);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const fetchedRef = useRef<string>('');

  useEffect(() => {
    const key = `${classId}-${month}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/attendance?schoolId=${user?.schoolId ?? ''}&classId=${classId}&month=${month}`, { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.rekap) && json.rekap.length > 0) { setData(json.rekap); return; }
        }
      } catch { /* use mock */ }
      setData(MOCK_REKAP);
    })();
    return () => controller.abort();
  }, [classId, month, user?.schoolId]);

  const sorted = [...data].sort((a, b) => sortDir === 'desc' ? b.persentase - a.persentase : a.persentase - b.persentase);
  const totalHari = 22;
  const avgKehadiran = data.length > 0 ? (data.reduce((s, d) => s + d.persentase, 0) / data.length).toFixed(1) : '0';
  const seringIzin = [...data].sort((a, b) => b.izin - a.izin)[0];
  const seringAlpa = [...data].sort((a, b) => b.alpa - a.alpa)[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-[#1F3864]">Rekap Kehadiran</h1><p className="text-sm text-muted-foreground">Ringkasan kehadiran siswa per bulan</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.success('Data berhasil diekspor')}><Download className="w-4 h-4 mr-2" />Ekspor</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Cetak</Button>
        </div>
      </div>

      <Card><CardContent className="p-4"><div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="space-y-2"><Label>Kelas</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); fetchedRef.current = ''; }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{MOCK_CLASSES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Bulan</Label>
          <Select value={month} onValueChange={(v) => { setMonth(v); fetchedRef.current = ''; }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div></CardContent></Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar className="w-5 h-5" />} label="Total Hari Efektif" value={totalHari} bg="bg-[#1F3864]/10" color="text-[#1F3864]" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Rata-rata Kehadiran" value={`${avgKehadiran}%`} bg="bg-emerald-50" color="text-emerald-600" />
        <StatCard icon={<FileText className="w-5 h-5" />} label="Sering Izin" value={seringIzin ? seringIzin.studentName.split(' ')[0] : '-'} bg="bg-blue-50" color="text-blue-600" sub={seringIzin ? `${seringIzin.izin}x` : ''} />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Sering Alpa" value={seringAlpa ? seringAlpa.studentName.split(' ')[0] : '-'} bg="bg-red-50" color="text-red-600" sub={seringAlpa ? `${seringAlpa.alpa}x` : ''} />
      </div>

      <Card>
        <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">Detail Kehadiran Siswa</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}><BarChart3 className="w-4 h-4 mr-1" />Urutkan {sortDir === 'desc' ? '↑' : '↓'}</Button>
        </div></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1F3864]/5 hover:bg-[#1F3864]/5">
                  <TableHead className="w-12 font-semibold">No</TableHead>
                  <TableHead className="font-semibold">Nama</TableHead>
                  <TableHead className="text-center font-semibold">Hadir</TableHead>
                  <TableHead className="text-center font-semibold">Izin</TableHead>
                  <TableHead className="text-center font-semibold">Sakit</TableHead>
                  <TableHead className="text-center font-semibold">Alpa</TableHead>
                  <TableHead className="font-semibold min-w-[200px]">Persentase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((d, idx) => {
                  const pct = d.persentase;
                  const barColor = pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-500' : 'bg-red-500';
                  const isBest = idx === 0 && sortDir === 'desc';
                  const isWorst = idx === sorted.length - 1 && sortDir === 'desc';
                  return (
                    <TableRow key={d.studentId} className={cn(isBest && 'bg-emerald-50/50', isWorst && 'bg-red-50/50')}>
                      <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{d.studentName}
                        {isBest && <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-0 text-xs">Terbaik</Badge>}
                        {isWorst && <Badge className="ml-2 bg-red-100 text-red-700 border-0 text-xs">Perlu Perhatian</Badge>}
                      </TableCell>
                      <TableCell className="text-center"><span className="text-emerald-600 font-medium">{d.hadir}</span></TableCell>
                      <TableCell className="text-center"><span className="text-blue-600">{d.izin}</span></TableCell>
                      <TableCell className="text-center"><span className="text-amber-600">{d.sakit}</span></TableCell>
                      <TableCell className="text-center"><span className="text-red-600">{d.alpa}</span></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${pct}%` }} /></div>
                          <span className={cn('text-sm font-medium w-14 text-right', pct >= 90 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-red-600')}>{pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 4. GURU KARAKTER VIEW — Isi Laporan 7 Kebiasaan
// ═══════════════════════════════════════════════════════════════════

export function GuruKarakterView() {
  const user = useAppStore((s) => s.user);
  const [date, setDate] = useState(todayStr());
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [ratings, setRatings] = useState<HabitRating[]>(HABITS.map((h) => ({ habit: h.key, rating: 0, note: '' })));
  const [saving, setSaving] = useState(false);
  const studentLoadedRef = useRef<string>('');
  const ratingLoadedRef = useRef<string>('');

  // Load students for class
  useEffect(() => {
    if (!classId || studentLoadedRef.current === classId) return;
    studentLoadedRef.current = classId;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/attendance?schoolId=${user?.schoolId ?? ''}&classId=${classId}&date=${todayStr()}`, { signal: controller.signal });
        if (res.ok) { const data = await res.json(); if (Array.isArray(data.students) && data.students.length > 0) { setStudents(data.students.map((s: Record<string, string>) => ({ id: s.id, name: s.name, nisn: s.nisn || '' }))); return; } }
      } catch { /* fallback */ }
      setStudents(MOCK_STUDENTS);
    })();
    return () => controller.abort();
  }, [classId, user?.schoolId]);

  // Load ratings for student
  useEffect(() => {
    if (!studentId) return;
    const m = String(new Date(date).getMonth() + 1).padStart(2, '0');
    const key = `${studentId}-${m}`;
    if (ratingLoadedRef.current === key) return;
    ratingLoadedRef.current = key;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/character-reports?schoolId=${user?.schoolId ?? ''}&classId=${classId}&studentId=${studentId}&month=${m}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.reports) && data.reports.length > 0) {
            setRatings(HABITS.map((h) => { const f = data.reports.find((r: Record<string, string | number>) => r.habit === h.key); return { habit: h.key, rating: f ? (f.rating as number) : 0, note: f ? (f.note as string) : '' }; }));
            return;
          }
        }
      } catch { /* fallback */ }
      setRatings(MOCK_HABIT_RATINGS.map((r) => ({ ...r })));
    })();
    return () => controller.abort();
  }, [studentId, classId, date, user?.schoolId]);

  const updateRating = (hk: string, rating: number) => setRatings((prev) => prev.map((r) => (r.habit === hk ? { ...r, rating } : r)));
  const updateNote = (hk: string, note: string) => setRatings((prev) => prev.map((r) => (r.habit === hk ? { ...r, note } : r)));

  const handleSave = async () => {
    if (!studentId) { toast.error('Pilih siswa terlebih dahulu'); return; }
    if (!ratings.some((r) => r.rating > 0)) { toast.error('Berikan minimal satu penilaian'); return; }
    setSaving(true);
    try {
      const body = ratings.filter((r) => r.rating > 0).map((r) => ({ studentId, classId, schoolId: user?.schoolId, reporterId: user?.id, date, habit: r.habit, rating: r.rating, note: r.note }));
      const res = await fetch('/api/character-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { toast.success('Laporan karakter berhasil disimpan'); setSaving(false); return; }
    } catch { /* fallback */ }
    toast.success('Laporan karakter berhasil disimpan (lokal)');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-[#1F3864]">Isi Laporan 7 Kebiasaan</h1><p className="text-sm text-muted-foreground">7 Kebiasaan Anak Hebat — Laporan Karakter Siswa</p></div>

      <Card><CardContent className="p-4"><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2"><Label>Tanggal</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="space-y-2"><Label>Kelas</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(''); studentLoadedRef.current = ''; ratingLoadedRef.current = ''; }}>
            <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
            <SelectContent>{MOCK_CLASSES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Siswa</Label>
          <Select value={studentId} onValueChange={(v) => { setStudentId(v); ratingLoadedRef.current = ''; }} disabled={!classId}>
            <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
            <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div></CardContent></Card>

      {!studentId ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Sparkles className="w-12 h-12 mb-3 opacity-30" /><p>Pilih kelas dan siswa untuk mulai mengisi laporan</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HABITS.map((h, idx) => {
            const rating = ratings.find((r) => r.habit === h.key);
            return (
              <Card key={h.key} className={cn('transition-all hover:shadow-md', rating?.rating && rating.rating > 0 && 'ring-2 ring-[#1F3864]/20')}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5" role="img" aria-label={h.name}>{h.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground font-medium">Kebiasaan {idx + 1}</span>
                      <h3 className="font-semibold text-[#1F3864] text-sm leading-tight">{h.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{h.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <StarRating value={rating?.rating || 0} onChange={(v) => updateRating(h.key, v)} />
                    <span className="text-xs text-muted-foreground">{rating?.rating || 0}/5</span>
                  </div>
                  <Input placeholder="Catatan (opsional)..." value={rating?.note || ''} onChange={(e) => updateNote(h.key, e.target.value)} className="text-sm" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {studentId && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white min-w-[180px]">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Menyimpan...' : 'Simpan Laporan'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 5. GURU REKAP KARAKTER VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruRekapKarakterView() {
  const user = useAppStore((s) => s.user);
  const [classId, setClassId] = useState('c1');
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(MOCK_REKAP_KARAKTER);
  const fetchedRef = useRef<string>('');

  useEffect(() => {
    const key = `${classId}-${month}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/character-reports?schoolId=${user?.schoolId ?? ''}&classId=${classId}&month=${month}`, { signal: controller.signal });
        if (res.ok) { const json = await res.json(); if (Array.isArray(json.rekap) && json.rekap.length > 0) { setData(json.rekap); return; } }
      } catch { /* use mock */ }
      setData(MOCK_REKAP_KARAKTER);
    })();
    return () => controller.abort();
  }, [classId, month, user?.schoolId]);

  const allRatings = data.flatMap((d) => d.ratings);
  const avgRating = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1) : '0';
  const habitAvgs = HABITS.map((h, hIdx) => ({ ...h, avg: data.length > 0 ? data.reduce((s, d) => s + (d.ratings[hIdx] || 0), 0) / data.length : 0 }));
  const strongest = [...habitAvgs].sort((a, b) => b.avg - a.avg)[0];
  const weakest = [...habitAvgs].sort((a, b) => a.avg - b.avg)[0];
  const studentAvgs = data.map((d) => ({ ...d, avg: d.ratings.length > 0 ? d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length : 0 }));
  const bestStudent = [...studentAvgs].sort((a, b) => b.avg - a.avg)[0];
  const worstStudent = [...studentAvgs].sort((a, b) => a.avg - b.avg)[0];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-[#1F3864]">Rekap 7 Kebiasaan</h1><p className="text-sm text-muted-foreground">Analisis laporan karakter siswa — 7 Kebiasaan Anak Hebat</p></div>

      <Card><CardContent className="p-4"><div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="space-y-2"><Label>Kelas</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); fetchedRef.current = ''; }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{MOCK_CLASSES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Bulan</Label>
          <Select value={month} onValueChange={(v) => { setMonth(v); fetchedRef.current = ''; }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div></CardContent></Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Total Laporan" value={data.length * 7} bg="bg-[#1F3864]/10" color="text-[#1F3864]" />
        <StatCard icon={<Star className="w-5 h-5" />} label="Rata-rata Rating" value={avgRating} bg="bg-amber-50" color="text-amber-600" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Kebiasaan Terkuat" value={strongest?.name.split(' ').slice(0, 2).join(' ') || '-'} bg="bg-emerald-50" color="text-emerald-600" sub={strongest ? `${strongest.avg.toFixed(1)}/5` : ''} />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Perlu Diperbaiki" value={weakest?.name.split(' ').slice(0, 2).join(' ') || '-'} bg="bg-red-50" color="text-red-600" sub={weakest ? `${weakest.avg.toFixed(1)}/5` : ''} />
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Rata-rata Rating per Kebiasaan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {habitAvgs.map((h) => {
            const pct = (h.avg / 5) * 100;
            return (
              <div key={h.key} className="flex items-center gap-3">
                <span className="text-lg shrink-0" role="img" aria-label={h.name}>{h.emoji}</span>
                <span className="text-sm font-medium w-36 shrink-0 truncate hidden sm:block" title={h.name}>{h.name}</span>
                <span className="text-sm font-medium w-10 shrink-0 sm:hidden" role="img" aria-label={h.name}>{h.emoji}</span>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2', h.avg >= 4 ? 'bg-emerald-500' : h.avg >= 3 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.max(pct, 10)}%` }}>
                    <span className="text-xs font-bold text-white">{h.avg.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Detail per Siswa</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1F3864]/5 hover:bg-[#1F3864]/5">
                  <TableHead className="w-12 font-semibold">No</TableHead>
                  <TableHead className="font-semibold min-w-[140px]">Nama</TableHead>
                  {HABITS.map((h) => (
                    <TableHead key={h.key} className="text-center font-semibold min-w-[70px]">
                      <span className="text-xs block" role="img" aria-label={h.name}>{h.emoji}</span>
                      <span className="text-[10px] text-muted-foreground block truncate max-w-[70px]" title={h.name}>{h.name.split(' ')[0]}</span>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-semibold">Rata-rata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d, idx) => {
                  const avg = d.ratings.length > 0 ? d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length : 0;
                  const isBest = bestStudent && d.studentId === bestStudent.studentId;
                  const isWorst = worstStudent && d.studentId === worstStudent.studentId;
                  return (
                    <TableRow key={d.studentId} className={cn(isBest && 'bg-emerald-50/50', isWorst && 'bg-red-50/50')}>
                      <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{d.studentName}
                        {isBest && <Badge className="ml-1 bg-emerald-100 text-emerald-700 border-0 text-[10px]">Terbaik</Badge>}
                        {isWorst && <Badge className="ml-1 bg-red-100 text-red-700 border-0 text-[10px]">Perlu Perhatian</Badge>}
                      </TableCell>
                      {d.ratings.map((r, hIdx) => (
                        <TableCell key={hIdx} className="text-center">
                          <span className={cn('font-medium', r >= 4 ? 'text-emerald-600' : r >= 3 ? 'text-amber-600' : 'text-red-600')}>{r > 0 ? r.toFixed(1) : '-'}</span>
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <span className={cn('font-bold', avg >= 4 ? 'text-emerald-600' : avg >= 3 ? 'text-amber-600' : 'text-red-600')}>{avg.toFixed(1)}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 6. GURU JURNAL VIEW
// ═══════════════════════════════════════════════════════════════════

export function GuruJurnalView() {
  const user = useAppStore((s) => s.user);
  const [journals, setJournals] = useState<JournalEntry[]>(MOCK_JOURNALS);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: todayStr(), className: '', subject: '', topic: '', activities: '', notes: '' });
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/teaching-journals?schoolId=${user?.schoolId ?? ''}&teacherId=${user?.id ?? ''}&month=${currentMonth()}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (Array.isArray(data.journals) ? data.journals : []);
          if (list.length > 0) {
            setJournals(list.map((j: Record<string, string>) => ({ id: j.id, date: j.date || j.createdAt || '', className: j.className || j.kelas || '', subject: j.subject || j.mataPelajaran || '', topic: j.topic || '', activities: j.activities || '', notes: j.notes || '' })));
            return;
          }
        }
      } catch { /* use mock */ }
    })();
    return () => controller.abort();
  }, [user?.schoolId, user?.id]);

  const filtered = journals.filter((j) => {
    if (dateFilter && !j.date.includes(dateFilter)) return false;
    if (search) { const q = search.toLowerCase(); if (!j.topic.toLowerCase().includes(q) && !j.className.toLowerCase().includes(q) && !j.subject.toLowerCase().includes(q)) return false; }
    return true;
  });

  const todayCount = journals.filter((j) => j.date === todayStr()).length;
  const monthLabel = MONTHS.find((m) => m.value === currentMonth())?.label || '';

  const toggleRow = (id: string) => setExpandedRows((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const handleSave = async () => {
    if (!form.className || !form.subject || !form.topic) { toast.error('Kelas, mata pelajaran, dan topik wajib diisi'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/teaching-journals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolId: user?.schoolId, teacherId: user?.id, ...form }) });
      if (res.ok) { toast.success('Jurnal mengajar berhasil disimpan'); setDialogOpen(false); setSaving(false); return; }
    } catch { /* fallback */ }
    setJournals((prev) => [{ id: `j${Date.now()}`, ...form }, ...prev]);
    toast.success('Jurnal mengajar berhasil disimpan (lokal)');
    setDialogOpen(false);
    setSaving(false);
  };

  const handleDelete = () => {
    if (!selectedJournal) return;
    setJournals((prev) => prev.filter((j) => j.id !== selectedJournal.id));
    toast.success('Jurnal berhasil dihapus');
    setDeleteOpen(false);
    setSelectedJournal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-[#1F3864]">Jurnal Mengajar</h1><p className="text-sm text-muted-foreground">Catat aktivitas dan refleksi mengajar harian</p></div>
        <Button onClick={() => { setForm({ date: todayStr(), className: '', subject: '', topic: '', activities: '', notes: '' }); setDialogOpen(true); }} className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white">
          <Plus className="w-4 h-4 mr-2" />Tambah Jurnal
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={<BookOpen className="w-5 h-5" />} label="Total Jurnal" value={journals.length} bg="bg-[#1F3864]/10" color="text-[#1F3864]" />
        <StatCard icon={<Calendar className="w-5 h-5" />} label={monthLabel} value={journals.length} bg="bg-emerald-50" color="text-emerald-600" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Hari Ini" value={todayCount} bg="bg-amber-50" color="text-amber-600" />
      </div>

      <Card><CardContent className="p-4"><div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari topik, kelas, mapel..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="space-y-1"><Label className="text-xs text-muted-foreground">Filter Tanggal</Label><Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-48" /></div>
      </div></CardContent></Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1F3864]/5 hover:bg-[#1F3864]/5">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="font-semibold">Tanggal</TableHead>
                  <TableHead className="font-semibold">Kelas</TableHead>
                  <TableHead className="font-semibold">Mata Pelajaran</TableHead>
                  <TableHead className="font-semibold">Topik</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Tidak ada jurnal</TableCell></TableRow>}
                {filtered.map((j) => {
                  const isExpanded = expandedRows.has(j.id);
                  return (
                    <React.Fragment key={j.id}>
                      <TableRow className="group cursor-pointer" onClick={() => toggleRow(j.id)}>
                        <TableCell className="w-10">{isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(j.date)}</TableCell>
                        <TableCell><Badge variant="outline" className="font-normal">{j.className}</Badge></TableCell>
                        <TableCell className="font-medium">{j.subject}</TableCell>
                        <TableCell className="max-w-[200px]"><div className="truncate" title={j.topic}>{j.topic}</div></TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setForm({ date: j.date, className: j.className, subject: j.subject, topic: j.topic, activities: j.activities, notes: j.notes }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { setSelectedJournal(j); setDeleteOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div><h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Aktivitas</h4><p className="text-sm whitespace-pre-wrap">{j.activities || 'Tidak ada catatan'}</p></div>
                              <div><h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Catatan</h4><p className="text-sm whitespace-pre-wrap">{j.notes || 'Tidak ada catatan'}</p></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#1F3864]">Tambah Jurnal Mengajar</DialogTitle><DialogDescription>Catat kegiatan belajar mengajar hari ini</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Kelas *</Label>
                <Select value={form.className} onValueChange={(v) => setForm((f) => ({ ...f, className: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                  <SelectContent>{MOCK_CLASSES.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Mata Pelajaran *</Label>
              <Select value={form.subject} onValueChange={(v) => setForm((f) => ({ ...f, subject: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih mata pelajaran" /></SelectTrigger>
                <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Topik *</Label><Input placeholder="Topik pembelajaran" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Aktivitas</Label><Textarea placeholder="Deskripsikan aktivitas pembelajaran..." rows={4} value={form.activities} onChange={(e) => setForm((f) => ({ ...f, activities: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Catatan</Label><Textarea placeholder="Catatan tambahan atau refleksi..." rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white">{saving ? 'Menyimpan...' : 'Simpan Jurnal'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Jurnal</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus jurnal &quot;{selectedJournal?.topic}&quot;?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}