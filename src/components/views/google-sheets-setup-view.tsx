'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Flag,
  FileText,
  Download,
  Upload,
  Save,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { detectExternalProvider, PROVIDER_ICONS, isValidUrl } from '@/lib/external-quiz';
import { apiClient } from '@/lib/api-client';

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'connected':
      return <Badge variant="success" className="text-xs">Terkoneksi</Badge>;
    case 'syncing':
      return <Badge variant="default" className="text-xs">Synchronizing</Badge>;
    case 'error':
      return <Badge variant="destructive" className="text-xs">Error</Badge>;
    case 'disconnected':
      return <Badge variant="outline" className="text-xs">Terputus</Badge>;
    case 'pending':
      return <Badge variant="outline" className="text-xs">Menunggu</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function ModeBadge({ mode }: { mode: string }) {
  switch (mode) {
    case 'global':
      return <Badge className="bg-blue-100 text-blue-700 text-xs">Global (Semua Kelas)</Badge>;
    case 'per_class':
      return <Badge className="bg-green-100 text-green-700 text-xs">Per Kelas</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-700 text-xs">{mode}</Badge>;
  }
}

// ═══════════════════════════════════════════════════════════════════
// GOOGLE SHEETS SETUP VIEW
// ═══════════════════════════════════════════════════════════════════

export function GoogleSheetsSetupView() {
  const user = useAppStore((s) => s.user);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'global' | 'per_class'>('global');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [status, setStatus] = useState<'pending' | 'connected' | 'error' | 'disconnected' | 'syncing'>('pending');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncHistory, setSyncHistory] = useState<Array<{ id: string; type: string; timestamp: string; status: string }>>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // Fetch config
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/google-sheets/setup', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setConfig(data.config);
      setMode(data.config?.mode || 'global');
      setSpreadsheetId(data.config?.spreadsheetId || '');
      setStatus(data.config?.status || 'pending');
      setLastSync(data.config?.lastSync ? new Date(data.config.lastSync).toLocaleString('id-ID') : null);
      
      // Sync history from config or fallback
      const history = data.config?.lastSync 
        ? [{ id: '1', type: 'manual', timestamp: data.config.lastSync, status: 'success' }]
        : [];
      setSyncHistory(history);
    } catch (err) {
      console.error('Gagal fetch config:', err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!spreadsheetId.trim()) {
      toast.error('Spreadsheet ID wajib diisi');
      return;
    }

    setStatus('syncing');
    try {
      await fetch('/api/google-sheets/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId, mode }),
        credentials: 'include',
      });
      toast.success('Konfigurasi Google Sheets berhasil disimpan');
      fetchConfig();
    } catch (err) {
      toast.error('Gagal menyimpan konfigurasi');
      setStatus('error');
    }
  }, [spreadsheetId, mode]);

  const handleTestConnection = useCallback(async () => {
    if (!spreadsheetId.trim()) {
      toast.error('Spreadsheet ID wajib diisi');
      return;
    }
    setIsConnecting(true);
    try {
      await fetch('/api/google-sheets/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId, mode, test: true }),
        credentials: 'include',
      });
      setStatus('connected');
      setLastSync(new Date().toLocaleString('id-ID'));
      toast.success('Koneksi ke Google Sheets berhasil divalidasi');
    } catch (err) {
      setStatus('error');
      toast.error('Gagal validasi koneksi. Pastikan Sheet ID benar dan izin diaktifkan.');
    } finally {
      setIsConnecting(false);
    }
  }, [spreadsheetId, mode]);

  const handleManualSync = useCallback(async (type: string, data?: any) => {
    setStatus('syncing');
    try {
      await fetch('/api/google-sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, schoolId: user?.schoolId }),
        credentials: 'include',
      });
      setStatus('synced');
      setLastSync(new Date().toLocaleString('id-ID'));
      
      // Add to history
      setSyncHistory(prev => [
        { id: String(prev.length + 1), type, timestamp: new Date().toLocaleString('id-ID'), status: 'success' },
        ...prev.slice(0, 9), // Keep last 10 entries
      ]);
      
      toast.success(`Data berhasil disinkronisasi (${type})`);
    } catch (err) {
      setStatus('error');
      toast.error('Gagal sinkronisasi data ke Google Sheets');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Memuat konfigurasi Google Sheets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Config Status Card */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" /> Konfigurasi Google Sheets
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <span className="text-sm text-muted-foreground">
              Mode: <ModeBadge mode={mode} />
            </span>
          </div>
          {config && config.spreadsheetId && (
            <div className="mt-3 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => navigator.clipboard.writeText(config.spreadsheetId)} />
                <span className="text-sm font-medium truncate" title="Spreadsheet ID">
                  {config.spreadsheetId.substring(0, 20)}...
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Last sync: {lastSync || 'Belum pernah sinkronisasi'}
              </p>
            </div>
          )}
          {!config || !config.spreadsheetId && (
            <p className="mt-2 text-sm text-muted-foreground">
              Belum ada konfigurasi Google Sheets. Silakan setup di bawah ini.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Setup Form */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Setup Google Sheets Integrasi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <form className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="spreadsheet-id">Spreadsheet ID Google Sheets *</Label>
              <Input
                id="spreadsheet-id"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjcharacteristic..."
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="rounded-lg focus-visible:ring-primary/30"
                disabled={isConnecting}
              />
              <p className="text-xs text-muted-foreground">
                ID dari Google Spreadsheet yang akan digunakan untuk sinkronisasi data nilai, kehadiran, dan profil lulusan.
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="mode">Mode Integrasi *</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="rounded-lg focus-visible:ring-primary/30">
                  <SelectValue placeholder="Pilih mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (Satu Sheet untuk Seluruh Sekolah)</SelectItem>
                  <SelectItem value="per_class">Per Kelas (Sheet terpisih per kelas)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Global: Semua guru/siswa menulis ke satu Sheet bersama.
                Per Kelas: Setiap kelas memiliki Sheet sendiri untuk data terisolasi.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isConnecting || !spreadsheetId.trim()}
                className="w-full justify-center"
              >
                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isConnecting ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </Button>
            </div>

            {status === 'error' && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border-red-200">
                <p className="text-sm text-red-600">
                  Terjadi error. Pastikan Spreadsheet ID benar dan Google Sheets API diaktifkan di Google Cloud Console.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchConfig}
                  className="mt-1 text-xs"
                >
                  Coba Lagi
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Connection Test Section */}
      {status !== 'error' && (
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" /> Test Koneksi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Uji koneksi ke Google Sheets untuk memastikan konfigurasi benar sebelum sinkronisasi.
            </p>
            <Button
              type="button"
              onClick={handleTestConnection}
              disabled={!spreadsheetId.trim() || isConnecting}
              className="w-full justify-center mb-3"
            >
              {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isConnecting ? 'Memvalidasi...' : 'Test Koneksi'}
            </Button>
            {showTestModal && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  Pastikan Anda telah membuat Google Sheet baru dan mengaktifkan Google Sheets API di
                  <a href="https://console.cloud.google.com/" className="underline text-primary" target="_blank">
                    Google Cloud Console
                  </a>, lalu share Sheet ke email layanan aplikasi.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync History */}
      {config && config.lastSync && (
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Riwayat Synchronisasi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Riwayat sinkronisasi data ke Google Sheets
            </p>
            {syncHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">Belum ada riwayat sinkronisasi</p>
            ) : (
              <div className="overflow-x-auto max-h-40">
                <table className="text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="p-3">Waktu</th>
                      <th className="p-3">Jenis</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncHistory.map((entry) => (
                      <tr key={entry.id} className="border-b pb-2">
                        <td className="p-3">{entry.timestamp}</td>
                        <td className="p-3">{entry.type}</td>
                        <td className="p-3">
                          {entry.status === 'success' ? (
                            <span className="text-emerald-600">Sukses</span>
                          ) : (
                            <span className="text-red-500">Gagal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}