'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/use-store';
import { featureJson, jsonBody } from '@/lib/feature-client';
import { ImportTab } from '@/components/views/admin-school-import';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Upload, Users, Search, Pencil, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

type ClassOption = { id: string; name: string };
type Student = { id: string; name: string; nisn: string; jk?: string; phone?: string; namaOrtu?: string };
const emptyForm = { name: '', nisn: '', jk: '', phone: '', namaOrtu: '' };
const selectClass = 'h-10 w-full rounded-md border bg-background px-3 text-sm';

export function GuruStudentsView() {
  const user = useAppStore((s) => s.user);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryClasses, setRetryClasses] = useState(0);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [removing, setRemoving] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [poolQuery, setPoolQuery] = useState('');
  const [pool, setPool] = useState<Student[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolError, setPoolError] = useState('');
  const [claim, setClaim] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    featureJson<ClassOption[]>(`/api/classes?schoolId=${encodeURIComponent(user?.schoolId || '')}`, { signal: controller.signal })
      .then((items) => { setClasses(items); setClassId(items[0]?.id || ''); setError(''); })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.schoolId, retryClasses]);

  const loadStudents = useCallback(async (signal?: AbortSignal) => {
    if (!classId) { setStudents([]); return; }
    setLoading(true);
    try {
      const items = await featureJson<Student[]>(`/api/teacher-students?classId=${encodeURIComponent(classId)}`, { signal });
      setStudents(items); setError('');
    } catch (err) {
      if (!signal?.aborted) { setError((err as Error).message); setStudents([]); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [classId]);
  useEffect(() => {
    const controller = new AbortController();
    void loadStudents(controller.signal);
    return () => controller.abort();
  }, [loadStudents]);

  useEffect(() => {
    setPool([]); setClaim(null); setPoolError(''); setPoolLoading(false);
    if (!claimOpen || poolQuery.trim().length < 2) return;
    const controller = new AbortController();
    setPoolLoading(true);
    const timer = setTimeout(() => {
      featureJson<Student[]>(`/api/teacher-students?classId=${encodeURIComponent(classId)}&pool=unassigned&q=${encodeURIComponent(poolQuery.trim())}`, { signal: controller.signal })
        .then(setPool)
        .catch((err) => { if (!controller.signal.aborted) setPoolError(err.message); })
        .finally(() => { if (!controller.signal.aborted) setPoolLoading(false); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [claimOpen, poolQuery, classId]);

  async function mutate(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await action(); await loadStudents(); }
    catch (err) { toast.error((err as Error).message); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function openForm(student?: Student) {
    setEditing(student || null);
    setForm(student ? { name: student.name, nisn: student.nisn, jk: student.jk || '', phone: student.phone || '', namaOrtu: student.namaOrtu || '' } : emptyForm);
    setFormOpen(true);
  }
  const selectedClass = classes.find((cls) => cls.id === classId);
  const filtered = students.filter((student) => `${student.name} ${student.nisn}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
      <div><h1 className="text-2xl font-bold">Data Siswa</h1><p className="text-sm text-muted-foreground">Kelola siswa hanya di kelas yang ditugaskan kepada Anda.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!classId || busy} onClick={() => { setPoolQuery(''); setClaimOpen(true); }}><Users className="mr-2 h-4 w-4" />Ambil dari Sekolah</Button>
        <Button variant="outline" disabled={!classId || busy} onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Import Siswa</Button>
        <Button disabled={!classId || busy} onClick={() => openForm()}><Plus className="mr-2 h-4 w-4" />Tambah Siswa</Button>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1"><Label htmlFor="teacher-class">Kelas Anda</Label><select id="teacher-class" className={selectClass} disabled={busy || importBusy} value={classId} onChange={(e) => { setClassId(e.target.value); setStudents([]); }}>
        {!classes.length && <option value="">Belum ada kelas ditugaskan</option>}
        {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
      </select></div>
      <div className="space-y-1"><Label htmlFor="student-search">Cari siswa di kelas</Label><Input id="student-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama atau NISN" /></div>
    </div>
    {error && <p role="alert" className="text-sm text-red-600">{error} <Button variant="link" onClick={() => classId ? void loadStudents() : setRetryClasses((value) => value + 1)}>Coba lagi</Button></p>}
    {!loading && !classes.length && !error && <Card><CardContent className="p-6 text-sm text-muted-foreground">Belum ada kelas yang ditugaskan. Minta Admin Sekolah mengatur Penugasan Guru atau Wali Kelas terlebih dahulu.</CardContent></Card>}
    <Card><CardContent className="p-0 overflow-x-auto"><Table>
      <TableHeader><TableRow><TableHead>Nama Siswa</TableHead><TableHead>NISN</TableHead><TableHead>Orang Tua / Wali</TableHead><TableHead className="text-right">Tindakan</TableHead></TableRow></TableHeader>
      <TableBody>{loading ? <TableRow><TableCell colSpan={4}>Memuat siswa...</TableCell></TableRow> : filtered.length ? filtered.map((student) => <TableRow key={student.id}>
        <TableCell className="font-medium">{student.name}</TableCell><TableCell className="font-mono">{student.nisn}</TableCell><TableCell>{student.namaOrtu || '—'}</TableCell>
        <TableCell><div className="flex justify-end gap-1"><Button size="sm" variant="ghost" disabled={busy} onClick={() => openForm(student)} aria-label={`Edit ${student.name}`}><Pencil className="mr-1 h-4 w-4" />Edit</Button><Button size="sm" variant="ghost" className="text-red-600" disabled={busy} onClick={() => setRemoving(student)} aria-label={`Keluarkan ${student.name}`}><UserMinus className="mr-1 h-4 w-4" />Keluarkan</Button></div></TableCell>
      </TableRow>) : <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Belum ada siswa yang sesuai. Tambahkan, import, atau ambil siswa dari sekolah.</TableCell></TableRow>}</TableBody>
    </Table></CardContent></Card>
    <p className="text-xs text-muted-foreground">{filtered.length} dari {students.length} siswa. Mengeluarkan siswa hanya melepas kelas; akun, nilai, dan riwayat belajar tetap tersimpan.</p>

    <Dialog open={formOpen} onOpenChange={(open) => { if (!busy) setFormOpen(open); }}><DialogContent showCloseButton={!busy}>
      <DialogHeader><DialogTitle>{editing ? 'Edit Siswa' : 'Tambah Siswa'}</DialogTitle><DialogDescription>Kelas {selectedClass?.name}. Nama orang tua adalah informasi siswa, bukan pembuatan akun orang tua.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => { event.preventDefault(); void mutate(async () => {
        const { nisn, ...profile } = form;
        const result = await featureJson<{ temporaryPassword?: string }>('/api/teacher-students', jsonBody(editing ? 'PATCH' : 'POST', editing ? { ...profile, id: editing.id } : { ...form, classId }));
        if (result.temporaryPassword) setCredentials({ username: nisn, password: result.temporaryPassword });
        setFormOpen(false); toast.success(editing ? 'Data siswa diperbarui' : 'Siswa berhasil ditambahkan');
      }); }}><fieldset disabled={busy} className="space-y-3">
        <div className="space-y-1"><Label htmlFor="student-name">Nama lengkap *</Label><Input id="student-name" required maxLength={150} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="student-nisn">NISN (10 digit) *</Label><Input id="student-nisn" required inputMode="numeric" pattern="[0-9]{10}" disabled={!!editing} maxLength={10} value={form.nisn} onChange={(e) => setForm({ ...form, nisn: e.target.value })} /><p className="text-xs text-muted-foreground">NISN dipakai untuk login. Koreksi NISN melalui Admin Sekolah.</p></div>
        <div className="space-y-1"><Label htmlFor="student-gender">Jenis kelamin</Label><select id="student-gender" className={selectClass} value={form.jk} onChange={(e) => setForm({ ...form, jk: e.target.value })}><option value="">Belum diisi</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>
        <div className="space-y-1"><Label htmlFor="student-parent">Nama orang tua / wali</Label><Input id="student-parent" maxLength={150} value={form.namaOrtu} onChange={(e) => setForm({ ...form, namaOrtu: e.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="student-phone">Nomor telepon</Label><Input id="student-phone" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Batal</Button><Button type="submit">{busy ? 'Menyimpan...' : 'Simpan Siswa'}</Button></div>
      </fieldset></form>
    </DialogContent></Dialog>

    <Dialog open={!!credentials} onOpenChange={(open) => { if (!open) setCredentials(null); }}><DialogContent><DialogHeader><DialogTitle>Akun Siswa Berhasil Dibuat</DialogTitle><DialogDescription>Simpan kredensial ini dan sampaikan langsung kepada siswa. Password hanya ditampilkan sekali dan wajib diganti saat login pertama.</DialogDescription></DialogHeader><p>Username: <strong className="font-mono">{credentials?.username}</strong></p><p>Password sementara: <strong className="font-mono">{credentials?.password}</strong></p><Button onClick={() => setCredentials(null)}>Sudah Disimpan</Button></DialogContent></Dialog>

    <Dialog open={claimOpen} onOpenChange={(open) => { if (!busy) setClaimOpen(open); }}><DialogContent showCloseButton={!busy}>
      <DialogHeader><DialogTitle>Ambil Siswa dari Sekolah</DialogTitle><DialogDescription>Hanya siswa aktif yang belum memiliki kelas di sekolah Anda. Siswa kelas lain tidak dapat diambil. Tujuan: {selectedClass?.name}.</DialogDescription></DialogHeader>
      <Label htmlFor="pool-search">Cari nama atau NISN (minimal 2 karakter)</Label><Input id="pool-search" value={poolQuery} disabled={busy} onChange={(e) => setPoolQuery(e.target.value)} />
      {poolLoading ? <p role="status">Mencari...</p> : poolError ? <p role="alert" className="text-red-600">{poolError}</p> : <div className="max-h-64 space-y-2 overflow-y-auto">{pool.map((student) => <div key={student.id} className="flex items-center justify-between rounded-md border p-3 gap-2"><div><p className="text-sm font-medium">{student.name}</p><p className="text-xs font-mono">{student.nisn}</p></div><Button size="sm" variant={claim?.id === student.id ? 'default' : 'outline'} disabled={busy} onClick={() => setClaim(student)}>{claim?.id === student.id ? 'Dipilih' : 'Pilih'}</Button></div>)}{poolQuery.trim().length >= 2 && !pool.length && <p className="text-sm text-muted-foreground">Tidak ditemukan siswa tanpa kelas yang sesuai.</p>}</div>}
      {claim && <Button disabled={busy} onClick={() => void mutate(async () => {
        await featureJson('/api/teacher-students', jsonBody('PATCH', { action: 'claim', id: claim.id, classId }));
        toast.success(`${claim.name} masuk ke kelas ${selectedClass?.name}`); setClaimOpen(false);
      })}>{busy ? 'Memproses...' : `Masukkan ${claim.name} ke Kelas ${selectedClass?.name}`}</Button>}
    </DialogContent></Dialog>

    <Dialog open={importOpen} onOpenChange={(open) => { if (!importBusy) setImportOpen(open); }}><DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" showCloseButton={!importBusy}><DialogHeader><DialogTitle>Import Siswa — {selectedClass?.name}</DialogTitle><DialogDescription>Gunakan CSV/Excel. Siswa yang sudah terdaftar tidak dipindahkan.</DialogDescription></DialogHeader>{selectedClass && <ImportTab key={classId} type="siswa" targetClass={selectedClass} onImported={loadStudents} onBusyChange={setImportBusy} />}<Button variant="outline" disabled={importBusy} onClick={() => setImportOpen(false)}>Tutup</Button></DialogContent></Dialog>
    <AlertDialog open={!!removing} onOpenChange={(open) => { if (!open && !busy) setRemoving(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Keluarkan Siswa dari Kelas?</AlertDialogTitle><AlertDialogDescription>{removing?.name} akan menjadi siswa tanpa kelas. Akun dan riwayat belajarnya tidak dihapus. Siswa dapat dimasukkan kembali melalui Ambil dari Sekolah.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); if (removing) void mutate(async () => { await featureJson(`/api/teacher-students?id=${encodeURIComponent(removing.id)}`, { method: 'DELETE' }); setRemoving(null); toast.success('Siswa dikeluarkan dari kelas'); }); }}>{busy ? 'Memproses...' : 'Keluarkan Siswa'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
