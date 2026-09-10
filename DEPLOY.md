# Pandai — Panduan Deploy

## 1. Persiapan

```bash
# Install Docker & Docker Compose (kalau belum ada)
# https://docs.docker.com/get-docker/

git clone <repo-url> && cd pandai
```

## 2. Deploy Pertama Kali

```bash
# Salin dan isi file env
cp .env.example .env
# Edit .env — isi DATABASE_URL, JWT_SECRET, PASSWORD_SALT

# Jalankan
docker compose up -d

# Terapkan skema database
# Catatan: prisma/migrations/ saat ini hanya berisi migration_lock.toml
# (belum ada file migrasi), jadi `prisma migrate deploy` tidak akan membuat
# tabel apa pun. Gunakan `db push`, konsisten dengan CPANEL_DEPLOYMENT_RUNBOOK.md.
docker compose exec app npx prisma db push
```

## 3. Update / Redeploy

```bash
git pull
docker compose build
docker compose up -d
```

## 4. Rollback

```bash
git checkout <commit-sebelumnya>
docker compose build
docker compose up -d
```

## 5. Cek Health

```bash
# Health endpoint
curl http://localhost:3000/api/health

# Lihat logs
docker compose logs -f app
```

## 6. Backup Database

```bash
docker exec db pg_dump -U pandai pandai > backup_$(date +%Y%m%d).sql
```
