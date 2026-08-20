# PANDAI — Deployment Checklist

## Prasyarat Server

- [ ] Node.js >= 18 (rekomendasi 20+)
- [ ] bun >= 1.3
- [ ] SQLite3 (built-in ke Node.js, tidak perlu install)
- [ ] Caddy / Nginx (reverse proxy)
- [ ] Domain + SSL certificate
- [ ] RAM >= 2 GB (rekomendasi 4 GB)

## Pre-Deploy

```bash
# 1. Clone & install
git clone https://github.com/amhyer/pandai.git
cd pandai
bun install

# 2. Environment
cp .env.example .env
# Edit .env — set JWT_SECRET, DATABASE_URL, dll

# 3. Database
bunx prisma db push
bun run prisma/seed.ts

# 4. Backup existing DB (jika ada)
bun scripts/backup.mjs

# 5. Build
NODE_OPTIONS='--max-old-space-size=4096' bun run build
```

## Deploy

```bash
# Pilih salah satu:

# Opsi A: Node.js langsung
NODE_OPTIONS='--max-old-space-size=2048' node .next/standalone/server.js -p 3000

# Opsi B: PM2
pm install -g pm2
pm2 start .next/standalone/server.js --name pandai -i max_memory_restart 2G

# Opsi C: Docker (jika ada Dockerfile)
docker build -t pandai .
docker run -d -p 3000:3000 --name pandai \
  -v ./db:/app/db \
  -e JWT_SECRET=your-secret \
  -e DATABASE_URL=file:./db/custom.db \
  pandai
```

## Post-Deploy Verification

```bash
# 1. Server running?
curl -f http://localhost:3000/api/health || echo 'FAIL'

# 2. Login works?
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | head -c 200

# 3. DB accessible?
bunx prisma db push --force-reset  # ONLY in dev!

# 4. Lint pass?
bun run lint
```

## Reverse Proxy (Caddy)

```
pandai.sekolah.sch.id {
    reverse_proxy localhost:3000
}
```

## Maintenance

```bash
# Backup DB
bun scripts/backup.mjs

# List backups
bun scripts/restore.mjs --list

# Restore
bun scripts/restore.mjs 2026-08-20T00-16-57

# Update code
git pull origin main
bun install
bunx prisma db push
NODE_OPTIONS='--max-old-space-size=4096' bun run build
pm2 restart pandai  # atau restart service
```

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| 502 Bad Gateway | Cek server jalan: `pm2 status` atau `ss -tlnp \| grep 3000` |
| OOM Killed | Kurangi `--max-old-space-size`, naikkan RAM, atau set `NODE_OPTIONS='--max-old-space-size=1024'` |
| Prisma error | `bunx prisma generate && bunx prisma db push` |
| PDF 500 error | Pastikan jspdf terinstall: `bun add jspdf` |
| Build lama | Hapus `.next` lalu rebuild: `rm -rf .next && bun run build` |
