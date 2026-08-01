'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
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
import {
  Plus,
  Trash2,
  Search,
  Users,
  GraduationCap,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role: string;
  nisn?: string;
  nip?: string;
  className?: string;
  schoolId?: string;
  isActive: boolean;
}

interface ClassRecord {
  id: string;
  name: string;
  grade: number;
}

// ─── Role Badge ──────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const upper = role?.toUpperCase();
  if (upper === 'GURU') {
    return <Badge className="bg-[#1F3864] text-white border-[#1F3864]">Guru</Badge>;
  }
  if (upper === 'SISWA') {
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">Siswa</Badge>;
  }
  if (upper === 'ORANG_TUA') {
    return <Badge className="bg-green-100 text-green-700 border-green-200 border">Orang Tua</Badge>;
  }
  return <Badge variant="outline">{role}</Badge>;
}

// ─── Guru Form Dialog ───────────────────────────────────────────────

interface GuruFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function GuruFormDialog({ open, onOpenChange, schoolId, onSubmit, isSubmitting }: GuruFormDialogProps) {
  const [form, setForm] = useState({
    name: '',
    nip: '',
    nik: '',
    phone: '',
    password: '',
  });

  const resetForm = () => {
    setForm({ name: '', nip: '', nik: '', phone: '', password: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nama wajib diisi');
      return;
    }
    if (!form.nip.trim() && !form.nik.trim()) {
      toast.error('NIP atau NIK wajib diisi untuk guru');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          role: 'GURU',
          schoolId,
          password: form.password || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Guru berhasil ditambahkan');
        resetForm();
        onOpenChange(false);
        onSubmit();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menambahkan guru');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[#1F3864]" />
            Tambah Guru Baru
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guru-name">Nama Lengkap <span className="text-red-500">*</span></Label>
            <Input
              id="guru-name"
              placeholder="Contoh: Andi Mustafa, S.Pd."
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guru-nip">NIP (PNS)</Label>
              <Input
                id="guru-nip"
                placeholder="198504152010011001"
                value={form.nip}
                onChange={(e) => setForm((f) => ({ ...f, nip: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guru-nik">NIK (Non-PNS)</Label>
              <Input
                id="guru-nik"
                placeholder="3502155678090002"
                value={form.nik}
                onChange={(e) => setForm((f) => ({ ...f, nik: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Isi NIP atau NIK. Ini akan digunakan sebagai <span className="font-semibold">username login</span> guru.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guru-phone">No. Telepon</Label>
              <Input
                id="guru-phone"
                placeholder="08123456789"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guru-password">Password</Label>
              <Input
                id="guru-password"
                type="password"
                placeholder="Kosongkan = default"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-[#1F3864] hover:bg-[#152850]"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : 'Tambah Guru'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Siswa Form Dialog ───────────────────────────────────────────────

interface SiswaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classes: ClassRecord[];
  onSubmit: () => void;
  isSubmitting: boolean;
}

function SiswaFormDialog({ open, onOpenChange, schoolId, classes, onSubmit, isSubmitting }: SiswaFormDialogProps) {
  const [form, setForm] = useState({
    name: '',
    nisn: '',
    namaOrtu: '',
    jk: '',
    classId: '',
    phone: '',
    password: '',
  });

  const resetForm = () => {
    setForm({ name: '', nisn: '', namaOrtu: '', jk: '', classId: '', phone: '', password: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nama wajib diisi');
      return;
    }
    if (!form.nisn.trim() || form.nisn.trim().length !== 10) {
      toast.error('NISN wajib 10 digit');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          role: 'SISWA',
          schoolId,
          classId: form.classId || undefined,
          password: form.password || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Siswa berhasil ditambahkan');
        resetForm();
        onOpenChange(false);
        onSubmit();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menambahkan siswa');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-amber-600" />
            Tambah Siswa Baru
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siswa-name">Nama Lengkap <span className="text-red-500">*</span></Label>
            <Input
              id="siswa-name"
              placeholder="Contoh: Ahmad Fadli Rahman"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siswa-nisn">NISN <span className="text-red-500">*</span></Label>
              <Input
                id="siswa-nisn"
                placeholder="0051234567 (10 digit)"
                value={form.nisn}
                onChange={(e) => setForm((f) => ({ ...f, nisn: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                className={form.nisn.length > 0 && form.nisn.length !== 10 ? 'border-red-300 focus-visible:ring-red-500/30' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siswa-jk">Jenis Kelamin</Label>
              <Select value={form.jk} onValueChange={(v) => setForm((f) => ({ ...f, jk: v }))}>
                <SelectTrigger id="siswa-jk">
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Laki-laki</SelectItem>
                  <SelectItem value="P">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            NISN akan digunakan sebagai <span className="font-semibold">username login</span> siswa.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siswa-class">Kelas (Rombel)</Label>
              <Select value={form.classId} onValueChange={(v) => setForm((f) => ({ ...f, classId: v }))}>
                <SelectTrigger id="siswa-class">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siswa-phone">No. Telepon</Label>
              <Input
                id="siswa-phone"
                placeholder="08123456789"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="siswa-ortu">Nama Orang Tua / Wali</Label>
            <Input
              id="siswa-ortu"
              placeholder="Contoh: H. Rahman"
              value={form.namaOrtu}
              onChange={(e) => setForm((f) => ({ ...f, namaOrtu: e.target.value }))}
            />
            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-md px-3 py-2">
              📌 Jika diisi, akun <span className="font-semibold">Orang Tua</span> akan dibuat otomatis dengan password <span className="font-mono font-bold">123</span>
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : 'Tambah Siswa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── User Table ─────────────────────────────────────────────────────

interface UserTableProps {
  users: UserRecord[];
  loading: boolean;
  onDelete: (user: UserRecord) => void;
}

function UserTable({ users, loading, onDelete }: UserTableProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm">Belum ada pengguna</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead className="hidden sm:table-cell">Login ID</TableHead>
            <TableHead className="text-center">Role</TableHead>
            <TableHead className="text-center hidden md:table-cell">Kelas</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground font-mono text-xs">
                {u.nisn || u.nip || u.username || u.email || '-'}
              </TableCell>
              <TableCell className="text-center"><RoleBadge role={u.role} /></TableCell>
              <TableCell className="text-center hidden md:table-cell">{u.className ?? '-'}</TableCell>
              <TableCell className="text-center">
                {u.isActive ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">Aktif</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600 border-gray-200 border">Nonaktif</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(u)}
                  aria-label={`Hapus ${u.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function UserManager() {
  const user = useAppStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<string>('GURU');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/users?schoolId=${user.schoolId}&role=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.users ?? []);
      }
    } catch {
      toast.error('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId, activeTab]);

  const fetchClasses = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      const res = await fetch(`/api/classes?schoolId=${user.schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Pengguna berhasil dihapus');
        fetchUsers();
      } else {
        toast.error('Gagal menghapus pengguna');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.nisn || '').includes(search) ||
      (u.nip || '').includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
          <p className="text-muted-foreground">Kelola guru dan siswa di sekolah Anda.</p>
        </div>
        <Button
          className="bg-[#1F3864] hover:bg-[#152850]"
          onClick={() => setDialogOpen(true)}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Tambah {activeTab === 'GURU' ? 'Guru' : 'Siswa'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="GURU" className="gap-1.5">
              <Users className="h-4 w-4" />
              Guru
            </TabsTrigger>
            <TabsTrigger value="SISWA" className="gap-1.5">
              <GraduationCap className="h-4 w-4" />
              Siswa
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'GURU' ? 'Cari nama atau NIP...' : 'Cari nama atau NISN...'}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <UserTable users={filtered} loading={loading} onDelete={setDeleteTarget} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Guru Form Dialog */}
      <GuruFormDialog
        open={dialogOpen && activeTab === 'GURU'}
        onOpenChange={setDialogOpen}
        schoolId={user?.schoolId || ''}
        onSubmit={fetchUsers}
        isSubmitting={submitting}
      />

      {/* Siswa Form Dialog */}
      <SiswaFormDialog
        open={dialogOpen && activeTab === 'SISWA'}
        onOpenChange={setDialogOpen}
        schoolId={user?.schoolId || ''}
        classes={classes}
        onSubmit={fetchUsers}
        isSubmitting={submitting}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengguna</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{deleteTarget?.name}</strong>? Tindakan ini tidak
              dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
