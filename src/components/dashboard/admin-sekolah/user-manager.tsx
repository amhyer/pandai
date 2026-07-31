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
  DialogTrigger,
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
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  className?: string;
  isActive: boolean;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
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
  return <Badge variant="outline">{role}</Badge>;
}

// ─── User Form Dialog ───────────────────────────────────────────────

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole: string;
  onSubmit: (data: UserFormData) => void;
  isSubmitting: boolean;
}

function UserFormDialog({ open, onOpenChange, defaultRole, onSubmit, isSubmitting }: UserFormDialogProps) {
  const [form, setForm] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: defaultRole,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Semua field wajib diisi');
      return;
    }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Pengguna Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Nama Lengkap *</Label>
            <Input
              id="user-name"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email *</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="john@sekolah.sch.id"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-password">Password *</Label>
              <Input
                id="user-password"
                type="password"
                placeholder="Min 6 karakter"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Role *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GURU">Guru</SelectItem>
                  <SelectItem value="SISWA">Siswa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-[#1F3864] hover:bg-[#152850]"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : 'Tambah Pengguna'}
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
            <TableHead className="hidden sm:table-cell">Email</TableHead>
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
              <TableCell className="hidden sm:table-cell text-muted-foreground">{u.email}</TableCell>
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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (form: UserFormData) => {
    if (!user?.schoolId) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, schoolId: user.schoolId }),
      });
      if (res.ok) {
        toast.success('Pengguna berhasil ditambahkan');
        setDialogOpen(false);
        fetchUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? 'Gagal menambahkan pengguna');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

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
      u.email.toLowerCase().includes(search.toLowerCase())
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
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pengguna
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
              placeholder="Cari nama atau email..."
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

      {/* Add User Dialog */}
      <UserFormDialog
        key={dialogOpen ? `form-${activeTab}` : 'closed'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultRole={activeTab}
        onSubmit={handleSubmit}
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
