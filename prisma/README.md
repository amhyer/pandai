# Skema Prisma

## File yang dipakai

**`prisma/schema.prisma`** adalah satu-satunya skema yang dibaca Prisma CLI
(`prisma db push`, `prisma generate`, `prisma migrate …`) karena berada di path
default. **Semua perubahan skema dilakukan di file ini.**

- Provider: `postgresql`
- Jumlah model: 43

## File lain di folder ini

Semua file di bawah ini **tidak** dibaca Prisma CLI. Mereka disisakan sebagai
arsip dan **sudah tertinggal** dari `schema.prisma` — jangan mengeditnya dan
jangan menyalinnya menimpa `schema.prisma`.

| File | Provider | Model | Keterangan |
|---|---|---|---|
| `schema.prisma` | postgresql | 43 | **Authoritative** — dipakai CLI |
| `schema.postgresql.prisma` | postgresql | 36 | Arsip; identik dengan `schema.prisma.bak` |
| `schema.prisma.bak` | postgresql | 36 | Arsip; identik dengan `schema.postgresql.prisma` |
| `schema.production.prisma` | postgresql | 35 | Arsip |
| `schema.sqlite.prisma` | sqlite | 36 | Arsip varian SQLite |
| `schema.sqlite.prisma.bak` | sqlite | 36 | Identik dengan `schema.sqlite.prisma` |
| `schema.sqlite-backup.prisma` | sqlite | 35 | Arsip |

Model yang hanya ada di `schema.prisma` (tidak ada di varian lain):
`RaporNote`, `Notification`, `Announcement`, `GoogleSheetsConfig`, `AppSetting`,
`SystemSetting`, `StudentNote`.

## Seed

| File | Untuk | Cara menjalankan |
|---|---|---|
| `seed.ts` | Skema aktif. **Melakukan `deleteMany()`** di banyak tabel sebelum mengisi data dummy, dan meng-hash password dengan SHA-256 + `PASSWORD_SALT`. | `npm run seed` (memakai `bun`) |
| `seed.postgresql.ts` | Varian idempoten (upsert, tanpa `deleteMany`) dengan hash bcrypt. | `npx tsx prisma/seed.postgresql.ts` |

Keduanya membuat akun demo dengan password `password123` (orang tua: `123`).
Jangan menjalankan seed di database produksi.

## Migrasi

`prisma/migrations/` saat ini hanya berisi `migration_lock.toml` — belum ada
file migrasi. Karena itu `prisma migrate deploy` tidak akan membuat tabel apa
pun; skema diterapkan dengan `prisma db push`
(lihat `CPANEL_DEPLOYMENT_RUNBOOK.md`).
