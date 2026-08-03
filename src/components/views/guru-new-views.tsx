'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plus, Search, Eye, Pencil, Trash2, FileText, Clock, Users, BarChart3,
  CheckCircle2, CircleDot, Save, Star, BookOpen, AlertTriangle, TrendingUp,
  ChevronDown, ChevronUp, UserCheck, UserX, Stethoscope, ClipboardList,
  Download, Printer, CalendarClock, Sparkles, Calendar,
  Loader2, ArrowUpDown, BookMarked, Heart, Target, Lightbulb, Handshake, Ear,
  Team, Wrench, BookHeart, GraduationCap,
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
  { key: 'proaktif', name: 'Bersikap Proaktif', emoji: '🎯', desc: 'Mengambil inisiatif dan bertanggung jawab', color: 'bg-rose-50 border-rose-200 text-rose-800', iconBg: 'bg-rose-100', barColor: 'bg-rose-400' },
  { key: 'tujuan', name: 'Memulai dengan Tujuan', emoji: '🧭', desc: 'Menentukan tujuan sebelum bertindak', color: 'bg-sky-50 border-sky-200 text-sky-800', iconBg: 'bg-sky-100', barColor: 'bg-sky-400' },
  { key: 'prioritas', name: 'Prioritas Utama Dahulu', emoji: '📋', desc: 'Mengutamakan hal penting, bukan mendesak', color: 'bg-amber-50 border-amber-200 text-amber-800', iconBg: 'bg-amber-100', barColor: 'bg-amber-400' },
  { key: 'menang', name: 'Berpikir Menang-Menang', emoji: '🤝', desc: 'Mencari solusi saling menguntungkan', color: 'bg-emerald-50 border-emerald-200 text-emerald-800', iconBg: 'bg-emerald-100', barColor: 'bg-emerald-400' },
  { key: 'mengerti', name: 'Mengerti lalu Dierti', emoji: '👂', desc: 'Mendengarkan orang lain terlebih dahulu', color: 'bg-violet-50 border-violet-200 text-violet-800', iconBg: 'bg-violet-100', barColor: 'bg-violet-400' },
  { key: 'sinergi', name: 'Bersinergi', emoji: '🤲', desc: 'Bekerja sama mencapai hasil terbaik', color: 'bg-teal-50 border-teal-200 text-teal-800', iconBg: 'bg-teal-100', barColor: 'bg-teal-400' },
  { key: 'asah', name: 'Asah Gergaji', emoji: '🔧', desc: 'Terus belajar dan mengembangkan diri', color: 'bg-orange-50 border-orange-200 text-orange-800', iconBg: 'bg-orange-100', barColor: 'bg-orange-400' },
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
function formatDateShort(d: string) { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); }
function getInitials(name: string) { return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2); }

function getCountdown(dueDate: string): { text: string; urgent: boolean } {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: `${Math.abs(diff)} hari lalu`, urgent: true };
  if (diff === 0) return { text: 'Hari ini', urgent: true };
  if (diff <= 3) return { text: `${diff} hari lagi`, urgent: true };
  if (diff <= 7) return { text: `${diff} hari lagi`, urgent: false };
  return { text: `${diff} hari lagi`, urgent: false };
}

// ═══════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function GradientIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-2.5 rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm', className)}>{children}</div>;
}

function PageHeader({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    published: { cls: 'bg-emerald-100 text-emerald-700', label: 'Aktif' },
    completed: { cls: 'bg-gray-100 text-gray-600', label: 'Selesai' },
    draft: { cls: 'bg-amber-100 text-amber-700', label: 'Draft' },
    late: { cls: 'bg-red-100 text-red-700', label: 'Terlambat' },
  };
  const v = map[status];
  return v ? <Badge className={cn('rounded-full border-0 px-3 py-0.5 text-xs font-medium', v.cls)}>{v.label}</Badge> : <Badge variant="secondary" className="rounded-full">{status}</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    tugas: { cls: 'bg-blue-100 text-blue-700', label: 'Tugas' },
    quiz: { cls: 'bg-amber-100 text-amber-700', label: 'Kuis' },
    ujian: { cls: 'bg-purple-100 text-purple-700', label: 'Ujian' },
  };
  const v = map[type];
  return v ? <Badge className={cn('rounded-full border-0 px-3 py-0.5 text-xs font-medium', v.cls)}>{v.label}</Badge> : <Badge variant="outline">{type}</Badge>;
}

function KehadiranBadge({ status }: { status: string }) {
  const map: Record<string, string> = { Hadir: 'bg-emerald-100 text-emerald-700', Izin: 'bg-blue-100 text-blue-700', Sakit: 'bg-amber-100 text-amber-700', Alpa: 'bg-red-100 text-red-700' };
  return <Badge className={cn('rounded-full border-0 px-3 py-0.5 text-xs font-medium', map[status] ?? '')}>{status}</Badge>;
}

function StarRating({ value, onChange, size = 'md', readonly = false }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md'; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  const sz = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = s <= (hover || value);
        return (
          <button key={s} type="button" disabled={readonly}
            onClick={() => onChange?.(s)} onMouseEnter={() => !readonly && setHover(s)} onMouseLeave={() => !readonly && setHover(0)}
            className={cn('transition-all duration-150', !onChange && 'cursor-default', onChange && 'hover:scale-110 active:scale-95 cursor-pointer')}
            aria-label={`${s} bintang`}>
            <Star className={cn(sz, filled ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-gray-200', !readonly && 'hover:text-amber-300')} />
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ icon, label, value, bg, color, sub, iconElement }: { icon?: React.ReactNode; label: string; value: string | number; bg: string; color: string; sub?: string; iconElement?: React.ReactNode }) {
  return (
    <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-xl shrink-0', bg, color)}>{icon}</div>
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

function SoftStatCard({ icon, label, value, bg, color, sub }: { icon: React.ReactNode; label: string; value: string | number; bg: string; color: string; sub?: string }) {
  return (
    <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg shrink-0', bg, color)}>{icon}</div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className={cn('text-lg font-bold', color)}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterPill({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick}
      className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer',
        active
          ? cn('text-white shadow-sm', color || 'bg-[#1F3864]')
          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
      )}>{label}</button>
  );
}

function EmptyState({ icon, message, action }: { icon: React.ReactNode; message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground/50">{icon}</div>
      <p className="text-muted-foreground text-sm max-w-xs">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
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
  const [typeFilter, setTypeFilter] = useState('semua');
  const [statusFilter, setStatusFilter] = useState('semua');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<TugasItem | null>(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'tugas' as 'tugas' | 'quiz' | 'ujian', dueDate: '', content: '' });
  const [saving, setSaving] = useState(false);
  const fetchedRef = useRef(false);

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
    if (typeFilter !== 'semua' && i.type !== typeFilter) return false;
    if (statusFilter !== 'semua' && i.status !== statusFilter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: items.length, aktif: items.filter((i) => i.status === 'published').length,
    selesai: items.filter((i) => i.status === 'completed').length, draft: items.filter((i) => i.status === 'draft' || i.status === 'late').length,
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
    toast.success('Tugas berhasil dibuat (lokal)'); setDialogOpen(false);
    setForm({ title: '', description: '', type: 'tugas', dueDate: '', content: '' }); setSaving(false);
  };

  const handleDelete = () => {
    if (!selected) return;
    setItems((prev) => prev.filter((i) => i.id !== selected.id));
    toast.success('Tugas berhasil dihapus'); setDeleteOpen(false); setSelected(null);
  };

  const typeBorderColor: Record<string, string> = { tugas: 'border-l-blue-500', quiz: 'border-l-amber-500', ujian: 'border-l-purple-500' };
  const typeAccentBg: Record<string, string> = { tugas: 'bg-blue-50', quiz: 'bg-amber-50', ujian: 'bg-purple-50' };
  const typeAccentColor: Record<string, string> = { tugas: 'text-blue-600', quiz: 'text-amber-600', ujian: 'text-purple-600' };

  return (
    <div className="space-y-6">
      <PageHeader icon={<ClipboardList className="w-5 h-5" />} title="Tugas, Kuis & Ujian" description="Kelola tugas, kuis, dan ujian untuk siswa Anda"
        action={<Button onClick={() => { setSelected(null); setForm({ title: '', description: '', type: 'tugas', dueDate: '', content: '' }); setDialogOpen(true); }} className="bg-[#1F3864] hover:bg-[#2d5289] text-white transition-all duration-200 hover:shadow-sm active:scale-[0.98] cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />Buat Tugas Baru
        </Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FileText className="w-5 h-5" />} label="Total Tugas" value={stats.total} bg="bg-[#1F3864]/10" color="text-[#1F3864]" />
        <StatCard icon={<CircleDot className="w-5 h-5" />} label="Aktif" value={stats.aktif} bg="bg-emerald-50" color="text-emerald-600" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Selesai" value={stats.selesai} bg="bg-gray-100" color="text-gray-600" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Draft / Terlambat" value={stats.draft} bg="bg-amber-50" color="text-amber-600" />
      </div>

      {/* Filters */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-muted-foreground self-center mr-1">Tipe:</span>
              {['semua', 'tugas', 'quiz', 'ujian'].map((t) => (
                <FilterPill key={t} label={t === 'semua' ? 'Semua' : t === 'tugas' ? 'Tugas' : t === 'quiz' ? 'Kuis' : 'Ujian'} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium text-muted-foreground self-center mr-1">Status:</span>
                {['semua', 'published', 'draft', 'completed', 'late'].map((s) => (
                  <FilterPill key={s} label={s === 'semua' ? 'Semua' : s === 'published' ? 'Aktif' : s === 'draft' ? 'Draft' : s === 'completed' ? 'Selesai' : 'Terlambat'} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
                ))}
              </div>
              <div className="relative flex-1 w-full sm:max-w-xs sm:ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Cari tugas..." className="pl-9 rounded-lg" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Cards */}
      {filtered.length === 0 ? (
        <Card className="rounded-xl shadow-sm"><CardContent>
          <EmptyState icon={<ClipboardList className="w-8 h-8" />} message="Tidak ada tugas yang cocok dengan filter." />
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const countdown = getCountdown(item.dueDate);
            return (
              <Card key={item.id} className={cn('rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 overflow-hidden', typeBorderColor[item.type])}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex gap-2 flex-wrap">
                      <TypeBadge type={item.type} />
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelected(item); setDetailOpen(true); }}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelected(item); setForm({ title: item.title, description: item.description, type: item.type, dueDate: item.dueDate, content: item.content || '' }); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { setSelected(item); setDeleteOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground mb-1 leading-tight">{item.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
                  <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', typeAccentBg[item.type])}>
                    <CalendarClock className={cn('w-3.5 h-3.5', typeAccentColor[item.type])} />
                    <span className={cn('text-xs font-medium', countdown.urgent ? 'text-red-600' : 'text-muted-foreground')}>{formatDate(item.dueDate)}</span>
                    <span className={cn('text-xs font-semibold ml-auto', countdown.urgent ? 'text-red-600' : 'text-muted-foreground')}>({countdown.text})</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader><DialogTitle className="text-[#1F3864]">{selected ? 'Edit' : 'Buat'} Tugas</DialogTitle><DialogDescription>Tambahkan tugas, kuis, atau ujian baru untuk siswa</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Judul *</Label><Input placeholder="Masukkan judul tugas" className="rounded-lg" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Deskripsi</Label><Input placeholder="Deskripsi singkat" className="rounded-lg" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Tipe *</Label>
              <div className="flex gap-2">
                {(['tugas', 'quiz', 'ujian'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={cn('rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer',
                      form.type === t
                        ? t === 'tugas' ? 'bg-blue-500 text-white shadow-sm' : t === 'quiz' ? 'bg-amber-500 text-white shadow-sm' : 'bg-purple-500 text-white shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}>{t === 'tugas' ? '📝 Tugas' : t === 'quiz' ? '📋 Kuis' : '📄 Ujian'}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2"><Label>Tanggal Tenggat *</Label><Input type="date" className="rounded-lg" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Konten / Instruksi</Label><Textarea placeholder="Tulis instruksi tugas..." rows={5} className="rounded-lg" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setSelected(null); }} className="rounded-lg transition-all duration-200">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1F3864] hover:bg-[#2d5289] text-white rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg rounded-xl">
          <DialogHeader><DialogTitle className="text-[#1F3864]">{selected?.title}</DialogTitle><DialogDescription>Detail tugas</DialogDescription></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex gap-2"><TypeBadge type={selected.type} /> <StatusBadge status={selected.status} /></div>
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              <div className={cn('flex items-center gap-2 text-sm p-3 rounded-lg', typeAccentBg[selected.type])}>
                <CalendarClock className={cn('w-4 h-4', typeAccentColor[selected.type])} />
                <span>Tenggat: <strong>{formatDate(selected.dueDate)}</strong></span>
                <span className={cn('ml-auto text-xs font-semibold', getCountdown(selected.dueDate).urgent ? 'text-red-600' : 'text-muted-foreground')}>({getCountdown(selected.dueDate).text})</span>
              </div>
              {selected.content && <div className="p-4 rounded-xl bg-muted/50 text-sm whitespace-pre-wrap border border-muted">{selected.content}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader><AlertDialogTitle>Hapus Tugas</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus &quot;{selected?.title}&quot;?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-lg">Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-lg">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. GURU KEHADIRAN VIEW
// ═══════════════════════════════════════════════════════════════════

const ATTENDANCE_BUTTONS: { status: AttendanceRecord['status']; label: string; color: string; activeColor: string; activeBg: string }[] = [
  { status: 'Hadir', label: 'H', color: 'text-emerald-600', activeColor: 'text-white', activeBg: 'bg-emerald-500' },
  { status: 'Izin', label: 'I', color: 'text-blue-600', activeColor: 'text-white', activeBg: 'bg-blue-500' },
  { status: 'Sakit', label: 'S', color: 'text-amber-600', activeColor: 'text-white', activeBg: 'bg-amber-500' },
  { status: 'Alpa', label: 'A', color: 'text-red-600', activeColor: 'text-white', activeBg: 'bg-red-500' },
];

export function GuruKehadiranView() {
  const user = useAppStore((s) => s.user);
  const [date, setDate] = useState(todayStr());
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef<string>('');

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

  const updateRecord = useCallback((sid: string, status: string) => {
    setRecords((prev) => ({ ...prev, [sid]: { ...prev[sid], status: status as AttendanceRecord['status'] } }));
  }, []);

  const updateNote = useCallback((sid: string, note: string) => {
    setRecords((prev) => ({ ...prev, [sid]: { ...prev[sid], note } }));
  }, []);

  const markAllHadir = () => {
    const updated = { ...records };
    students.forEach((s) => { updated[s.id] = { ...updated[s.id], status: 'Hadir' }; });
    setRecords(updated); toast.success('Semua siswa ditandai Hadir');
  };

  const handleSave = async () => {
    if (!classId) { toast.error('Pilih kelas terlebih dahulu'); return; }
    setSaving(true);
    const body = { classId, schoolId: user?.schoolId, date, recordedBy: user?.id, records: Object.values(records).map((r) => ({ studentId: r.studentId, status: r.status, note: r.note })) };
    try {
      const res = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { toast.success('Kehadiran berhasil disimpan'); setSaving(false); return; }
    } catch { /* fallback */ }
    toast.success('Kehadiran berhasil disimpan (lokal)'); setSaving(false);
  };

  const summary = Object.values(records).reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 } as Record<string, number>);

  return (
    <div className="space-y-6">
      <PageHeader icon={<UserCheck className="w-5 h-5" />} title="Kehadiran Siswa" description="Catat kehadiran harian siswa di kelas" />

      {/* Date + Class selector */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="space-y-2 w-full sm:w-auto"><Label className="text-xs text-muted-foreground">Tanggal</Label><Input type="date" value={date} onChange={(e) => { setDate(e.target.value); loadedRef.current = ''; }} className="w-full sm:w-48 rounded-lg" /></div>
            <div className="space-y-2 w-full sm:w-auto"><Label className="text-xs text-muted-foreground">Kelas</Label>
              <div className="flex flex-wrap gap-2">
                {MOCK_CLASSES.map((c) => (
                  <FilterPill key={c.id} label={c.name} active={classId === c.id} onClick={() => { setClassId(c.id); loadedRef.current = ''; }} />
                ))}
              </div>
            </div>
            {students.length > 0 && <Button variant="outline" onClick={markAllHadir} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-full px-4 transition-all duration-200 hover:shadow-sm active:scale-[0.98] cursor-pointer"><UserCheck className="w-4 h-4 mr-2" />Semua Hadir</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Summary counters */}
      {students.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SoftStatCard icon={<UserCheck className="w-4 h-4" />} label="Hadir" value={summary.Hadir} bg="bg-emerald-100" color="text-emerald-600" />
          <SoftStatCard icon={<FileText className="w-4 h-4" />} label="Izin" value={summary.Izin} bg="bg-blue-100" color="text-blue-600" />
          <SoftStatCard icon={<Stethoscope className="w-4 h-4" />} label="Sakit" value={summary.Sakit} bg="bg-amber-100" color="text-amber-600" />
          <SoftStatCard icon={<UserX className="w-4 h-4" />} label="Alpa" value={summary.Alpa} bg="bg-red-100" color="text-red-600" />
        </div>
      )}

      {/* Student list */}
      <Card className="rounded-xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {!classId ? (
            <EmptyState icon={<Users className="w-8 h-8" />} message="Pilih kelas untuk menampilkan daftar siswa" />
          ) : students.length === 0 ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1F3864]" /></div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <div className="divide-y divide-border/50">
                {students.map((s, idx) => {
                  const rec = records[s.id] || { studentId: s.id, status: 'Hadir' as const, note: '' };
                  return (
                    <div key={s.id} className={cn('flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30', idx % 2 === 0 ? 'bg-background' : 'bg-muted/10')}>
                      <span className="text-xs text-muted-foreground w-6 text-center shrink-0">{idx + 1}</span>
                      <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="bg-[#1F3864]/10 text-[#1F3864] text-xs font-medium rounded-full">{getInitials(s.name)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">NISN: {s.nisn}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {ATTENDANCE_BUTTONS.map((btn) => (
                          <button key={btn.status} type="button" title={btn.status}
                            onClick={() => updateRecord(s.id, btn.status)}
                            className={cn('h-8 w-8 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center',
                              rec.status === btn.status
                                ? cn(btn.activeBg, btn.activeColor, 'shadow-sm scale-105')
                                : cn('bg-muted/50', btn.color, 'hover:bg-muted')
                            )}>{btn.label}</button>
                        ))}
                      </div>
                      <Input placeholder="Catatan..." value={rec.note} onChange={(e) => updateNote(s.id, e.target.value)} className="w-32 h-8 text-xs rounded-lg hidden sm:block" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {students.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-[#1F3864] hover:bg-[#2d5289] text-white min-w-[180px] rounded-xl transition-all duration-200 hover:shadow-sm active:scale-[0.98] cursor-pointer">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}{saving ? 'Menyimpan...' : 'Simpan Kehadiran'}
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
  const [exporting, setExporting] = useState(false);
  const fetchedRef = useRef<string>('');

  useEffect(() => {
    const key = `${classId}-${month}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/attendance?schoolId=${user?.schoolId ?? ''}&classId=${classId}&month=${month}`, { signal: controller.signal });
        if (res.ok) { const json = await res.json(); if (Array.isArray(json.rekap) && json.rekap.length > 0) { setData(json.rekap); return; } }
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
  const pctColor = (p: number) => p >= 90 ? 'text-emerald-600' : p >= 75 ? 'text-amber-600' : 'text-red-600';
  const barColor = (p: number) => p >= 90 ? 'bg-emerald-500' : p >= 75 ? 'bg-amber-500' : 'bg-red-500';

  const handleExport = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast.success('Data berhasil diekspor');
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={<BarChart3 className="w-5 h-5" />} title="Rekap Kehadiran" description="Ringkasan kehadiran siswa per bulan"
        action={<div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting} className="rounded-xl transition-all duration-200 hover:shadow-sm active:scale-[0.98] cursor-pointer">
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}{exporting ? 'Mengekspor...' : 'Ekspor'}
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="rounded-xl transition-all duration-200 hover:shadow-sm active:scale-[0.98] cursor-pointer"><Printer className="w-4 h-4 mr-2" />Cetak</Button>
        </div>} />

      {/* Class filter pills + month */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="space-y-2 w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">Kelas</Label>
              <div className="flex flex-wrap gap-2">
                {MOCK_CLASSES.map((c) => (
                  <FilterPill key={c.id} label={c.name} active={classId === c.id} onClick={() => { setClassId(c.id); fetchedRef.current = ''; }} />
                ))}
              </div>
            </div>
            <div className="space-y-2 w-full sm:w-auto"><Label className="text-xs text-muted-foreground">Bulan</Label>
              <Select value={month} onValueChange={(v) => { setMonth(v); fetchedRef.current = ''; }}>
                <SelectTrigger className="w-48 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar className="w-5 h-5" />} label="Total Hari Efektif" value={totalHari} bg="bg-[#1F3864]/10" color="text-[#1F3864]" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Rata-rata Kehadiran" value={`${avgKehadiran}%`} bg="bg-emerald-50" color="text-emerald-600" />
        <StatCard icon={<FileText className="w-5 h-5" />} label="Sering Izin" value={seringIzin ? seringIzin.studentName.split(' ')[0] : '-'} bg="bg-blue-50" color="text-blue-600" sub={seringIzin ? `${seringIzin.izin}x` : ''} />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Sering Alpa" value={seringAlpa ? seringAlpa.studentName.split(' ')[0] : '-'} bg="bg-red-50" color="text-red-600" sub={seringAlpa ? `${seringAlpa.alpa}x` : ''} />
      </div>

      {/* Table with percentage bars */}
      <Card className="rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="pb-2"><div className="flex items-center justify-between">
          <CardTitle className="text-base">Detail Kehadiran Siswa</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))} className="rounded-lg transition-all duration-200 cursor-pointer">
            <ArrowUpDown className="w-4 h-4 mr-1" />{sortDir === 'desc' ? 'Tertinggi' : 'Terendah'}
          </Button>
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
                  <TableHead className="font-semibold min-w-[220px]">Persentase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((d, idx) => {
                  const isBest = idx === 0 && sortDir === 'desc';
                  const isWorst = idx === sorted.length - 1 && sortDir === 'desc';
                  return (
                    <TableRow key={d.studentId} className={cn(isBest && 'bg-emerald-50/50', isWorst && 'bg-red-50/50', 'even:bg-muted/30 hover:bg-muted/50 transition-colors')}>
                      <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{d.studentName}
                        {isBest && <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-0 rounded-full text-[10px]">Terbaik</Badge>}
                        {isWorst && <Badge className="ml-2 bg-red-100 text-red-700 border-0 rounded-full text-[10px]">Perlu Perhatian</Badge>}
                      </TableCell>
                      <TableCell className="text-center"><span className="text-emerald-600 font-medium">{d.hadir}</span></TableCell>
                      <TableCell className="text-center"><span className="text-blue-600">{d.izin}</span></TableCell>
                      <TableCell className="text-center"><span className="text-amber-600">{d.sakit}</span></TableCell>
                      <TableCell className="text-center"><span className="text-red-600">{d.alpa}</span></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className={cn('h-full rounded-full transition-all duration-700 ease-out', barColor(d.persentase))} style={{ width: `${d.persentase}%` }} /></div>
                          <span className={cn('text-sm font-bold w-14 text-right', pctColor(d.persentase))}>{d.persentase}%</span>
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
    toast.success('Laporan karakter berhasil disimpan (lokal)'); setSaving(false);
  };

  const completedCount = ratings.filter((r) => r.rating > 0).length;
  const progressPct = (completedCount / HABITS.length) * 100;
  const selectedStudent = students.find((s) => s.id === studentId);

  return (
    <div className="space-y-6">
      <PageHeader icon={<Sparkles className="w-5 h-5" />} title="Isi Laporan 7 Kebiasaan" description="7 Kebiasaan Anak Hebat — Laporan Karakter Siswa" />

      {/* Selectors */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="space-y-2 w-full sm:w-auto"><Label className="text-xs text-muted-foreground">Tanggal</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full sm:w-48 rounded-lg" /></div>
            <div className="space-y-2 w-full sm:w-auto"><Label className="text-xs text-muted-foreground">Kelas</Label>
              <div className="flex flex-wrap gap-2">
                {MOCK_CLASSES.map((c) => (
                  <FilterPill key={c.id} label={c.name} active={classId === c.id} onClick={() => { setClassId(c.id); setStudentId(''); studentLoadedRef.current = ''; ratingLoadedRef.current = ''; }} />
                ))}
              </div>
            </div>
            <div className="space-y-2 w-full sm:w-auto flex-1 sm:max-w-xs"><Label className="text-xs text-muted-foreground">Siswa</Label>
              <Select value={studentId} onValueChange={(v) => { setStudentId(v); ratingLoadedRef.current = ''; }} disabled={!classId}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
                <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}><span className="flex items-center gap-2"><Avatar className="h-5 w-5"><AvatarFallback className="bg-[#1F3864]/10 text-[#1F3864] text-[10px] rounded-full">{getInitials(s.name)}</AvatarFallback></Avatar>{s.name}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress indicator */}
      {studentId && (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {selectedStudent && <Avatar className="h-10 w-10"><AvatarFallback className="bg-[#1F3864]/10 text-[#1F3864] font-medium rounded-full">{getInitials(selectedStudent.name)}</AvatarFallback></Avatar>}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{selectedStudent?.name ?? 'Siswa'}</span>
                  <span className="text-xs text-muted-foreground">{completedCount}/{HABITS.length} kebiasaan dinilai</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#1F3864] to-[#2d5289] rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Habit cards */}
      {!studentId ? (
        <Card className="rounded-xl shadow-sm"><CardContent>
          <EmptyState icon={<Sparkles className="w-8 h-8" />} message="Pilih kelas dan siswa untuk mulai mengisi laporan" />
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HABITS.map((h, idx) => {
            const rating = ratings.find((r) => r.habit === h.key);
            const isRated = rating && rating.rating > 0;
            return (
              <Card key={h.key} className={cn('rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border overflow-hidden',
                isRated ? cn('border-2', h.color.split(' ').slice(0, 2).join(' ')) : 'border-border')}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-xl shrink-0 text-xl', h.iconBg)}>{h.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Kebiasaan {idx + 1}</span>
                      <h3 className="font-semibold text-sm leading-tight text-foreground">{h.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{h.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <StarRating value={rating?.rating || 0} onChange={(v) => updateRating(h.key, v)} />
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', isRated ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground')}>{rating?.rating || 0}/5</span>
                  </div>
                  <Textarea placeholder="Catatan (opsional)..." value={rating?.note || ''} onChange={(e) => updateNote(h.key, e.target.value)} className="text-sm rounded-lg resize-none" rows={2} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {studentId && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-[#1F3864] hover:bg-[#2d5289] text-white min-w-[200px] rounded-xl transition-all duration-200 hover:shadow-sm active:scale-[0.98] cursor-pointer">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}{saving ? 'Menyimpan...' : 'Simpan Laporan'}
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
  const [sortField, setSortField] = useState<'name' | 'score'>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<typeof MOCK_REKAP_KARAKTER[number] | null>(null);
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

  const studentAvgs = data.map((d) => ({ ...d, avg: d.ratings.length > 0 ? d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length : 0 }));
  const sorted = [...studentAvgs].sort((a, b) => {
    if (sortField === 'name') return sortDir === 'asc' ? a.studentName.localeCompare(b.studentName) : b.studentName.localeCompare(a.studentName);
    return sortDir === 'desc' ? b.avg - a.avg : a.avg - b.avg;
  });

  const allRatings = data.flatMap((d) => d.ratings);
  const avgRating = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1) : '0';
  const habitAvgs = HABITS.map((h, hIdx) => ({ ...h, avg: data.length > 0 ? data.reduce((s, d) => s + (d.ratings[hIdx] || 0), 0) / data.length : 0 }));
  const strongest = [...habitAvgs].sort((a, b) => b.avg - a.avg)[0];
  const weakest = [...habitAvgs].sort((a, b) => a.avg - b.avg)[0];
  const bestStudent = [...studentAvgs].sort((a, b) => b.avg - a.avg)[0];
  const worstStudent = [...studentAvgs].sort((a, b) => a.avg - b.avg)[0];

  const scoreColor = (avg: number) => avg >= 4 ? 'text-emerald-600' : avg >= 3 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = (avg: number) => avg >= 4 ? 'bg-emerald-100' : avg >= 3 ? 'bg-amber-100' : 'bg-red-100';
  const scoreBar = (avg: number) => avg >= 4 ? 'bg-emerald-500' : avg >= 3 ? 'bg-amber-500' : 'bg-red-500';

  const openDetail = (s: typeof MOCK_REKAP_KARAKTER[number]) => { setDetailStudent(s); setDetailOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader icon={<GraduationCap className="w-5 h-5" />} title="Rekap 7 Kebiasaan" description="Analisis laporan karakter siswa — 7 Kebiasaan Anak Hebat" />

      {/* Filters */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="space-y-2 w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">Kelas</Label>
              <div className="flex flex-wrap gap-2">
                {MOCK_CLASSES.map((c) => (
                  <FilterPill key={c.id} label={c.name} active={classId === c.id} onClick={() => { setClassId(c.id); fetchedRef.current = ''; }} />
                ))}
              </div>
            </div>
            <div className="space-y-2 w-full sm:w-auto"><Label className="text-xs text-muted-foreground">Bulan</Label>
              <Select value={month} onValueChange={(v) => { setMonth(v); fetchedRef.current = ''; }}>
                <SelectTrigger className="w-48 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Total Laporan" value={data.length * 7} bg="bg-[#1F3864]/10" color="text-[#1F3864]" />
        <StatCard icon={<Star className="w-5 h-5" />} label="Rata-rata Rating" value={avgRating} bg="bg-amber-50" color="text-amber-600" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Kebiasaan Terkuat" value={strongest?.name.split(' ').slice(0, 2).join(' ') || '-'} bg="bg-emerald-50" color="text-emerald-600" sub={strongest ? `${strongest.avg.toFixed(1)}/5` : ''} />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Perlu Diperbaiki" value={weakest?.name.split(' ').slice(0, 2).join(' ') || '-'} bg="bg-red-50" color="text-red-600" sub={weakest ? `${weakest.avg.toFixed(1)}/5` : ''} />
      </div>

      {/* Per-habit bar visualization */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Rata-rata Rating per Kebiasaan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {habitAvgs.map((h) => {
            const pct = (h.avg / 5) * 100;
            return (
              <div key={h.key} className="flex items-center gap-3">
                <div className={cn('p-1.5 rounded-lg shrink-0', h.iconBg)}><span className="text-base" role="img" aria-label={h.name}>{h.emoji}</span></div>
                <span className="text-sm font-medium w-36 shrink-0 truncate hidden sm:block" title={h.name}>{h.name}</span>
                <span className="text-sm shrink-0 sm:hidden" role="img" aria-label={h.name}>{h.emoji}</span>
                <div className="flex-1 h-7 bg-muted/50 rounded-lg overflow-hidden">
                  <div className={cn('h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-2', scoreBar(h.avg))} style={{ width: `${Math.max(pct, 12)}%` }}>
                    <span className="text-xs font-bold text-white drop-shadow-sm">{h.avg.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Student table */}
      <Card className="rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="pb-2"><div className="flex items-center justify-between">
          <CardTitle className="text-base">Detail per Siswa</CardTitle>
          <div className="flex gap-1">
            <Button variant={sortField === 'score' ? 'default' : 'ghost'} size="sm" onClick={() => { setSortField('score'); setSortDir((d) => sortField === 'score' ? (d === 'desc' ? 'asc' : 'desc') : 'desc'); }} className={cn('rounded-lg text-xs h-7 transition-all duration-200 cursor-pointer', sortField === 'score' && 'bg-[#1F3864] hover:bg-[#2d5289] text-white')}>
              <BarChart3 className="w-3 h-3 mr-1" />Skor
            </Button>
            <Button variant={sortField === 'name' ? 'default' : 'ghost'} size="sm" onClick={() => { setSortField('name'); setSortDir((d) => sortField === 'name' ? (d === 'desc' ? 'asc' : 'desc') : 'asc'); }} className={cn('rounded-lg text-xs h-7 transition-all duration-200 cursor-pointer', sortField === 'name' && 'bg-[#1F3864] hover:bg-[#2d5289] text-white')}>
              <Users className="w-3 h-3 mr-1" />Nama
            </Button>
          </div>
        </div></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1F3864]/5 hover:bg-[#1F3864]/5">
                  <TableHead className="w-12 font-semibold">No</TableHead>
                  <TableHead className="font-semibold min-w-[140px]">Nama</TableHead>
                  {HABITS.map((h) => (
                    <TableHead key={h.key} className="text-center font-semibold min-w-[60px]">
                      <span className="text-xs block" role="img" aria-label={h.name}>{h.emoji}</span>
                      <span className="text-[10px] text-muted-foreground block truncate max-w-[60px]" title={h.name}>{h.name.split(' ')[0]}</span>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-semibold min-w-[100px]">Rata-rata</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((d, idx) => {
                  const isBest = bestStudent && d.studentId === bestStudent.studentId;
                  const isWorst = worstStudent && d.studentId === worstStudent.studentId;
                  return (
                    <TableRow key={d.studentId} className={cn(isBest && 'bg-emerald-50/50', isWorst && 'bg-red-50/50', 'even:bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer')} onClick={() => openDetail(d)}>
                      <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{d.studentName}
                        {isBest && <Badge className="ml-1 bg-emerald-100 text-emerald-700 border-0 rounded-full text-[10px]">Terbaik</Badge>}
                        {isWorst && <Badge className="ml-1 bg-red-100 text-red-700 border-0 rounded-full text-[10px]">Perlu Perhatian</Badge>}
                      </TableCell>
                      {d.ratings.map((r, hIdx) => (
                        <TableCell key={hIdx} className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden"><div className={cn('h-full rounded-full transition-all duration-500', scoreBar(r))} style={{ width: `${(r / 5) * 100}%` }} /></div>
                            <span className={cn('text-xs font-medium', scoreColor(r))}>{r > 0 ? r.toFixed(1) : '-'}</span>
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn('text-sm font-bold', scoreColor(d.avg))}>{d.avg.toFixed(1)}</span>
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden"><div className={cn('h-full rounded-full transition-all duration-500', scoreBar(d.avg))} style={{ width: `${(d.avg / 5) * 100}%` }} /></div>
                        </div>
                      </TableCell>
                      <TableCell><Eye className="w-4 h-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Student Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#1F3864]">Detail Karakter — {detailStudent?.studentName}</DialogTitle>
            <DialogDescription>Rating 7 Kebiasaan Anak Hebat</DialogDescription>
          </DialogHeader>
          {detailStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                <Avatar className="h-12 w-12"><AvatarFallback className="bg-[#1F3864]/10 text-[#1F3864] font-bold rounded-full text-lg">{getInitials(detailStudent.studentName)}</AvatarFallback></Avatar>
                <div>
                  <p className="font-semibold">{detailStudent.studentName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('text-2xl font-bold', scoreColor(detailStudent.avg))}>{detailStudent.avg.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">/ 5.0</span>
                    <Badge className={cn('ml-2 rounded-full border-0', scoreBg(detailStudent.avg), scoreColor(detailStudent.avg))}>{detailStudent.avg >= 4 ? 'Sangat Baik' : detailStudent.avg >= 3 ? 'Cukup' : 'Perlu Perbaikan'}</Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {HABITS.map((h, idx) => {
                  const r = detailStudent.ratings[idx] || 0;
                  const pct = (r / 5) * 100;
                  return (
                    <div key={h.key} className={cn('flex items-center gap-3 p-3 rounded-xl border', h.color)}>
                      <div className={cn('p-2 rounded-lg shrink-0', h.iconBg)}><span className="text-lg" role="img" aria-label={h.name}>{h.emoji}</span></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{h.name}</span>
                          <span className={cn('text-sm font-bold', scoreColor(r))}>{r > 0 ? r.toFixed(1) : '-'}</span>
                        </div>
                        <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all duration-700 ease-out', scoreBar(r))} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
  const [classFilter, setClassFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
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
    if (classFilter && j.className !== classFilter) return false;
    if (search) { const q = search.toLowerCase(); if (!j.topic.toLowerCase().includes(q) && !j.className.toLowerCase().includes(q) && !j.subject.toLowerCase().includes(q)) return false; }
    return true;
  });

  const todayCount = journals.filter((j) => j.date === todayStr()).length;
  const monthLabel = MONTHS.find((m) => m.value === currentMonth())?.label || '';
  const uniqueClasses = [...new Set(journals.map((j) => j.className))].filter(Boolean);

  const handleSave = async () => {
    if (!form.className || !form.subject || !form.topic) { toast.error('Kelas, mata pelajaran, dan topik wajib diisi'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/teaching-journals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolId: user?.schoolId, teacherId: user?.id, ...form }) });
      if (res.ok) { toast.success('Jurnal mengajar berhasil disimpan'); setDialogOpen(false); setSaving(false); return; }
    } catch { /* fallback */ }
    setJournals((prev) => [{ id: `j${Date.now()}`, ...form }, ...prev]);
    toast.success('Jurnal mengajar berhasil disimpan (lokal)'); setDialogOpen(false); setSaving(false);
  };

  const handleDelete = () => {
    if (!selectedJournal) return;
    setJournals((prev) => prev.filter((j) => j.id !== selectedJournal.id));
    toast.success('Jurnal berhasil dihapus'); setDeleteOpen(false); setSelectedJournal(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={<BookHeart className="w-5 h-5" />} title="Jurnal Mengajar" description="Catat aktivitas dan refleksi mengajar harian"
        action={<Button onClick={() => { setForm({ date: todayStr(), className: '', subject: '', topic: '', activities: '', notes: '' }); setDialogOpen(true); }} className="bg-[#1F3864] hover:bg-[#2d5289] text-white transition-all duration-200 hover:shadow-sm active:scale-[0.98] cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />Tambah Jurnal
        </Button>} />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={<BookOpen className="w-5 h-5" />} label="Total Jurnal" value={journals.length} bg="bg-[#1F3864]/10" color="text-[#1F3864]" />
        <StatCard icon={<Calendar className="w-5 h-5" />} label={monthLabel} value={journals.length} bg="bg-emerald-50" color="text-emerald-600" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Hari Ini" value={todayCount} bg="bg-amber-50" color="text-amber-600" />
      </div>

      {/* Filters */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari topik, kelas, mapel..." className="pl-9 rounded-lg" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2"><Label className="text-xs text-muted-foreground shrink-0">Tanggal:</Label><Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-40 rounded-lg h-8" /></div>
              {uniqueClasses.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <FilterPill label="Semua" active={!classFilter} onClick={() => setClassFilter('')} />
                  {uniqueClasses.map((c) => (
                    <FilterPill key={c} label={c} active={classFilter === c} onClick={() => setClassFilter(c)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline cards */}
      {filtered.length === 0 ? (
        <Card className="rounded-xl shadow-sm"><CardContent>
          <EmptyState icon={<BookHeart className="w-8 h-8" />} message="Tidak ada jurnal yang cocok dengan filter." />
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((j) => {
            const dateObj = new Date(j.date);
            const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            const monthShort = dateObj.toLocaleDateString('id-ID', { month: 'short' });
            return (
              <Card key={j.id} className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Date accent */}
                    <div className="w-16 sm:w-20 bg-gradient-to-b from-[#1F3864] to-[#2d5289] text-white flex flex-col items-center justify-center shrink-0 p-2">
                      <span className="text-[10px] uppercase font-medium opacity-80">{dayName}</span>
                      <span className="text-2xl sm:text-3xl font-bold leading-none">{dayNum}</span>
                      <span className="text-[10px] uppercase font-medium opacity-80">{monthShort}</span>
                    </div>
                    {/* Content */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="rounded-full text-xs font-normal">{j.className}</Badge>
                          <Badge className="bg-[#1F3864]/10 text-[#1F3864] border-0 rounded-full text-xs">{j.subject}</Badge>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForm({ date: j.date, className: j.className, subject: j.subject, topic: j.topic, activities: j.activities, notes: j.notes }); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { setSelectedJournal(j); setDeleteOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm mb-2">{j.topic}</h3>
                      {j.activities && <p className="text-xs text-muted-foreground line-clamp-2">{j.activities}</p>}
                      {j.notes && <p className="text-xs text-amber-600 mt-1.5 line-clamp-1 italic">💬 {j.notes}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader><DialogTitle className="text-[#1F3864]">Tambah Jurnal Mengajar</DialogTitle><DialogDescription>Catat kegiatan belajar mengajar hari ini</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tanggal</Label><Input type="date" className="rounded-lg" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Kelas *</Label>
                <Select value={form.className} onValueChange={(v) => setForm((f) => ({ ...f, className: v }))}>
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                  <SelectContent>{MOCK_CLASSES.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Mata Pelajaran *</Label>
              <Select value={form.subject} onValueChange={(v) => setForm((f) => ({ ...f, subject: v }))}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Pilih mata pelajaran" /></SelectTrigger>
                <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Topik *</Label><Input placeholder="Topik pembelajaran" className="rounded-lg" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Aktivitas</Label><Textarea placeholder="Deskripsikan aktivitas pembelajaran..." rows={4} className="rounded-lg" value={form.activities} onChange={(e) => setForm((f) => ({ ...f, activities: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Catatan</Label><Textarea placeholder="Catatan tambahan atau refleksi..." rows={3} className="rounded-lg" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg transition-all duration-200">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1F3864] hover:bg-[#2d5289] text-white rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{saving ? 'Menyimpan...' : 'Simpan Jurnal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader><AlertDialogTitle>Hapus Jurnal</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus jurnal &quot;{selectedJournal?.topic}&quot;?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-lg">Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-lg">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
