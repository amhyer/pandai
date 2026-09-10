'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-store';
import { featureJson } from '@/lib/feature-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { RefreshCw, ShieldCheck } from 'lucide-react';

type Activity = { id: string; action: string; detail: string | null; module: string | null; createdAt: string; user: { name: string; role: string } | null };

export function ActivityMonitorView() {
  const user = useAppStore((state) => state.user);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [logs, setLogs] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(query); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ limit: '25', offset: String((page - 1) * 25), q: search, schoolId: user?.schoolId || '' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    featureJson<{ data: Activity[]; total: number }>(`/api/activity-logs?${params}`, { signal: controller.signal })
      .then((result) => { setLogs(result.data); setTotal(result.total); setError(''); })
      .catch((err) => { if (!controller.signal.aborted) { setLogs([]); setError(err.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, from, to, page, refresh, user?.schoolId]);

  return <div className="space-y-6">
    <div className="flex justify-between items-start gap-3"><div><h1 className="text-2xl font-bold">Pantau Aktivitas</h1><p className="text-sm text-muted-foreground">Aktivitas yang tercatat di {user?.schoolName || 'sekolah Anda'}.</p></div><Button variant="outline" disabled={loading} onClick={() => setRefresh((value) => value + 1)}><RefreshCw className="mr-2 h-4 w-4" />Muat Ulang</Button></div>
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0" /><p>Mode baca saja. Log dibuat oleh server dan tidak dapat ditambah, diubah, atau dihapus dari halaman ini. Rentang tanggal menggunakan WITA.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="space-y-1"><Label htmlFor="activity-search">Cari pengguna atau aktivitas</Label><Input id="activity-search" placeholder="Nama, tindakan, atau detail" value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="space-y-1"><Label htmlFor="activity-from">Dari tanggal</Label><Input id="activity-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></div><div className="space-y-1"><Label htmlFor="activity-to">Sampai tanggal</Label><Input id="activity-to" type="date" min={from || undefined} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></div></div>
    {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
    <Card><CardContent className="p-0 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Waktu (WITA)</TableHead><TableHead>Pengguna</TableHead><TableHead>Modul</TableHead><TableHead>Aktivitas</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={4}>Memuat aktivitas...</TableCell></TableRow> : logs.length ? logs.map((log) => <TableRow key={log.id}><TableCell className="whitespace-nowrap text-xs">{new Date(log.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })}</TableCell><TableCell><p className="font-medium">{log.user?.name || 'Sistem'}</p><p className="text-xs text-muted-foreground">{log.user?.role.replaceAll('_', ' ')}</p></TableCell><TableCell>{log.module || 'Lainnya'}</TableCell><TableCell><p className="font-medium">{log.action}</p><p className="text-xs text-muted-foreground break-words">{log.detail || '—'}</p></TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">{error ? 'Data tidak dapat dimuat.' : 'Belum ada aktivitas yang sesuai dengan filter.'}</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    <div className="flex justify-between items-center gap-3 text-sm"><p>{total} aktivitas · Halaman {page} dari {Math.max(1, Math.ceil(total / 25))}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={loading || page === 1} onClick={() => setPage((value) => value - 1)}>Sebelumnya</Button><Button size="sm" variant="outline" disabled={loading || page * 25 >= total} onClick={() => setPage((value) => value + 1)}>Berikutnya</Button></div></div>
  </div>;
}
