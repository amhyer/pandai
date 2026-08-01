# 📋 PANDAI — Akun Dummy untuk Testing

> Semua akun menggunakan password universal: **`password123`** (kecuali Orang Tua: **`123`**)

---

## 🔐 Cara Login Per Role

| Role | Login Menggunakan | Contoh |
|------|-------------------|-------|
| **Super Admin** | Email | `superadmin@pandai.id` |
| **Admin Sekolah** | Email | `admin.sman1@pandai.id` |
| **Guru** | **NIP** (PNS) atau **NIK** (Non-PNS) | `198504152010011001` |
| **Siswa** | **NISN** (10 digit) | `0051234567` |
| **Orang Tua** | **Nama depan** orang tua | `rahman` |

---

## 👤 1. SUPER ADMIN

| Email | Nama | Password |
|-------|------|----------|
| `superadmin@pandai.id` | Super Admin PANDAI | `password123` |

> Akses: Dashboard Super Admin, Manajemen Sekolah, dll.

---

## 🏫 2. ADMIN SEKOLAH

| Email | Nama | Sekolah | Password |
|-------|------|---------|----------|
| `admin.sman1@pandai.id` | Hj. Siti Rahmawati, S.Pd. | SMA Negeri 1 Makassar | `password123` |
| `admin.smkn2@pandai.id` | Drs. Budi Prasetyo | SMK Negeri 2 Surabaya | `password123` |

---

## 👩‍🏫 3. GURU — Login pakai NIP / NIK

| NIP / NIK | Nama | Sekolah | Password |
|-----------|------|---------|----------|
| `198504152010011001` | Andi Mustafa, S.Pd., M.Si. | SMA Negeri 1 Makassar | `password123` |
| `3502155678090002` | Linda Permata, S.Kom., M.Pd. | SMK Negeri 2 Surabaya | `password123` |

> ⚡ Guru PNS login pakai **NIP**, guru honorer/Non-PNS login pakai **NIK (KTP)**

---

## 👨‍🎓 4. SISWA — Login pakai NISN

### SMA Negeri 1 Makassar — XII IPA 1

| NISN | Nama | L/P | Orang Tua | Password |
|------|------|-----|-----------|----------|
| `0051234567` | Ahmad Fadli Rahman | L | Rahman | `password123` |
| `0051234568` | Siti Nurhaliza Putri | P | Haji Putri | `password123` |
| `0051234569` | Rudi Hartono | L | Hartono | `password123` |

### SMA Negeri 1 Makassar — XII IPA 2

| NISN | Nama | L/P | Orang Tua | Password |
|------|------|-----|-----------|----------|
| `0051234570` | Dewi Anggraeni | P | Anggraeni | `password123` |
| `0051234571` | Farhan Maulana | L | Maulana | `password123` |

### SMK Negeri 2 Surabaya — XII TKJ 1

| NISN | Nama | L/P | Orang Tua | Password |
|------|------|-----|-----------|----------|
| `0060987654` | Bagus Saputra | L | Saputra | `password123` |
| `0060987655` | Rina Wati | P | Wati | `password123` |
| `0060987656` | Joko Widodo Putra | L | Widodo | `password123` |

### SMK Negeri 2 Surabaya — XII RPL 1

| NISN | Nama | L/P | Orang Tua | Password |
|------|------|-----|-----------|----------|
| `0060987657` | Maya Indah | P | Indah | `password123` |
| `0060987658` | Dimas Prayoga | L | Prayoga | `password123` |

---

## 👨‍👩‍👧 5. ORANG TUA — Login pakai Nama Depan, Password: `123`

> ⚠️ Password orang tua berbeda: **`123`** (bukan `password123`)

| Username (Nama Depan) | Nama Lengkap | Anak | Sekolah | Password |
|----------------------|-------------|-----|---------|----------|
| `rahman` | Rahman | Ahmad Fadli Rahman | SMA Negeri 1 Makassar | `123` |
| `haji` | Haji Putri | Siti Nurhaliza Putri | SMA Negeri 1 Makassar | `123` |
| `hartono` | Hartono | Rudi Hartono | SMA Negeri 1 Makassar | `123` |
| `anggraeni` | Anggraeni | Dewi Anggraeni | SMA Negeri 1 Makassar | `123` |
| `maulana` | Maulana | Farhan Maulana | SMA Negeri 1 Makassar | `123` |
| `saputra` | Saputra | Bagus Saputra | SMK Negeri 2 Surabaya | `123` |
| `wati` | Wati | Rina Wati | SMK Negeri 2 Surabaya | `123` |
| `widodo` | Widodo | Joko Widodo Putra | SMK Negeri 2 Surabaya | `123` |
| `indah` | Indah | Maya Indah | SMK Negeri 2 Surabaya | `123` |
| `prayoga` | Prayoga | Dimas Prayoga | SMK Negeri 2 Surabaya | `123` |

> 💡 **Catatan**: Akun orang tua dibuat **otomatis** saat admin menambahkan siswa. Username = nama depan orang tua. Jika ada 2 orang tua dengan nama depan sama, otomatis diberi angka (contoh: `ahmad`, `ahmad2`).

---

## 🏫 Data Sekolah

| Sekolah | Kode | NPSN | Plan | Akreditasi |
|---------|------|------|------|------------|
| SMA Negeri 1 Makassar | SMAN1-MKS | 40201234 | Pro | A |
| SMK Negeri 2 Surabaya | SMKN2-SBY | 20504567 | Starter | A |

---

## 📋 Data Rombel (Kelas)

| Kelas | Grade | Sekolah |
|-------|-------|---------|
| XII IPA 1 | 12 | SMA Negeri 1 Makassar |
| XII IPA 2 | 12 | SMA Negeri 1 Makassar |
| XII TKJ 1 | 12 | SMK Negeri 2 Surabaya |
| XII RPL 1 | 12 | SMK Negeri 2 Surabaya |

---

## 🔄 Reset & Re-seed

```bash
rm db/custom.db
bun run db:push
bun run seed
```

> ⚠️ Perintah di atas akan **menghapus semua data** termasuk sekolah dan user yang sudah terdaftar.

---

## 🎯 Ringkasan

| Kategori | Jumlah |
|----------|--------|
| Total User | 25 (1 SA + 2 Admin + 2 Guru + 10 Siswa + 10 Orang Tua) |
| Sekolah | 2 |
| Rombel | 4 |
| Mata Pelajaran | 10 |

---

*Diperbarui: Juli 2025 — Login pakai NIP/NIK/NISN/nama_depan*
