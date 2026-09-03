# 📚 PANDAI — Dokumentasi Integrasi Dapodik

**Terakhir diperbarui:** 3 September 2026

---

## 📋 DAFTAR ISI

1. [Ringkasan](#ringkasan)
2. [Metode 1: Import File (Recommended)](#metode-1-import-file)
3. [Metode 2: Lookup NPSN Online](#metode-2-lookup-npsn-online)
4. [Metode 3: Dapodik Connector (Localhost Only)](#metode-3-dapodik-connector)
5. [Metode 4: Dapodik Proxy (Localhost Only)](#metode-4-dapodik-proxy)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## 📋 RINGKASAN

PANDAI mendukung **4 metode** untuk mengambil data dari Dapodik:

| Metode | Lokasi | Format | Status |
|--------|--------|--------|:------:|
| **Import File** | Vercel / Localhost | .db, .sqlite, .xlsx, .csv, .json | ✅ Recommended |
| **Lookup NPSN** | Vercel / Localhost | NPSN 8 digit | ✅ Online |
| **Dapodik Connector** | Localhost Only | Python API | ⚠️ Development |
| **Dapodik Proxy** | Localhost Only | Direct API | ⚠️ Development |

### ⚠️ PERINGATAN PENTING

> **Vercel (Cloud) TIDAK BISA mengakses localhost di komputer Anda.**
> 
> Metode **Connector** dan **Proxy** hanya berfungsi saat PANDAI dijalankan di localhost (`bun run dev`).

---

## METODE 1: IMPORT FILE

### ✅ RECOMMENDED UNTUK PRODUCTION

Metode ini paling cocok untuk deployment di Vercel karena tidak memerlukan koneksi langsung ke Dapodik.

### Langkah-langkah:

#### 1. Export Data dari Dapodik

**Format yang didukung:**
- `.db` / `.sqlite` / `.sqlite3` / `.db3` — Database Dapodik
- `.xlsx` / `.xls` — Excel export
- `.csv` — CSV export
- `.json` — JSON export

**Lokasi Database Dapodik:**
```
Windows: C:\Users\[User]\AppData\Local\Dapodikdasmen\
File: dapo.db atau PD-Data.db
```

#### 2. Upload ke PANDAI

1. Login sebagai **Admin Sekolah**
2. Buka menu **Import Data**
3. Klik **Upload File Dapodik**
4. Pilih file yang sudah di-export
5. Tunggu proses import selesai

#### 3. Data yang Di-import

| Data | Field yang Diambil |
|------|-------------------|
| **Peserta Didik** | NISN, Nama, Jenis Kelamin, No HP, Email, NIK, Alamat |
| **Guru/PTK** | NIP, Nama, NUPTK, Jenis Kelamin, No HP, Email, NIK |
| **Rombongan Belajar** | Nama Kelas, Tingkat, Tahun Ajaran |
| **Mata Pelajaran** | Kode, Nama, Jenis (Wajib/Pilihan) |

#### 4. Hasil Import

Setelah import selesai, Anda akan mendapatkan:
- **Username:** NISN (siswa) atau NIP (guru)
- **Password:** Password sementara (wajib diganti saat login pertama)

---

## METODE 2: LOOKUP NPSN ONLINE

### ✅ UNTUK VERIFIKASI SEKOLAH SAAT REGISTRASI

Metode ini mengambil data sekolah dari database Dapodik online (Kemendikbud).

### Langkah-langkah:

1. Buka halaman **Registrasi Sekolah**
2. Pilih **Admin Sekolah**
3. Masukkan **NPSN** (8 digit angka)
4. Klik **Cari**
5. Data sekolah otomatis terisi:
   - Nama Sekolah
   - Alamat
   - Provinsi, Kabupaten, Kecamatan
   - Nama Kepala Sekolah
   - Akreditasi
   - Jenjang (SD/SMP/SMA)

### Endpoint API

```
GET /api/schools/lookup?q={npsn}
```

**Response:**
```json
[
  {
    "npsn": "12345678",
    "name": "SDN 1 Jakarta",
    "address": "Jl. Sudirman No. 1",
    "province": "DKI Jakarta",
    "city": "Jakarta Selatan",
    "district": "Kebayoran Baru",
    "principalName": "Budi Santoso",
    "accreditation": "A",
    "schoolType": "SD",
    "source": "dapodik-live"
  }
]
```

---

## METODE 3: DAPODIK CONNECTOR

### ⚠️ HANYA UNTUK DEVELOPMENT (LOCALHOST)

Metode ini menggunakan **Python Connector** yang berjalan di komputer operator untuk mengambil data langsung dari Dapodik Desktop.

### Persyaratan

1. **Dapodik Desktop** sudah terinstall dan berjalan
2. **Python 3.x** sudah terinstall
3. **PANDAI** dijalankan di localhost (`bun run dev`)

### Langkah-langkah

#### 1. Download Python Connector

```bash
# Akses halaman download
http://localhost:3000/download/dapodik

# Atau langsung download
GET /api/dapodik/connector/download
```

#### 2. Jalankan Connector

```bash
# Buka terminal di folder download
python pandai-dapodik-connector.py
```

#### 3. Konfigurasi

Edit file `config.yaml`:
```yaml
server_url: "http://localhost:8881"
token: "YOUR_DAPODIK_TOKEN"
```

#### 4. Ambil Data

```bash
# Test koneksi
curl -X POST http://localhost:3000/api/dapodik/connect \
  -H "Content-Type: application/json" \
  -d '{"action": "test", "token": "YOUR_TOKEN"}'

# Ambil semua sekolah
curl -X POST http://localhost:3000/api/dapodik/connect \
  -H "Content-Type: application/json" \
  -d '{"action": "schools", "token": "YOUR_TOKEN"}'

# Ambil sekolah tertentu
curl -X POST http://localhost:3000/api/dapodik/connect \
  -H "Content-Type: application/json" \
  -d '{"action": "school", "npsn": "12345678", "token": "YOUR_TOKEN"}'
```

### Endpoint API

```
POST /api/dapodik/connect
```

**Request Body:**
```json
{
  "action": "test | schools | school",
  "token": "YOUR_DAPODIK_TOKEN",
  "serverUrl": "localhost:8881",  // optional
  "npsn": "12345678",             // required untuk action=school
  "bentuk": "SD"                  // optional filter
}
```

**Response (action=test):**
```json
{
  "success": true,
  "message": "Koneksi berhasil! Server aktif dengan 100 data sekolah.",
  "serverUrl": "http://localhost:8881",
  "totalSchools": 100
}
```

---

## METODE 4: DAPODIK PROXY

### ⚠️ HANYA UNTUK DEVELOPMENT (LOCALHOST)

Metode ini mengambil data langsung dari WebService Dapodik Lokal (PDIP) tanpa Python Connector.

### Persyaratan

1. **Dapodik Lokal (PDIP)** sudah terinstall dan berjalan
2. **PANDAI** dijalankan di localhost (`bun run dev`)

### Langkah-langkah

#### 1. Pastikan Dapodik Lokal Berjalan

```
http://localhost:5774/WebService/
```

#### 2. Konfigurasi Token

Buka Dapodik Lokal → Pengaturan → WebService → Masukkan API Key

#### 3. Ambil Data

```bash
# Ambil data sekolah
curl -X POST http://localhost:3000/api/dapodik/proxy \
  -H "Content-Type: application/json" \
  -d '{"npsn": "12345678", "token": "YOUR_TOKEN", "endpoint": "getSekolah"}'

# Ambil data guru
curl -X POST http://localhost:3000/api/dapodik/proxy \
  -H "Content-Type: application/json" \
  -d '{"npsn": "12345678", "token": "YOUR_TOKEN", "endpoint": "getGtk"}'

# Ambil data siswa
curl -X POST http://localhost:3000/api/dapodik/proxy \
  -H "Content-Type: application/json" \
  -d '{"npsn": "12345678", "token": "YOUR_TOKEN", "endpoint": "getPesertaDidik"}'

# Ambil data rombel
curl -X POST http://localhost:3000/api/dapodik/proxy \
  -H "Content-Type: application/json" \
  -d '{"npsn": "12345678", "token": "YOUR_TOKEN", "endpoint": "getRombonganBelajar"}'
```

### Endpoint API

```
POST /api/dapodik/proxy
```

**Request Body:**
```json
{
  "npsn": "12345678",
  "token": "YOUR_DAPODIK_TOKEN",
  "endpoint": "getSekolah | getGtk | getPesertaDidik | getRombonganBelajar"
}
```

**Response:**
```json
{
  "success": true,
  "endpoint": "getSekolah",
  "npsn": "12345678",
  "totalRecords": 1,
  "data": [...]
}
```

---

## TROUBLESHOOTING

### ❌ Error: "Koneksi timeout ke localhost"

**Penyebab:** Vercel tidak bisa mengakses localhost

**Solusi:**
- Gunakan metode **Import File** untuk production
- Gunakan metode **Connect/Proxy** hanya saat development di localhost

### ❌ Error: "Token tidak valid"

**Penyebab:** Token Dapodik salah atau expired

**Solusi:**
1. Buka Dapodik Desktop
2. Buka halaman WebService
3. Buat token baru
4. Copy token baru ke PANDAI

### ❌ Error: "NPSN tidak ditemukan"

**Penyebab:** NPSN tidak ada di database Dapodik

**Solusi:**
- Pastikan NPSN 8 digit angka
- Cek di https://dapo.kemendikdasmen.go.id

### ❌ Error: "File tidak bisa dibaca"

**Penyebab:** Format file tidak didukung atau file corrupt

**Solusi:**
- Gunakan format: .db, .sqlite, .xlsx, .csv, .json
- Export ulang dari Dapodik
- Maksimal ukuran file: 50MB

---

## FAQ

### Q: Metode mana yang recommended?

**A:** Untuk production di Vercel, gunakan **Import File**. Untuk development, gunakan **Connector** atau **Proxy**.

### Q: Apakah data otomatis sync?

**A:** Tidak. Import dilakukan manual. Untuk sync otomatis, perlu koneksi langsung ke Dapodik (hanya bisa di localhost).

### Q: Bagaimana cara update data?

**A:** Export ulang dari Dapodik, lalu import lagi ke PANDAI. Data yang sudah ada akan di-skip.

### Q: Password siswa/guru apa?

**A:** 
- **Import:** Password sementara (ditampilkan setelah import)
- **Sync:** Password = NISN/NIP

### Q: Dimana lokasi database Dapodik?

**A:** 
```
Windows: C:\Users\[User]\AppData\Local\Dapodikdasmen\
File: dapo.db atau PD-Data.db
```

---

## 📞 BANTUAN

Jika mengalami masalah, hubungi:
- **Email:** support@pandai.id
- **GitHub:** https://github.com/amhyer/pandai/issues

---

*Dokumentasi ini dibuat pada 3 September 2026*
