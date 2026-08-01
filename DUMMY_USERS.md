# 📋 PANDAI — Akun Dummy untuk Testing

> Semua akun menggunakan password yang sama: **`password123`**

---

## 🔑 Password Universal

```
password123
```

---

## 👤 1. SUPER ADMIN

| Email | Nama | Password |
|-------|------|----------|
| `superadmin@pandai.id` | Super Admin PANDAI | `password123` |

> Akses: Dashboard Super Admin, Manajemen Sekolah, dll.

---

## 🏫 2. ADMIN SEKOLAH

### SMA Negeri 1 Makassar

| Email | Nama | Password |
|-------|------|----------|
| `admin.sman1@pandai.id` | Hj. Siti Rahmawati, S.Pd. | `password123` |

> NPSN: 40201234 | Akreditasi: A | Plan: **Pro**

### SMK Negeri 2 Surabaya

| Email | Nama | Password |
|-------|------|----------|
| `admin.smkn2@pandai.id` | Drs. Budi Prasetyo | `password123` |

> NPSN: 20504567 | Akreditasi: A | Plan: **Starter**

---

## 👩‍🏫 3. GURU

### SMA Negeri 1 Makassar

| Email | Nama | Password |
|-------|------|----------|
| `guru.sman1@pandai.id` | Andi Mustafa, S.Pd., M.Si. | `password123` |

### SMK Negeri 2 Surabaya

| Email | Nama | Password |
|-------|------|----------|
| `guru.smkn2@pandai.id` | Linda Permata, S.Kom., M.Pd. | `password123` |

---

## 👨‍🎓 4. SISWA

### SMA Negeri 1 Makassar — XII IPA 1

| Email | Nama | Password |
|-------|------|----------|
| `ahmad.sman1@pandai.id` | Ahmad Fadli Rahman | `password123` |
| `siti.sman1@pandai.id` | Siti Nurhaliza Putri | `password123` |
| `rudi.sman1@pandai.id` | Rudi Hartono | `password123` |

### SMA Negeri 1 Makassar — XII IPA 2

| Email | Nama | Password |
|-------|------|----------|
| `dewi.sman1@pandai.id` | Dewi Anggraeni | `password123` |
| `farhan.sman1@pandai.id` | Farhan Maulana | `password123` |

### SMK Negeri 2 Surabaya — XII TKJ 1

| Email | Nama | Password |
|-------|------|----------|
| `bagus.smkn2@pandai.id` | Bagus Saputra | `password123` |
| `rina.smkn2@pandai.id` | Rina Wati | `password123` |
| `joko.smkn2@pandai.id` | Joko Widodo Putra | `password123` |

### SMK Negeri 2 Surabaya — XII RPL 1

| Email | Nama | Password |
|-------|------|----------|
| `maya.smkn2@pandai.id` | Maya Indah | `password123` |
| `dimas.smkn2@pandai.id` | Dimas Prayoga | `password123` |

---

## 🏫 Data Sekolah

| Sekolah | Kode | NPSN | Plan | Akreditasi | Jenjang |
|---------|------|------|------|------------|---------|
| SMA Negeri 1 Makassar | SMAN1-MKS | 40201234 | Pro | A | SMA |
| SMK Negeri 2 Surabaya | SMKN2-SBY | 20504567 | Starter | A | SMK |

---

## 📋 Data Rombel (Kelas)

| Kelas | Grade | Tahun Ajaran | Sekolah |
|-------|-------|--------------|---------|
| XII IPA 1 | 12 | 2024/2025 | SMA Negeri 1 Makassar |
| XII IPA 2 | 12 | 2024/2025 | SMA Negeri 1 Makassar |
| XII TKJ 1 | 12 | 2024/2025 | SMK Negeri 2 Surabaya |
| XII RPL 1 | 12 | 2024/2025 | SMK Negeri 2 Surabaya |

---

## 📚 Data Mata Pelajaran

| Kode | Nama | Tipe |
|------|------|------|
| bindo | Bahasa Indonesia | Wajib |
| bing | Bahasa Inggris | Wajib |
| mat | Matematika | Wajib |
| fis | Fisika | Pilihan |
| kim | Kimia | Pilihan |
| bio | Biologi | Pilihan |
| eko | Ekonomi | Pilihan |
| sos | Sosiologi | Pilihan |
| sej | Sejarah | Pilihan |
| geo | Geografi | Pilihan |

---

## 🔧 Reset & Re-seed

Jika ingin mengosongkan database dan mengisi ulang data dummy:

```bash
# Hapus database lama
rm db/custom.db

# Push schema ulang
bun run db:push

# Jalankan seed
bun run seed
```

> ⚠️ Perintah di atas akan **menghapus semua data** termasuk sekolah dan user yang sudah terdaftar.

---

## 🎯 Ringkasan

| Kategori | Jumlah |
|----------|--------|
| Total User | 15 (1 Super Admin + 2 Admin + 2 Guru + 10 Siswa) |
| Sekolah | 2 |
| Rombel | 4 |
| Mata Pelajaran | 10 |
| Sub Topik | 30+ |

---

*File ini dibuat otomatis oleh seed script `prisma/seed.ts`*
*Diperbarui: Juli 2025*
