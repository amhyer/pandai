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
  DialogDescription,
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
  Search,
  Users,
  GraduationCap,
  UserPlus,
  Pencil,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
  UserCircle,
  Baby,
  ShieldCheck,
  Copy,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  role: string;
  nip?: string;
  nik?: string;
  nisn?: string;
  className?: string;
  classId?: string;
  namaOrtu?: string;
  jk?: string;
  schoolId?: string;
  parentId?: string;
  isActive: boolean;
  children?: { id: string; name: string; className?: string }[];
}

type RoleType = 'GURU' | 'KEPALA_SEKOLAH' | 'SISWA' | 'ORANG_TUA';

// ─── Role Badge ──────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const upper = role?.toUpperCase();
  if (upper === 'GURU') {
    return <Badge className="bg-sky-100 text-sky-700 border-sky-200 border">Guru</Badge>;
  }
  if (upper === 'SISWA') {
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">Siswa</Badge>;
  }
  if (upper === 'ORANG_TUA') {
    return <Badge className="bg-rose-100 text-rose-700 border-rose-200 border">Orang Tua</Badge>;
  }
  return <Badge variant="outline">{role}</Badge>;
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">Aktif</Badge>;
  }
  return <Badge className="bg-gray-100 text-gray-600 border-gray-200 border">Nonaktif</Badge>;
}

// ─── Copy Button ────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Disalin ke clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin');
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

// ─── Add Guru Dialog ─────────────────────────────────────────────────

interface AddGuruDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onSuccess: () => void;
}

function AddGuruDialog({ open, onOpenChange, schoolId, onSuccess }: AddGuruDialogProps) {
  const [form, setForm] = useState({ name: '', nip: '', nik: '', phone: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => setForm({ name: '', nip: '', nik: '', phone: '', email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nama wajib diisi'); return; }
    if (!form.nip.trim() && !form.nik.trim()) { toast.error('NIP atau NIK wajib diisi'); return; }

    try {
      setSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          nip: form.nip || undefined,
          nik: form.nik || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          password: form.password || undefined,
          role: 'GURU',
          schoolId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Guru berhasil ditambahkan');
        if (data.user?.username) {
          toast.info(`Username: ${data.user.username}`, { duration: 5000 });
        }
        resetForm();
        onOpenChange(false);
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menambahkan guru');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-sky-600" />
            Tambah Guru Baru
          </DialogTitle>
          <DialogDescription>Tambah guru baru ke sekolah Anda</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-guru-name">Nama Lengkap <span className="text-red-500">*</span></Label>
            <Input id="add-guru-name" placeholder="Contoh: Andi Mustafa, S.Pd." value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-guru-nip">NIP (PNS)</Label>
              <Input id="add-guru-nip" placeholder="198504152010011001" value={form.nip} onChange={(e) => setForm((f) => ({ ...f, nip: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-guru-nik">NIK (Non-PNS)</Label>
              <Input id="add-guru-nik" placeholder="3502155678090002" value={form.nik} onChange={(e) => setForm((f) => ({ ...f, nik: e.target.value }))} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Isi NIP atau NIK. Ini akan digunakan sebagai <span className="font-semibold">username login</span> guru.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-guru-phone">No. Telepon</Label>
              <Input id="add-guru-phone" placeholder="08123456789" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-guru-email">Email</Label>
              <Input id="add-guru-email" type="email" placeholder="guru@sekolah.id" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-guru-password">Password</Label>
            <Input id="add-guru-password" type="password" placeholder="Kosongkan = default" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Batal</Button>
            <Button type="submit" className="bg-sky-600 hover:bg-sky-700" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : 'Tambah Guru'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Kepala Sekolah Dialog ──────────────────────────────────────

interface AddKepsekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onSuccess: () => void;
}

function AddKepsekDialog({ open, onOpenChange, schoolId, onSuccess }: AddKepsekDialogProps) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => setForm({ name: '', email: '', phone: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nama wajib diisi'); return; }
    if (!form.email.trim()) { toast.error('Email wajib diisi untuk kepala sekolah'); return; }
    if (form.password.trim().length < 8) { toast.error('Password minimal 8 karakter'); return; }
    if (!/[A-Za-z]/.test(form.password.trim()) || !/\d/.test(form.password.trim())) { toast.error('Password harus mengandung huruf dan angka'); return; }

    try {
      setSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          role: 'KEPALA_SEKOLAH',
          schoolId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Kepala sekolah berhasil ditambahkan');
        if (data.user?.email) {
          toast.info(`Login email: ${data.user.email}`, { duration: 5000 });
        }
        resetForm();
        onOpenChange(false);
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menambahkan kepala sekolah');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-600" />
            Tambah Kepala Sekolah Baru
          </DialogTitle>
          <DialogDescription>Tambah akun kepala sekolah di sekolah Anda</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-kepsek-name">Nama Lengkap <span className="text-red-500">*</span></Label>
            <Input id="add-kepsek-name" placeholder="Contoh: Drs. Ahmad Suryani, M.Pd." value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-kepsek-email">Email <span className="text-red-500">*</span></Label>
            <Input id="add-kepsek-email" type="email" placeholder="kepsek@sekolah.id" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <p className="text-[11px] text-muted-foreground">Email digunakan sebagai <span className="font-semibold">username login</span> kepala sekolah.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-kepsek-phone">No. Telepon</Label>
            <Input id="add-kepsek-phone" placeholder="08123456789" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-kepsek-password">Password <span className="text-red-500">*</span></Label>
            <Input id="add-kepsek-password" type="password" placeholder="Minimal 8 karakter" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Batal</Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : 'Tambah Kepala Sekolah'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Siswa Dialog ───────────────────────────────────────────────

interface AddSiswaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classes: { id: string; name: string }[];
  onSuccess: () => void;
}

function AddSiswaDialog({ open, onOpenChange, schoolId, classes, onSuccess }: AddSiswaDialogProps) {
  const [form, setForm] = useState({ name: '', nisn: '', classId: '', jk: '', namaOrtu: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => setForm({ name: '', nisn: '', classId: '', jk: '', namaOrtu: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nama wajib diisi'); return; }
    if (!form.nisn.trim()) { toast.error('NISN wajib diisi'); return; }

    try {
      setSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          nisn: form.nisn,
          classId: form.classId || undefined,
          jk: form.jk || undefined,
          namaOrtu: form.namaOrtu || undefined,
          password: form.password || undefined,
          role: 'SISWA',
          schoolId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Siswa berhasil ditambahkan');
        if (data.user?.username) {
          toast.info(`Username: ${data.user.username}`, { duration: 5000 });
        }
        resetForm();
        onOpenChange(false);
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menambahkan siswa');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
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
          <DialogDescription>Tambah siswa baru ke sekolah Anda</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-siswa-name">Nama Lengkap <span className="text-red-500">*</span></Label>
            <Input id="add-siswa-name" placeholder="Contoh: Ahmad Fadli Rahman" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-siswa-nisn">NISN <span className="text-red-500">*</span></Label>
              <Input id="add-siswa-nisn" placeholder="0051234567" value={form.nisn} onChange={(e) => setForm((f) => ({ ...f, nisn: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-siswa-jk">Jenis Kelamin</Label>
              <Select value={form.jk} onValueChange={(v) => setForm((f) => ({ ...f, jk: v }))}>
                <SelectTrigger id="add-siswa-jk"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Laki-laki</SelectItem>
                  <SelectItem value="P">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">NISN akan digunakan sebagai <span className="font-semibold">username login</span> siswa.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-siswa-class">Kelas</Label>
              {classes.length > 0 ? (
                <Select value={form.classId} onValueChange={(v) => setForm((f) => ({ ...f, classId: v }))}>
                  <SelectTrigger id="add-siswa-class"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input id="add-siswa-class" placeholder="Nama kelas (manual)" value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))} />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-siswa-password">Password</Label>
              <Input id="add-siswa-password" type="password" placeholder="Kosongkan = default" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-siswa-ortu">Nama Orang Tua / Wali</Label>
            <Input id="add-siswa-ortu" placeholder="Contoh: H. Rahman" value={form.namaOrtu} onChange={(e) => setForm((f) => ({ ...f, namaOrtu: e.target.value }))} />
            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-md px-3 py-2">
              📌 Jika diisi, akun <span className="font-semibold">Orang Tua</span> akan dibuat otomatis.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Batal</Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : 'Tambah Siswa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Orang Tua Dialog ────────────────────────────────────────────

interface AddOrtuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onSuccess: () => void;
}

function AddOrtuDialog({ open, onOpenChange, schoolId, onSuccess }: AddOrtuDialogProps) {
  const [form, setForm] = useState({ name: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => setForm({ name: '', password: '' });

  // Auto-generate username from first name
  const autoUsername = form.name.trim().split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nama wajib diisi'); return; }

    try {
      setSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          username: autoUsername,
          password: form.password || undefined,
          role: 'ORANG_TUA',
          schoolId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Akun orang tua berhasil ditambahkan');
        resetForm();
        onOpenChange(false);
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menambahkan akun orang tua');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-rose-600" />
            Tambah Akun Orang Tua
          </DialogTitle>
          <DialogDescription>Tambah akun orang tua / wali murid</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-ortu-name">Nama Lengkap <span className="text-red-500">*</span></Label>
            <Input id="add-ortu-name" placeholder="Contoh: H. Rahman" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          {autoUsername && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Username (otomatis)</Label>
              <div className="flex items-center gap-1">
                <code className="text-xs bg-muted rounded px-2 py-1 font-mono">{autoUsername}</code>
                <CopyButton text={autoUsername} />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="add-ortu-password">Password</Label>
            <Input id="add-ortu-password" type="password" placeholder="Kosongkan = default" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Batal</Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : 'Tambah Orang Tua'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Dialog ────────────────────────────────────────────────

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRecord | null;
  onSuccess: () => void;
}

function EditUserDialog({ open, onOpenChange, user, onSuccess }: EditUserDialogProps) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && open) {
      setForm({ name: user.name, phone: user.phone || '', email: user.email || '' });
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nama wajib diisi'); return; }
    if (!user) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
        }),
      });

      if (res.ok) {
        toast.success('Data pengguna berhasil diperbarui');
        onOpenChange(false);
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal memperbarui data');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-[#1F3864]" />
            Edit Data Pengguna
          </DialogTitle>
          <DialogDescription>{user?.name} — <RoleBadge role={user?.role || ''} /></DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-user-name">Nama Lengkap</Label>
            <Input id="edit-user-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-phone">No. Telepon</Label>
              <Input id="edit-user-phone" placeholder="08123456789" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input id="edit-user-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" className="bg-[#1F3864] hover:bg-[#152850]" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset Password Dialog ──────────────────────────────────────────

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRecord | null;
  onSuccess: () => void;
}

function ResetPasswordDialog({ open, onOpenChange, user, onSuccess }: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.trim().length < 8) {
      toast.error('Password minimal 8 karakter');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword.trim()) || !/\d/.test(newPassword.trim())) {
      toast.error('Password harus mengandung huruf dan angka');
      return;
    }
    if (!user) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword.trim() }),
      });

      if (res.ok) {
        toast.success(`Password untuk ${user.name} berhasil direset`);
        setNewPassword('');
        setShowPassword(false);
        onOpenChange(false);
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal mereset password');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setNewPassword(''); setShowPassword(false); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-500" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Atur ulang password untuk <strong>{user?.name}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-pwd">Password Baru <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                id="reset-pwd"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 8 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700"
              disabled={submitting || newPassword.trim().length < 8}
            >
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Merest...</> : 'Reset Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── User Table per Role ──────────────────────────────────────────────

interface RoleTableProps {
  users: UserRecord[];
  loading: boolean;
  role: RoleType;
  onEdit: (user: UserRecord) => void;
  onResetPassword: (user: UserRecord) => void;
  onToggleActive: (user: UserRecord) => void;
}

function RoleTable({ users, loading, role, onEdit, onResetPassword, onToggleActive }: RoleTableProps) {
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
          <p className="mt-2 text-sm">
            {role === 'GURU' ? 'Belum ada guru terdaftar' : role === 'KEPALA_SEKOLAH' ? 'Belum ada kepala sekolah terdaftar' : role === 'SISWA' ? 'Belum ada siswa terdaftar' : 'Belum ada akun orang tua'}
          </p>
        </div>
      </div>
    );
  }

  // Column visibility based on role
  const showNip = role === 'GURU';
  const showNisn = role === 'SISWA';
  const showClass = role === 'SISWA';
  const showOrtu = role === 'SISWA';
  const showChildren = role === 'ORANG_TUA';
  const showJk = role === 'SISWA';

  return (
    <div className="max-h-96 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead className="hidden sm:table-cell">Login ID</TableHead>
            {showNip && <TableHead className="hidden md:table-cell">NIP</TableHead>}
            {showNisn && <TableHead className="hidden md:table-cell">NISN</TableHead>}
            {showJk && <TableHead className="hidden md:table-cell text-center">JK</TableHead>}
            {showClass && <TableHead className="hidden lg:table-cell">Kelas</TableHead>}
            {showOrtu && <TableHead className="hidden lg:table-cell">Orang Tua</TableHead>}
            {showChildren && <TableHead className="hidden lg:table-cell">Anak</TableHead>}
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} className={!u.isActive ? 'opacity-60' : ''}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground font-mono text-xs">
                {u.username || u.nisn || u.nip || u.nik || u.email || '-'}
              </TableCell>
              {showNip && (
                <TableCell className="hidden md:table-cell text-muted-foreground font-mono text-xs">
                  {u.nip || u.nik || '-'}
                </TableCell>
              )}
              {showNisn && (
                <TableCell className="hidden md:table-cell text-muted-foreground font-mono text-xs">
                  {u.nisn || '-'}
                </TableCell>
              )}
              {showJk && (
                <TableCell className="hidden md:table-cell text-center">
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {u.jk === 'L' ? 'Laki-laki' : u.jk === 'P' ? 'Perempuan' : '-'}
                  </Badge>
                </TableCell>
              )}
              {showClass && (
                <TableCell className="hidden lg:table-cell">
                  {u.className ? (
                    <Badge variant="outline" className="text-[10px]">{u.className}</Badge>
                  ) : '-'}
                </TableCell>
              )}
              {showOrtu && (
                <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                  {u.namaOrtu || '-'}
                </TableCell>
              )}
              {showChildren && (
                <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                  {u.children && u.children.length > 0
                    ? u.children.map((c) => c.name).join(', ')
                    : '-'
                  }
                </TableCell>
              )}
              <TableCell className="text-center">
                <StatusBadge active={u.isActive} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(u)}
                    aria-label={`Edit ${u.name}`}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    onClick={() => onResetPassword(u)}
                    aria-label={`Reset Password ${u.name}`}
                    title="Reset Password"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${u.isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}`}
                    onClick={() => onToggleActive(u)}
                    aria-label={u.isActive ? `Nonaktifkan ${u.name}` : `Aktifkan ${u.name}`}
                    title={u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {u.isActive ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function AccountManager() {
  const user = useAppStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<RoleType>('GURU');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [counts, setCounts] = useState<Record<RoleType, number>>({
    GURU: 0,
    KEPALA_SEKOLAH: 0,
    SISWA: 0,
    ORANG_TUA: 0,
  });
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);
  const [toggleTarget, setToggleTarget] = useState<UserRecord | null>(null);

  const schoolId = user?.schoolId || '';

  const fetchUsers = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/users?schoolId=${schoolId}&role=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        const list: UserRecord[] = Array.isArray(data) ? data : data.users ?? [];
        setUsers(list);
      }
    } catch {
      toast.error('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [schoolId, activeTab]);

  // Fetch classes for siswa dialog
  const fetchClasses = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        const classList = Array.isArray(data) ? data : [];
        setClasses(classList.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // Classes API may not exist — silently fail
    }
  }, [schoolId]);

  // Fetch counts for all roles (summary cards)
  const fetchAllCounts = useCallback(async () => {
    if (!schoolId) return;
    try {
      const roles: RoleType[] = ['GURU', 'KEPALA_SEKOLAH', 'SISWA', 'ORANG_TUA'];
      const results = await Promise.all(
        roles.map(async (role) => {
          const res = await fetch(`/api/users?schoolId=${schoolId}&role=${role}`);
          if (res.ok) {
            const data = await res.json();
            const list: UserRecord[] = Array.isArray(data) ? data : data.users ?? [];
            return [role, list.length] as const;
          }
          return [role, 0] as const;
        })
      );
      setCounts(Object.fromEntries(results) as Record<RoleType, number>);
    } catch {
      // silent
    }
  }, [schoolId]);

  // Refresh table + summary counts after any mutation
  const refresh = useCallback(() => {
    fetchUsers();
    fetchAllCounts();
  }, [fetchUsers, fetchAllCounts]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Initial preload of other roles
  useEffect(() => {
    fetchAllCounts();
  }, [fetchAllCounts]);

  // Toggle active/inactive
  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    try {
      if (toggleTarget.isActive) {
        // Deactivate: DELETE
        const res = await fetch(`/api/users?id=${toggleTarget.id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success(`${toggleTarget.name} berhasil dinonaktifkan`);
          refresh();
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Gagal menonaktifkan pengguna');
        }
      } else {
        // Reactivate: PATCH
        const res = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: toggleTarget.id, isActive: true }),
        });
        if (res.ok) {
          toast.success(`${toggleTarget.name} berhasil diaktifkan`);
          refresh();
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Gagal mengaktifkan pengguna');
        }
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setToggleTarget(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.nisn || '').includes(search) ||
      (u.nip || '').includes(search) ||
      (u.nik || '').includes(search) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.className || '').toLowerCase().includes(search.toLowerCase())
  );

  // Role-specific icons and colors
  const roleConfig: Record<RoleType, { icon: React.ReactNode; label: string; addLabel: string; color: string }> = {
    GURU: {
      icon: <GraduationCap className="h-4 w-4" />,
      label: 'Guru',
      addLabel: 'Tambah Guru',
      color: 'sky',
    },
    SISWA: {
      icon: <GraduationCap className="h-4 w-4" />,
      label: 'Siswa',
      addLabel: 'Tambah Siswa',
      color: 'amber',
    },
    ORANG_TUA: {
      icon: <Baby className="h-4 w-4" />,
      label: 'Orang Tua',
      addLabel: 'Tambah Orang Tua',
      color: 'rose',
    },
    KEPALA_SEKOLAH: {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: 'Kepala Sekolah',
      addLabel: 'Tambah Kepala Sekolah',
      color: 'violet',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengelolaan Akun</h1>
          <p className="text-muted-foreground">Kelola akun guru, kepala sekolah, siswa, dan orang tua di sekolah Anda</p>
        </div>
        <Button
          className="bg-[#1F3864] hover:bg-[#152850]"
          onClick={() => setAddDialogOpen(true)}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {roleConfig[activeTab].addLabel}
        </Button>
      </div>

      {/* Summary cards */}
      {initialLoading ? (
        <SummarySkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Guru</p>
                <p className="text-xl font-bold">{counts.GURU}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kepala Sekolah</p>
                <p className="text-xl font-bold">{counts.KEPALA_SEKOLAH}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Siswa</p>
                <p className="text-xl font-bold">{counts.SISWA}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Baby className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orang Tua</p>
                <p className="text-xl font-bold">{counts.ORANG_TUA}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as RoleType); setSearch(''); }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="GURU" className="gap-1.5">
              <GraduationCap className="h-4 w-4" />
              Guru
            </TabsTrigger>
            <TabsTrigger value="KEPALA_SEKOLAH" className="gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Kepala Sekolah
            </TabsTrigger>
            <TabsTrigger value="SISWA" className="gap-1.5">
              <Users className="h-4 w-4" />
              Siswa
            </TabsTrigger>
            <TabsTrigger value="ORANG_TUA" className="gap-1.5">
              <Baby className="h-4 w-4" />
              Orang Tua
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                activeTab === 'GURU' ? 'Cari nama atau NIP...'
                : activeTab === 'KEPALA_SEKOLAH' ? 'Cari nama atau email kepala sekolah...'
                : activeTab === 'SISWA' ? 'Cari nama atau NISN...'
                : 'Cari nama orang tua...'
              }
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* GURU Tab */}
        <TabsContent value="GURU" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <RoleTable
                users={filtered}
                loading={loading}
                role="GURU"
                onEdit={setEditTarget}
                onResetPassword={setResetTarget}
                onToggleActive={setToggleTarget}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* KEPALA_SEKOLAH Tab */}
        <TabsContent value="KEPALA_SEKOLAH" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <RoleTable
                users={filtered}
                loading={loading}
                role="KEPALA_SEKOLAH"
                onEdit={setEditTarget}
                onResetPassword={setResetTarget}
                onToggleActive={setToggleTarget}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* SISWA Tab */}
        <TabsContent value="SISWA" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <RoleTable
                users={filtered}
                loading={loading}
                role="SISWA"
                onEdit={setEditTarget}
                onResetPassword={setResetTarget}
                onToggleActive={setToggleTarget}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ORANG_TUA Tab */}
        <TabsContent value="ORANG_TUA" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <RoleTable
                users={filtered}
                loading={loading}
                role="ORANG_TUA"
                onEdit={setEditTarget}
                onResetPassword={setResetTarget}
                onToggleActive={setToggleTarget}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Dialogs */}
      <AddGuruDialog
        open={addDialogOpen && activeTab === 'GURU'}
        onOpenChange={setAddDialogOpen}
        schoolId={schoolId}
        onSuccess={refresh}
      />
      <AddSiswaDialog
        open={addDialogOpen && activeTab === 'SISWA'}
        onOpenChange={setAddDialogOpen}
        schoolId={schoolId}
        classes={classes}
        onSuccess={refresh}
      />
      <AddKepsekDialog
        open={addDialogOpen && activeTab === 'KEPALA_SEKOLAH'}
        onOpenChange={setAddDialogOpen}
        schoolId={schoolId}
        onSuccess={refresh}
      />
      <AddOrtuDialog
        open={addDialogOpen && activeTab === 'ORANG_TUA'}
        onOpenChange={setAddDialogOpen}
        schoolId={schoolId}
        onSuccess={refresh}
      />

      {/* Edit Dialog */}
      <EditUserDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        user={editTarget}
        onSuccess={fetchUsers}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        open={!!resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        user={resetTarget}
        onSuccess={fetchUsers}
      />

      {/* Toggle Active Confirmation */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.isActive ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.isActive ? (
                <>
                  Apakah Anda yakin ingin menonaktifkan <strong>{toggleTarget?.name}</strong>?
                  Pengguna ini tidak akan dapat login setelah dinonaktifkan.
                </>
              ) : (
                <>
                  Apakah Anda yakin ingin mengaktifkan kembali <strong>{toggleTarget?.name}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={toggleTarget?.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
            >
              {toggleTarget?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
