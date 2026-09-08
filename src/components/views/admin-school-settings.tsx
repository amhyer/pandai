'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Sheet,
  PlugZap,
  RefreshCcw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Unplug,
  CalendarClock,
  Save,
  ExternalLink,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface SheetsConfig {
  id: string;
  schoolId: string;
  spreadsheetId: string | null;
  sheetName: string;
  mode: string;
  status: string;
  lastSyncAt: string | null;
  lastSyncRows: number | null;
  lastError: string | null;
  scheduleFrequency: string;
  hasTokens: boolean;
}

interface SheetsStatus {
  connected: boolean;
  config: SheetsConfig | null;
  sheetMeta?: {
    title: string;
    sheets: { title: string; index: number }[];
  } | null;
  metaError?: string;
}

type SyncingState = 'idle' | 'running';

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  connected: { label: 'Terhubung', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  pending: { label: 'Menunggu Koneksi', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  error: { label: 'Error', className: 'bg-red-50 text-red-600 border-red-200' },
  disconnected: { label: 'Terputus', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

// ═══════════════════════════════════════════════════════════════════
// VIEW
// ═══════════════════════════════════════════════════════════════════

export function AdminSettingsView() {
  const user = useAppStore((s) => s.user);
  const schoolId = user?.schoolId || '';

  // ── Status ──
  const [status, setStatus] = useState<SheetsStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // ── Form config ──
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('NILAI');
  const [mode, setMode] = useState('all');
  const [frequency, setFrequency] = useState('none');
  const [saving, setSaving] = useState(false);

  // ── Aksi ──
  const [syncing, setSyncing] = useState<SyncingState>('idle');
  const [disconnecting, setDisconnecting] = useState(false);

  // ── Banner hasil OAuth callback ──
  const [oauthBanner, setOauthBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH
  // ═══════════════════════════════════════════════════════════════════

  const fetchStatus = useCallback(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      // Banner dari redirect OAuth callback
      if (params.get('status') === 'connected') {
        setOauthBanner({ kind: 'ok', text: 'Berhasil terhubung dengan Google Sheets!' });
      } else if (params.get('error')) {
        setOauthBanner({ kind: 'error', text: `Koneksi gagal: ${params.get('error')}` });
      }

      const res = await fetch('/api/sheets/status');
      if (res.ok) {
        const data: SheetsStatus = await res.json();
        setStatus(data);
        const cfg = data.config;
        if (cfg) {
          setSpreadsheetId(cfg.spreadsheetId ?? '');
          setSheetName(cfg.sheetName);
          setMode(cfg.mode);
          setFrequency(cfg.scheduleFrequency);
        }
      }
    } catch {
      toast.error('Gagal memuat status Google Sheets');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ═══════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: spreadsheetId.trim() || undefined,
          sheetName,
          mode,
          scheduleFrequency: frequency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');
      toast.success('Konfigurasi tersimpan');
      fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (type: 'all' | 'SISWA' | 'NILAI' = 'all') => {
    setSyncing('running');
    try {
      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync gagal');
      const sheetResults = Object.values(data.results ?? {}) as Record<string, unknown>[];
      const failed = sheetResults.find((r) => r && !r.ok);
      if (failed) {
        toast.error(`Sync sebagian gagal: ${(failed as { error?: string }).error ?? 'error'}`);
      } else {
        toast.success('Sinkronisasi ke Google Sheets selesai');
      }
      fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync gagal');
      setSyncing('idle');
      return;
    }
    setSyncing('idle');
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/sheets/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memutus');
      toast.success('Koneksi diputus');
      fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memutus koneksi');
    } finally {
      setDisconnecting(false);
    }
  };

  const startOAuth = () => {
    // Redirect penuh (bukan navigasi SPA): browser harus keluar aplikasi,
    // melewati Google, lalu kembali via callback.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/api/sheets/oauth';
  };

  const config = status?.config ?? null;
  const connected = status?.connected ?? false;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1F3864] flex items-center gap-2">
          <Sheet className="h-6 w-6" />
          Pengaturan Aplikasi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Integrasi dan pengaturan sistem untuk sekolah Anda
        </p>
      </div>

      {/* Banner hasil OAuth */}
      {oauthBanner && (
        <div
          className={`flex items-center gap-3 rounded-lg border p-4 text-sm ${
            oauthBanner.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {oauthBanner.kind === 'ok' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          )}
          <span className="flex-1">{oauthBanner.text}</span>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setOauthBanner(null)}>
            Tutup
          </Button>
        </div>
      )}

      {/* ===== Google Sheets Integration ===== */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sheet className="h-5 w-5 text-[#1F3864]" />
                Google Sheets
              </CardTitle>
              <CardDescription>
                Sinkronkan data siswa &amp; nilai ke Google Sheets sekolah
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={
                STATUS_BADGE[config?.status ?? 'pending']?.className ??
                'bg-slate-100 text-slate-500 border-slate-200'
              }
            >
              {STATUS_BADGE[config?.status ?? 'pending']?.label ?? 'Belum Disetel'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {statusLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          ) : (
            <>
              {/* Status detail */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground">Spreadsheet</p>
                  <p className="font-mono text-xs break-all mt-0.5">
                    {config?.spreadsheetId || '-'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" /> Sync Terakhir
                  </p>
                  <p className="font-medium mt-0.5">
                    {formatDate(config?.lastSyncAt ?? null)}
                    {config?.lastSyncRows != null && (
                      <span className="text-xs text-muted-foreground"> · {config.lastSyncRows} baris</span>
                    )}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground">Jadwal</p>
                  <p className="font-medium mt-0.5 capitalize">
                    {config?.scheduleFrequency === 'none' || !config
                      ? 'Manual'
                      : config?.scheduleFrequency === 'hourly'
                        ? 'Setiap Jam'
                        : 'Setiap Hari'}
                  </p>
                </div>
              </div>

              {config?.lastError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Terjadi kesalahan pada sync terakhir</p>
                    <p className="text-xs mt-0.5 break-words">{config.lastError}</p>
                  </div>
                </div>
              )}

              {status?.sheetMeta && (
                <div className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">
                    Workbook: <span className="font-medium text-slate-700">{status.sheetMeta.title}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {status.sheetMeta.sheets.map((s) => (
                      <Badge key={s.title} variant="outline" className="text-xs font-mono">
                        {s.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Form konfigurasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="space-y-1.5 lg:col-span-2">
                  <Label className="text-sm font-medium">Spreadsheet ID</Label>
                  <Input
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="1AbCdEfGhIjKlMnOpQrStUvWxYz..."
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Salin dari URL sheet: sheets.google.com/spreadsheets/
                    <span className="font-mono">ID_INI</span>/edit
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Sheet Utama</Label>
                  <Select value={sheetName} onValueChange={setSheetName}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NILAI">NILAI</SelectItem>
                      <SelectItem value="SISWA">SISWA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Jadwal Otomatis</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Manual (tanpa jadwal)</SelectItem>
                      <SelectItem value="hourly">Setiap Jam</SelectItem>
                      <SelectItem value="daily">Setiap Hari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Aksi */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {!connected || !config?.hasTokens ? (
                  <Button className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white" onClick={startOAuth}>
                    <PlugZap className="h-4 w-4 mr-2" />
                    Hubungkan Akun Google
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Unplug className="h-4 w-4 mr-2" />
                    )}
                    Putuskan Koneksi
                  </Button>
                )}

                <Button variant="outline" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Simpan Konfigurasi
                </Button>

                {connected && (
                  <Button
                    onClick={() => handleSync('all')}
                    disabled={syncing !== 'idle'}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {syncing !== 'idle' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4 mr-2" />
                    )}
                    Sync Sekarang
                  </Button>
                )}
                {connected && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSync('SISWA')}
                      disabled={syncing !== 'idle'}
                    >
                      Push Siswa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSync('NILAI')}
                      disabled={syncing !== 'idle'}
                    >
                      Push Nilai
                    </Button>
                  </>
                )}
              </div>

              {/* Panduan singkat */}
              <div className="rounded-lg bg-[#1F3864]/5 border border-[#1F3864]/10 p-4 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-[#1F3864]">Cara kerja:</p>
                <p>
                  1. Buat Google Spreadsheet dengan dua sheet bernama{' '}
                  <span className="font-mono">SISWA</span> dan <span className="font-mono">NILAI</span>.
                </p>
                <p>2. Klik "Hubungkan Akun Google" dan izinkan akses Sheets.</p>
                <p>3. Tempel Spreadsheet ID, simpan, lalu "Sync Sekarang".</p>
                <p>
                  4. Jadwal otomatis memerlukan cron eksternal (Vercel Cron) — lihat{' '}
                  <a
                    href="https://github.com/amhyer/pandai/blob/main/docs/GOOGLE_SHEETS_SYNC_SETUP.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-0.5"
                  >
                    dokumen setup <ExternalLink className="h-3 w-3" />
                  </a>
                  .
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== Info Aplikasi ===== */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tentang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-slate-700">PANDAI</span> — Platform Asesmen &amp;
            Pengembangan Daya Analystik untuk persiapan TKA.
          </p>
          <p>Sekolah: {user?.name ? `Akun ${user.name}` : '-'}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminSettingsView;
