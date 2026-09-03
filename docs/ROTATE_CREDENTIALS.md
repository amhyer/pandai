# Rotasi Credential — Panduan Operasional

> Dokumen ini bersifat internal. Jangan menyalin credential asli ke dalam file, commit, maupun ke dalam issue GitHub.

## 1. Kapan harus rotasi

Rotasi wajib dilakukan jika:

- File `.env`, `.env.local`, atau `.env.production` pernah tereksekusi di Git history.
- Credential terlihat di screenshot, issue, pull request, atau laporan audit.
- `JWT_SECRET` / `PASSWORD_SALT` masih bernilai default / placeholder.
- Ada anggota tim yang keluar, atau layanan hosting pernah diakses pihak tidak berwenang.
- Aplikasi di-deploy ke environment baru (staging / production).

---

## 2. Generate credential aplikasi yang baru

Jangan pernah menulis secret secara manual. Jalankan script yang ada di repo:

```bash
chmod +x scripts/generate-credentials.sh
./scripts/generate-credentials.sh --force
```

Script ini menghasilkan `.env.local` yang **gitignored** dan tidak menampilkan nilai secret ke konsol.

Hasilnya:

```env
JWT_SECRET=<64 hex random>
PASSWORD_SALT=<64 hex random>
```

Kedua nilai harus:

- Panjang 64 karakter hex.
- Berbeda satu sama lain.
- Tidak pernah di-commit.
- Di-copy ke environment variables di platform hosting (Vercel / self-hosted).

> Catatan: `PASSWORD_SALT` saat ini hanya dipakai untuk verifikasi password legacy SHA-256. Jika tidak ada user legacy, Anda tetap bisa mengubahnya. Jika ada user legacy, pastikan nilai lama disimpan sementara di tempat aman agar akun tersebut tidak terkunci selama migrasi.

---

## 3. Rotasi password database

### 3a. Neon PostgreSQL

1. Buka https://console.neon.tech dan login.
2. Pilih project PANDAI.
3. Buka **Settings** → **Members**.
4. Untuk akun/database yang relevan, pilih **Rotate password** (atau buat password baru pada **Connection Details** bila menu rotasi tidak tersedia).
5. Salin **Connection string / DATABASE_URL** yang baru.
6. Perbarui:
   - Vercel Environment Variables → `DATABASE_URL`
   - `.env.local` → `DATABASE_URL`
   - Backups/script yang memakai `DATABASE_URL` eksplisit.
7. Restart server/preview setelah update.

> Jangan pernah menampilkan atau meng-copy `DATABASE_URL` ke channel publik. Gunakan Vercel/Neon secret manager.

### 3b. Vercel

1. Buka https://vercel.com/dashboard.
2. Masuk ke project **pandai**.
3. Buka **Settings** → **OIDC Token**.
4. Pilih **Regenerate**.
5. Setelah regenerasi:
   - Update setiap environment variable yang bergantung pada OIDC token.
   - Jalankan `vercel env pull` pada local jika ingin menyinkronkan.
6. Trigger redeploy agar change diterapkan.

---

## 4. Rotasi JWT_SECRET dan PASSWORD_SALT

Setelah generate secret baru:

1. Upload ke platform hosting:
   - Vercel: **Settings** → **Environment Variables** → edit `JWT_SECRET` & `PASSWORD_SALT`.
   - Self-hosted: update `.env` / Docker secret.
2. Restart semua instance.
3. Konsekuensi: semua sesi JWT lama menjadi invalid. User akan harus login kembali setelah redeploy.

---

## 5. Membersihkan credential dari Git history

Gunakan script aman berikut agar tidak menghapus `.env.example`:

```bash
# 1. Lihat file apa saja yang bisa terdeteksi
./scripts/purge-git-secrets.sh --inspect

# 2. Pilih satu metode saja
./scripts/purge-git-secrets.sh --filter-repo --yes
# atau
./scripts/purge-git-secrets.sh --bfg --yes
```

Setelah script selesai:

- Checkout kembali `main`/branch aktif.
- Force-push **semua** branch yang mengandung history lama:

```bash
git push --force-with-lease origin main
git push --force-with-lease origin arena/01a064ff-pandai
```

- Beri tahu anggota tim untuk clone ulang repo agar tidak mempertahankan history lama.
- Jangan membagikan `git reflog`, bundle, atau backup repo yang masih berisi history lama.

> BFG dan git-filter-repo membersihkan history, tetapi credential yang sudah tersebar di luar repo (chat, screenshot, CI logs, backups) tidak ikut hilang. Hapus manual dan rotasi credential.

---

## 6. Checklist rotasi production

- [ ] `JWT_SECRET` baru (64 hex, random).
- [ ] `PASSWORD_SALT` baru (64 hex, random).
- [ ] `DATABASE_URL` baru di Neon, password database dirotasi.
- [ ] Vercel OIDC Token di-regenerate.
- [ ] Environment variables diupdate: Vercel, Docker, server self-hosted.
- [ ] Server/redeploy selesai.
- [ ] Login production berhasil dengan akun test.
- [ ] Git history sudah dipurge dengan script.
- [ ] Old credentials dihapus dari laptop, CI secrets, backup, catatan pribadi.
- [ ] Semua branch telah di-force-push.
- [ ] Tim diminta clone ulang.

---

## 7. Referensi

| Resource | URL |
|---|---|
| Neon Console | https://console.neon.tech |
| Vercel Dashboard | https://vercel.com/dashboard |
| BFG Repo-Cleaner | https://rtyley.github.io/bfg-repo-cleaner/ |
| git-filter-repo | https://github.com/newren/git-filter-repo |
