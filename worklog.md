---
Task ID: R31
Agent: Main Agent
Task: Checklist & Persiapan Deployment Production (Soft-Launch)

Work Log:
- B1: Discovered .env was tracked in git (CRITICAL). Removed from tracking, updated .gitignore, moved hardcoded salt to PASSWORD_SALT env var, created .env.example
- B2: Production build succeeded (44.7s, 13MB, 0 errors). Production start OOM in sandbox (4GB RAM) — not a code issue
- B3: Added production guard to /api/seed (403 in production), SUPER_ADMIN auth guard, created scripts/reset-db.ts, audited DB (681 demo records)
- B4: Created DEPLOYMENT.md with full deployment guide, onboarding flow, monitoring, PostgreSQL migration path
- B5: All 4 commits pushed to origin

Stage Summary:
- 4 commits pushed: 7cad838, 6d0d4c0, 3ad16cc, f4fbc0c
- Critical security fix: .env removed from git tracking
- Production ready: build succeeds, seed guarded, reset script ready, documentation complete

---
Task ID: R32
Agent: Main Agent
Task: Diagnosis "Username Tidak Terdaftar" + Stabilkan Server Sandbox

Work Log:
- Diagnosed empty DB: 0 records across all tables. Root cause: R31-B1 `git rm --cached .env` + db:push recreated DB file fresh
- Fixed prisma/seed.ts to use PASSWORD_SALT env var instead of hardcoded salt
- Reseeded: 25 users, 2 schools, 4 classes, 10 subjects, 67 topics
- Verified login works via production build + curl in single bash call
- Added productionBrowserSourceMaps: false to next.config.ts

Stage Summary:
- 1 commit pushed: a666dc3
- DB restored with demo data, all logins verified working
- Rate limiting verified: 429 after 3 rapid attempts

---
## POLA KERJA STABIL DI SANDBOX INI

**HANYA gunakan production build (`bun run build && bun run start`) dalam SATU bash call bersama pengujiannya.**

Jangan pakai `next dev` / Turbopack — sudah berkali-kali terbukti lebih berat & OOM di sandbox 4GB RAM.

Pola yang terbukti stabil:
```bash
# 1. Build (terpisah, ~45 detik, 768MB max)
rm -rf .next && NODE_OPTIONS="--max-old-space-size=768" npx next build

# 2. Start + Test DALAM SATU BASH CALL
NODE_OPTIONS="--max-old-size=1536" npx next start -p 3000 > /tmp/srv.log 2>&1 &
PID=$!
sleep 8  # tunggu "Ready"
# ... jalankan semua curl test di sini ...
kill $PID 2>/dev/null
```

**JANGAN pisah start-server dan test-nya jadi command terpisah**, karena server akan mati begitu bash call pertama selesai.

Untuk test API baru tanpa UI → pakai curl langsung ke endpoint. Jangan gunakan Agent Browser yang lebih berat resource.
