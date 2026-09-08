# Google Sheets Sync — Setup Guide

Integrasi PANDAI dengan Google Sheets: data **siswa** dan **nilai** disinkronkan
otomatis/manual ke spreadsheet sekolah. Token OAuth2 disimpan **terenkripsi
(AES-256-GCM)** di database — bukan di env, sehingga aman untuk multi-sekolah.

```
┌────────────┐   OAuth 2.0    ┌──────────────┐   Sheets API v4   ┌──────────────────┐
│ Admin UI   │ ─────────────► │ PANDAI API   │ ────────────────► │ Google Sheets    │
│ (Settings) │ ◄───────────── │ /api/sheets* │ ◄──────────────── │ (SISWA, NILAI)   │
└────────────┘   redirect     └──────────────┘                    └──────────────────┘
```

## 1. Buat Project di Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat project baru (mis. `pandai-sheets`).
2. **APIs & Services → Library** → aktifkan **Google Sheets API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - Fill in app name (mis. `PANDAI Sheets Sync`), support email.
   - Scopes: tidak perlu ditambahkan di sini (di-request saat runtime: `spreadsheets`).
   - **Test users**: tambahkan akun Google admin sekolah (wajib selama status *Testing*; set *Production* untuk akses publik).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `https://DOMAIN-APP-MU` (dan `http://localhost:3000` untuk dev)
   - Authorized redirect URIs: `https://DOMAIN-APP-MU/api/sheets/oauth/callback`
     (dan `http://localhost:3000/api/sheets/oauth/callback` untuk dev)
5. Salin **Client ID** dan **Client Secret**.

## 2. Konfigurasi Environment

```bash
# Lokal: generate semua secret sekaligus
./scripts/generate-credentials.sh
# lalu isi GOOGLE_SHEETS_CLIENT_ID / GOOGLE_SHEETS_CLIENT_SECRET manual
```

Variabel yang dibutuhkan:

| Variabel | Kewajiban | Keterangan |
|---|---|---|
| `GOOGLE_SHEETS_CLIENT_ID` | wajib | Client ID dari Google Cloud |
| `GOOGLE_SHEETS_CLIENT_SECRET` | wajib | Client Secret dari Google Cloud |
| `GOOGLE_SHEETS_REDIRECT_URI` | wajib (prod) | Harus PERSIS sama dengan di Google Cloud |
| `AES_SECRET` | wajib (prod) | Kunci enkripsi token di DB — `openssl rand -hex 32` |
| `SHEETS_SYNC_CRON_SECRET` | untuk cron | Shared secret endpoint cron |

> ⚠️ **Rotasi `AES_SECRET`** membuat semua token tersimpan tidak bisa di-dekripsi —
> status akan menjadi `error` dan admin perlu menghubungkan ulang (OAuth ulang).

## 3. Siapkan Spreadsheet

Buat spreadsheet dengan **dua sheet** (nama PERSIS, kapital):

| Sheet | Header (baris 1) |
|---|---|
| `SISWA` | `NISN`, `Nama`, `JK`, `Kelas`, `No. HP Ortu`, `Nama Ortu/Wali` |
| `NILAI` | `NISN`, `Nama`, `Kelas`, `Mapel`, `Nilai`, `Ketepatan`, `Prediksi TKA`, `Tanggal`, `Keterangan` |

Salin **Spreadsheet ID** dari URL: `https://sheets.google.com/spreadsheets/`**`1AbCdEf...`**`/edit`.

## 4. Hubungkan di Aplikasi

1. Login sebagai **Admin Sekolah** → **Pengaturan Aplikasi**.
2. Klik **Hubungkan Akun Google** → approve akses di Google.
3. Tempel **Spreadsheet ID**, pilih sheet utama + jadwal, **Simpan Konfigurasi**.
4. Klik **Sync Sekarang** — data siswa & nilai masuk ke sheet.

## 5. Sinkronisasi Terjadwal (Cron)

Endpoint: `POST /api/sheets/sync?cron=1` dengan header `x-cron-secret: $SHEETS_SYNC_CRON_SECRET`.
Cron hanya menjalankan sekolah yang `scheduleFrequency != none` **dan sudah jatuh tempo**
(hourly ≥ 1 jam, daily ≥ 24 jam sejak `lastSyncAt`).

### Vercel Cron

Tambahkan di `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sheets/sync?cron=1",
      "schedule": "0 * * * *"
    }
  ]
}
```

lalu set header cron via Vercel Dashboard (Cron Jobs → edit → custom headers) atau
pakai secret di query string: `?cron=1&secret=...` (kurang aman — prefer header).

### Alternatif (GitHub Actions / cron eksternal)

```bash
curl -X POST "https://DOMAIN/api/sheets/sync?cron=1" \
  -H "x-cron-secret: $SHEETS_SYNC_CRON_SECRET"
```

## 6. API Reference

| Method | Path | Access | Fungsi |
|---|---|---|---|
| GET | `/api/sheets` | SA/AS/GURU | Konfigurasi sekolah |
| POST | `/api/sheets` | SA/AS | Simpan config (spreadsheetId, sheetName, mode, schedule) |
| GET | `/api/sheets/oauth` | SA/AS | Mulai OAuth (redirect ke Google) |
| GET | `/api/sheets/oauth/callback` | sesi | Tukar code → token (terenkripsi) |
| GET | `/api/sheets/status` | SA/AS/GURU | Status + metadata sheet dari Google |
| POST | `/api/sheets/sync` | SA/AS/GURU / cron | Sync manual / terjadwal |
| POST | `/api/sheets/push` | SA/AS/GURU | Push dataset parsial (filter kelas/mapel) |
| GET/POST | `/api/sheets/schedule` | SA/AS/GURU / SA/AS | Baca/ubah frekuensi jadwal |
| POST | `/api/sheets/disconnect` | SA/AS | Hapus token + putuskan |

## 7. Pemecahan Masalah

| Gejala | Solusi |
|---|---|
| `Invalid grant` saat OAuth | Code kedaluwarsa (masa pakai ~10 menit) atau redirect URI tidak cocok. Cek persis karakternya. |
| `Access Denied: ... required` | User Google belum di **Test users** consent screen. |
| `token not valid` / status `error` | `AES_SECRET` berubah sejak token disimpan → hubungkan ulang. |
| Sync 403 `insufficientPermissions` | Spreadsheet tidak dibagikan ke akun Google yang connect (bagikan sebagai Editor). |
| Sheet tidak terisi | Pastikan nama sheet PERSIS `SISWA` / `NILAI` (kapital). |

## Keamanan

- Token access/refresh **tidak pernah** dikirim ke browser; hanya hidup di server.
- Token di DB terenkripsi AES-256-GCM (IV random per payload + auth tag).
- Endpoint cron diproteksi shared secret; endpoint manual memakai sesi + role.
- Super admin bisa mengelola config sekolah lain (`?schoolId=`); admin sekolah hanya sekolahnya sendiri.
