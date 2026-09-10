# Kelengkapan fitur role — tahap 1

## Yang diimplementasikan

- `/guru/siswa`: daftar siswa kelas yang ditugaskan, tambah akun siswa, edit profil dasar, import CSV/Excel ke kelas tersebut, pencarian siswa sekolah yang belum memiliki kelas, memasukkan siswa tanpa kelas, dan mengeluarkan siswa dari kelas.
- `/guru/catatan`: CRUD catatan **apresiasi / perhatian / umum**. Guru hanya dapat mengubah/menghapus catatan buatannya untuk siswa yang masih berada dalam kelas yang dapat diaksesnya.
- `/ortu/catatan`: baca catatan anak yang terhubung melalui `parentId`; tidak ada izin tulis.
- `/kepala-sekolah/catatan`: baca catatan siswa dalam sekolah sendiri; tidak ada izin tulis.
- `/kepala-sekolah/aktivitas`: log sekolah sendiri, pencarian pengguna/tindakan/detail, filter tanggal WITA, dan pagination server. Tidak menyediakan operasi perubahan log.
- Selector `/api/users?role=SISWA` sekarang bisa digunakan guru, dengan proyeksi kolom aman dan pembatasan kelas. Ini juga memperbaiki pengambilan daftar siswa pada fitur guru yang sudah memakai endpoint tersebut.
- `/api/classes` untuk guru dibatasi ke kelas tugasnya. Helper `requireStudentScope` dan `getAccessibleStudentIds` menerapkan cakupan kelas untuk guru.

## Keputusan akses dan perilaku

1. Kelas guru diambil dari `TeacherAssignment` yang mencantumkan `teacherId`, `schoolId`, dan `classId`, atau `Class.waliKelasId`. Kelas selalu diverifikasi berada di sekolah guru. Tidak ada fallback ke seluruh sekolah. Data penugasan lama yang tidak lengkap harus diperbaiki Admin Sekolah.
2. **Ambil dari Sekolah** merupakan pengecualian pencarian terbatas: hanya siswa aktif tanpa kelas di sekolah sendiri, minimum dua karakter, maksimal 20 hasil, hanya ID/nama/NISN. Siswa kelas guru lain tidak ditampilkan atau dipindahkan. Update bersyarat (`classId: null`) mencegah perebutan siswa oleh dua permintaan bersamaan.
3. **Keluarkan** hanya mengubah `classId` menjadi `null`. Akun, relasi orang tua, nilai, dan riwayat tidak dihapus. Setelah itu siswa bisa dimasukkan kembali melalui pencarian siswa tanpa kelas.
4. Tambah siswa manual membuat password acak sementara yang ditampilkan sekali dan wajib diganti saat login pertama. Password tidak dicatat di log. Nama orang tua hanya informasi profil; pembuatan/link akun orang tua tetap melalui admin.
5. Edit profil oleh guru tidak mengubah role, sekolah, NISN/username, password, maupun relasi orang tua. Koreksi identitas login dilakukan admin.
6. Import guru wajib `type=siswa` dan `classId` yang dapat diaksesnya. Import tidak membuat kelas baru atau memindahkan NISN yang sudah terdaftar. Format/mekanisme akun mengikuti import yang sudah ada (password awal NISN, wajib diganti).
7. Catatan dibaca orang tua dan kepala sekolah, bukan catatan privat guru. Konten tidak dimasukkan ke log aktivitas; log hanya mencatat ID/kategori/tindakan. Catatan lama tetap disimpan bila kelas dihapus (`classId` menjadi null).
8. Aksi tambah/edit/ambil/keluarkan siswa dan CRUD catatan mencatat aktivitas dalam transaksi database yang sama. Import mencatat ringkasan setelah selesai.

## Database dan deployment

Ada model baru **`StudentNote`** di `prisma/schema.prisma`, berikut relasi ke sekolah, siswa, penulis, dan kelas. Tidak ada perubahan/penghapusan data yang dijalankan terhadap database produksi pada sesi implementasi.

Build Vercel kini tidak menjalankan perubahan database otomatis. Lihat [perbaikan redeploy](VERCEL_REDEPLOY_FIX.md).

Sebelum deployment:

1. Backup database dan verifikasi `DATABASE_URL` di lingkungan deployment; jangan menaruh nilainya di chat atau Git.
2. Review perubahan schema pada database staging terlebih dahulu. Repository saat ini memakai PostgreSQL dan alur `db push`; folder migration masih memiliki lock SQLite lama, sehingga jangan menjalankan `migrate deploy` tanpa pembenahan baseline migrasi terlebih dahulu.
3. Pada lingkungan yang sudah benar, sinkronkan schema dengan `npx prisma db push` **tanpa `--accept-data-loss`**, lalu jalankan `npx prisma generate`. Jika Prisma meminta reset atau penghapusan data, hentikan dan periksa drift schema.
4. Build/deploy aplikasi menggunakan prosedur proyek yang telah direview. Jangan menjalankan skrip deployment dengan flag penghapusan data tanpa memeriksa isinya.
5. Smoke test memakai dua guru berbeda kelas, orang tua dengan anak berbeda, dan kepala sekolah di sekolah berbeda.

Tanpa tabel baru, menu catatan akan menampilkan kegagalan permintaan, bukan data contoh atau pesan sukses palsu. Tidak ada migrasi atau deployment produksi yang dilakukan oleh perubahan ini.

## Pengujian

```sh
npm run test:school-features
npm run test:security
```

API tests menggunakan database double dan JWT asli di lingkungan test; UI tests memakai JSDOM. Tidak ada test yang menulis ke database produksi. Tes meliputi batas kelas/sekolah/anak, izin tulis, input invalid, mengambil siswa bersyarat, proyeksi data tanpa kredensial, import per kelas, kegagalan simpan catatan, serta navigasi/pagination.

Pemeriksaan TypeScript seluruh repository masih memiliki error lama di bagian lain. Jangan menganggap tes tahap ini sebagai audit keamanan atau uji end-to-end produksi untuk seluruh aplikasi.

## Belum termasuk tahap ini

- Kode akses per role, konfigurasi modul yang persisten, KKM/bobot sekolah, identitas sekolah untuk admin, Google Sheets nyata, dan backup/restore JSON.
- Perbaikan alur buat tryout, analisis butir soal/TKA, perkembangan siswa terpadu, rekap semester, dan komponen rapor lama.
- Seluruh perbaikan permission lama pada endpoint analitik, materi, nilai, penilaian, dan daftar agregat. Helper cakupan siswa sudah diperketat, tetapi endpoint yang tidak memakai helper tersebut masih memerlukan audit/perbaikan tersendiri.
- Penyelarasan API kehadiran orang tua dan penanganan respons penyimpanan 7 kebiasaan.
- Mode mandiri/sekolah dan rekap partisipasi orang tua.

Tahap ini melengkapi tiga kelompok fitur baru, **bukan menyatakan seluruh daftar audit sudah selesai**.
