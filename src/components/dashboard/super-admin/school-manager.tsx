'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  School,
  Pencil,
  Trash2,
  Search,
  GraduationCap,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────

interface School {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  plan: string;
  maxStudents: number;
  studentCount: number;
  status: string;
  createdAt: string;
}

interface SchoolFormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  plan: string;
  maxStudents: string;
}

const EMPTY_FORM: SchoolFormData = {
  name: '',
  code: '',
  address: '',
  phone: '',
  plan: 'FREE',
  maxStudents: '50',
};

// ─── Plan / Status Badges ────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const upper = plan?.toUpperCase();
  const variants: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-700 border-gray-200',
    STARTER: 'bg-blue-100 text-blue-700 border-blue-200',
    PRO: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return (
    <Badge variant="outline" className={variants[upper] ?? variants.FREE}>
      {plan}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">Aktif</Badge>;
  }
  if (status === 'suspended') {
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 border">Ditangguhkan</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

// ─── School Form Dialog ─────────────────────────────────────────────

interface SchoolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: SchoolFormData;
  editingId?: string;
  onSubmit: (data: SchoolFormData, id?: string) => void;
  isSubmitting: boolean;
}

function SchoolFormDialog({ open, onOpenChange, initialData, editingId, onSubmit, isSubmitting }: SchoolFormDialogProps) {
  const [form, setForm] = useState<SchoolFormData>(initialData ?? EMPTY_FORM);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Nama dan kode sekolah wajib diisi');
      return;
    }
    onSubmit(form, editingId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit Sekolah' : 'Tambah Sekolah Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school-name">Nama Sekolah *</Label>
            <Input
              id="school-name"
              placeholder="SMA Negeri 1 Jakarta"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school-code">Kode *</Label>
              <Input
                id="school-code"
                placeholder="SMAN1JKT"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-plan">Plan</Label>
              <Select
                value={form.plan}
                onValueChange={(v) => setForm((f) => ({ ...f, plan: v }))}
              >
                <SelectTrigger id="school-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="STARTER">Starter</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-address">Alamat</Label>
            <Input
              id="school-address"
              placeholder="Jl. Merdeka No. 1, Jakarta"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school-phone">Telepon</Label>
              <Input
                id="school-phone"
                placeholder="021-1234567"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-max">Maks. Siswa</Label>
              <Input
                id="school-max"
                type="number"
                placeholder="50"
                value={form.maxStudents}
                onChange={(e) => setForm((f) => ({ ...f, maxStudents: e.target.value }))}
              />
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
              {isSubmitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Sekolah'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function SchoolManager() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);

  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/schools');
      if (res.ok) {
        const data = await res.json();
        setSchools(Array.isArray(data) ? data : data.schools ?? []);
      }
    } catch {
      toast.error('Gagal memuat data sekolah');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleSubmit = async (form: SchoolFormData, id?: string) => {
    try {
      setSubmitting(true);
      const body = {
        ...form,
        maxStudents: Number(form.maxStudents) || 50,
      };

      let res: Response;
      if (id) {
        res = await fetch('/api/schools', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...body }),
        });
      } else {
        res = await fetch('/api/schools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        toast.success(id ? 'Sekolah berhasil diperbarui' : 'Sekolah berhasil ditambahkan');
        setDialogOpen(false);
        setEditingSchool(null);
        fetchSchools();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? 'Gagal menyimpan sekolah');
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
      const res = await fetch(`/api/schools?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Sekolah berhasil dihapus');
        fetchSchools();
      } else {
        toast.error('Gagal menghapus sekolah');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    setDialogOpen(true);
  };

  const filtered = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Sekolah</h1>
          <p className="text-muted-foreground">Kelola semua sekolah yang terdaftar di platform.</p>
        </div>
        <Button
          className="bg-[#1F3864] hover:bg-[#152850]"
          onClick={() => {
            setEditingSchool(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Sekolah
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Sekolah</p>
              <p className="text-xl font-bold">{schools.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aktif</p>
              <p className="text-xl font-bold">{schools.filter((s) => s.status === 'active').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Siswa</p>
              <p className="text-xl font-bold">
                {schools.reduce((sum, s) => sum + (s.studentCount ?? 0), 0).toLocaleString('id-ID')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan Pro</p>
              <p className="text-xl font-bold">{schools.filter((s) => s.plan?.toUpperCase() === 'PRO').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau kode sekolah..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden sm:table-cell">Kode</TableHead>
                    <TableHead className="text-center">Plan</TableHead>
                    <TableHead className="text-center">Siswa</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">{school.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {school.code}
                      </TableCell>
                      <TableCell className="text-center">
                        <PlanBadge plan={school.plan} />
                      </TableCell>
                      <TableCell className="text-center">{school.studentCount ?? 0}</TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={school.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(school)}
                            aria-label={`Edit ${school.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteTarget(school)}
                            aria-label={`Hapus ${school.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <School className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm">
                  {search ? 'Tidak ditemukan sekolah yang cocok' : 'Belum ada sekolah terdaftar'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <SchoolFormDialog
        key={dialogOpen ? (editingSchool?.id ?? 'new') : 'closed'}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingSchool(null);
        }}
        initialData={
          editingSchool
            ? {
                name: editingSchool.name,
                code: editingSchool.code,
                address: editingSchool.address ?? '',
                phone: editingSchool.phone ?? '',
                plan: editingSchool.plan,
                maxStudents: String(editingSchool.maxStudents ?? 50),
              }
            : undefined
        }
        editingId={editingSchool?.id}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Sekolah</AlertDialogTitle>
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
