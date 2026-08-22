# RBAC Automated Tests

Suite pengujian Role-Based Access Control untuk PANDAI.

## Struktur

```
tests/rbac/
├── fixtures.ts          # ID deterministik
├── seed.ts              # Seed 2 sekolah + 6 role
├── helpers.ts           # sessionAs + api()
├── unit/
│   ├── auth.test.ts     # JWT + password
│   └── scope.test.ts    # requireStudentScope / requireSchoolScope
├── api/
│   └── p0-idor.test.ts  # IDOR & privilege (butuh server)
└── README.md
```

## Lokal

```bash
# 1. Env test
cp .env.example .env
# set DATABASE_URL=file:./db/rbac-test.db
# set JWT_SECRET=ci_rbac_jwt_secret_min_32_chars_long!!

mkdir -p db
bunx prisma generate
bunx prisma db push --accept-data-loss
bun run tests/rbac/seed.ts

# 2. Unit saja (tanpa server)
bun test tests/rbac/unit

# 3. API (server harus jalan)
bun run build && bun run start &
BASE_URL=http://127.0.0.1:3000 bun test tests/rbac/api
```

Atau pakai script package.json:

```bash
bun run test:rbac:unit
bun run test:rbac:api   # butuh BASE_URL + server
bun run test:rbac       # unit only by default locally
```

## CI

Workflow: `.github/workflows/rbac.yml`

- Trigger: PR/push yang mengubah `src/app/api/**`, `auth.ts`, `scope.ts`, atau `tests/rbac/**`
- Job 1: unit (seed + bun test unit)
- Job 2: API (build + start + P0 IDOR tests)

## Menambah case

1. Tambah data di `seed.ts` jika perlu resource baru
2. Tambah assert di `api/p0-idor.test.ts` atau file suite baru
3. Setelah fix P0, ubah soft-assert (warn) menjadi `expect(status).toBe(403)` ketat
