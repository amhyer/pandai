'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/store/use-store';
import { featureJson, jsonBody } from '@/lib/feature-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

type Student = { id: string; name: string; nisn: string; class: { name: string } | null };
type Note = { id: string; studentId: string; authorId: string; category: string; content: string; date: string; student: { name: string }; author: { name: string }; class: { name: string } | null };
const categories: Record<string, string> = { apresiasi: 'Apresiasi', perhatian: 'Perhatian', umum: 'Catatan Umum' };
const colors: Record<string, string> = { apresiasi: 'bg-emerald-50 text-emerald-700', perhatian: 'bg-amber-50 text-amber-800', umum: 'bg-blue-50 text-blue-700' };
const selectClass = 'h-10 rounded-md border bg-background px-3 text-sm w-full';

export function StudentNotesView() {
  const user = useAppStore((s) => s.user);
  const isTeacher = user?.role === 'GURU';
  const [students, setStudents] = useState<Student[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentsError, setStudentsError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [removing, setRemoving] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [form, setForm] = useState({ studentId: '', category: 'umum', content: '', date: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => {
    const controller = new AbortController();
    featureJson<Student[]>('/api/student-notes?options=students', { signal: controller.signal })
      .then((items) => { setStudents(items); setStudentsError(''); })
      .catch((err) => { if (!controller.signal.aborted) { setStudents([]); setStudentsError(err.message); } });
    return () => controller.abort();
  }, [user?.id, reload]);

  const loadNotes = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (studentId) params.set('studentId', studentId);
      if (category) params.set('category', category);
      const result = await featureJson<{ data: Note[]; total: number }>(`/api/student-notes?${params}`, { signal });
      setNotes(result.data); setTotal(result.total); setError('');
    } catch (err) {
      if (!signal?.aborted) { setError((err as Error).message); setNotes([]); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [page, studentId, category]);
  useEffect(() => {
    const controller = new AbortController(); void loadNotes(controller.signal); return () => controller.abort();
  }, [loadNotes, reload]);

  function showForm(note?: Note) {
    setEditing(note || null);
    setForm(note ? { studentId: note.studentId, category: note.category, content: note.content, date: note.date }
      : { studentId: studentId || students[0]?.id || '', category: 'umum', content: '', date: format(new Date(), 'yyyy-MM-dd') });
    setOpen(true);
  }
  async function mutate(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await action(); setPage(1); setReload((value) => value + 1); }
    catch (err) { toast.error((err as Error).message); }
    finally { busyRef.current = false; setBusy(false); }
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold">{isTeacher ? 'Catatan Siswa' : 'Catatan Guru'}</h1><p className="text-sm text-muted-foreground">{isTeacher ? 'Apresiasi, perhatian, dan catatan umum untuk siswa di kelas Anda.' : 'Pantau apresiasi dan perhatian dari guru. Catatan hanya dapat diubah oleh guru pembuatnya.'}</p></div>{isTeacher && <Button disabled={!students.length || busy} onClick={() => showForm()}><Plus className="mr-2 h-4 w-4" />Tambah Catatan</Button>}</div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1"><Label htmlFor="note-student-filter">{user?.role === 'ORANG_TUA' ? 'Anak' : 'Siswa'}</Label><select id="note-student-filter" className={selectClass} value={studentId} disabled={busy} onChange={(e) => { setStudentId(e.target.value); setPage(1); }}><option value="">{user?.role === 'ORANG_TUA' ? 'Semua anak terhubung' : 'Semua siswa yang dapat diakses'}</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.class?.name || 'Tanpa kelas'}</option>)}</select></div>
      <div className="space-y-1"><Label htmlFor="note-category-filter">Kategori</Label><select id="note-category-filter" className={selectClass} value={category} disabled={busy} onChange={(e) => { setCategory(e.target.value); setPage(1); }}><option value="">Semua kategori</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
    </div>
    {(error || studentsError) && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || studentsError}<Button variant="link" onClick={() => setReload((value) => value + 1)}>Coba lagi</Button></div>}
    {loading ? <p role="status" className="text-sm text-muted-foreground">Memuat catatan...</p> : !notes.length && !error ? <Card><CardContent className="p-10 text-center text-muted-foreground"><MessageSquare className="h-8 w-8 mx-auto mb-3" /><p>Belum ada catatan untuk pilihan ini.</p>{isTeacher && !students.length && <p className="text-sm mt-2">Pastikan Anda sudah mendapat penugasan kelas dan kelas memiliki siswa.</p>}</CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">{notes.map((note) => <Card key={note.id}><CardContent className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-2"><div><h2 className="font-semibold">{note.student.name}</h2><p className="text-xs text-muted-foreground">{note.class?.name || 'Kelas diarsipkan'} · {note.date}</p></div><Badge variant="outline" className={colors[note.category]}>{categories[note.category] || note.category}</Badge></div>
      <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
      <div className="flex justify-between items-center border-t pt-3 gap-2"><p className="text-xs text-muted-foreground">Oleh {note.author.name}</p>{isTeacher && note.authorId === user?.id && <div className="flex gap-1"><Button size="sm" variant="ghost" disabled={busy} onClick={() => showForm(note)} aria-label={`Edit catatan ${note.student.name}`}><Pencil className="h-4 w-4 mr-1" />Edit</Button><Button size="sm" variant="ghost" className="text-red-600" disabled={busy} onClick={() => setRemoving(note)} aria-label={`Hapus catatan ${note.student.name}`}><Trash2 className="h-4 w-4 mr-1" />Hapus</Button></div>}</div>
    </CardContent></Card>)}</div>}
    <div className="flex justify-between items-center text-sm gap-3"><p>{total} catatan · Halaman {page} dari {Math.max(1, Math.ceil(total / 25))}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1 || loading || busy} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button><Button variant="outline" size="sm" disabled={page * 25 >= total || loading || busy} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button></div></div>

    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}><DialogContent showCloseButton={!busy}><DialogHeader><DialogTitle>{editing ? 'Edit Catatan' : 'Tambah Catatan Siswa'}</DialogTitle><DialogDescription>Catatan ini dapat dibaca oleh orang tua yang terhubung dengan siswa. Gunakan bahasa yang objektif dan membangun.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => { event.preventDefault(); void mutate(async () => {
        const { studentId: selected, ...fields } = form;
        await featureJson('/api/student-notes', jsonBody(editing ? 'PATCH' : 'POST', editing ? { ...fields, id: editing.id } : { ...fields, studentId: selected }));
        setOpen(false); toast.success('Catatan berhasil disimpan');
      }); }}><fieldset className="space-y-3" disabled={busy}>
        <div className="space-y-1"><Label htmlFor="note-student">Siswa *</Label><select id="note-student" className={selectClass} required disabled={!!editing} value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}><option value="">Pilih siswa</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.class?.name}</option>)}</select></div>
        <div className="grid gap-3 grid-cols-2"><div className="space-y-1"><Label htmlFor="note-category">Kategori *</Label><select id="note-category" className={selectClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className="space-y-1"><Label htmlFor="note-date">Tanggal *</Label><Input id="note-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div></div>
        <div className="space-y-1"><Label htmlFor="note-content">Isi catatan *</Label><Textarea id="note-content" required maxLength={3000} className="min-h-32" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /><p className="text-xs text-muted-foreground text-right">{form.content.length}/3.000</p></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit">{busy ? 'Menyimpan...' : 'Simpan Catatan'}</Button></div>
      </fieldset></form>
    </DialogContent></Dialog>
    <AlertDialog open={!!removing} onOpenChange={(value) => { if (!value && !busy) setRemoving(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus Catatan?</AlertDialogTitle><AlertDialogDescription>Catatan untuk {removing?.student.name} akan dihapus. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); if (removing) void mutate(async () => { await featureJson(`/api/student-notes?id=${encodeURIComponent(removing.id)}`, { method: 'DELETE' }); setRemoving(null); toast.success('Catatan dihapus'); }); }}>{busy ? 'Menghapus...' : 'Hapus Catatan'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
