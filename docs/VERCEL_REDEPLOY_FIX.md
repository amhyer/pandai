# Vercel redeploy: reproducible, database-independent builds

## Fixes

1. **One installer for Vercel and CI:** both explicitly use `npm ci --include=dev` and `package-lock.json`. The failed Speed Insights change updated the npm manifest/lockfile but not `bun.lock`; CI previously rejected it with `lockfile had changes, but lockfile is frozen`. Legacy Bun scripts/lockfile remain for existing tooling, but neither Vercel nor GitHub Actions uses them to install the application now. Do not manually edit lockfile dependency entries; use npm when adding/updating packages and commit both manifests.
2. **Consistent Node version:** package engines and GitHub Actions use Node 22. The project's `better-sqlite3@13` tooling requires Node >=22, so the previous open-ended >=20 declaration allowed an unsupported installer runtime.
3. **Offline font builds:** Geist/Geist Mono are bundled as local WOFF2 files with their licenses. Build no longer requests Google Fonts. Fonts and CSS variable names are retained.
4. **No database writes during build:** `build:vercel` now runs only `prisma generate && next build`. It no longer runs `prisma db push --accept-data-loss` or the super-admin create/reset script on every preview/redeploy. That separates compilation from database connectivity, schema changes, and account changes. The standard Prisma engine generation remains enabled in committed configuration.

## Deploy instructions

- Push/merge the changes from the working branch through the normal review flow. Redeploying an older commit will NOT include these fixes.
- Vercel uses repository `vercel.json`: Install Command `npm ci --include=dev`, Build Command `npm run build:vercel`, Node `22.x` from `package.json`. If a dashboard override conflicts, remove it or use these same settings.
- For the first deployment after changing schema (including the new `StudentNote` table), back up the database, verify the target database in a trusted environment, and explicitly run:

  ```sh
  npm run db:deploy-schema
  ```

  This is `prisma db push` **without** accepting data loss. Stop and investigate if Prisma requests destructive changes. Do this once for the intended environment, not automatically on every preview build. The repository's legacy SQLite migration lock has not been re-baselined for PostgreSQL; do not substitute `migrate deploy` blindly.
- Creating/resetting a super-admin account is a separate, deliberate operation, not part of deployment. Do not run the legacy account bootstrap script merely to fix a build.
- Configure the runtime's `DATABASE_URL` and authentication secrets in Vercel environment settings as usual. A successful database-independent build does not prove these runtime values or tables are correct.

## Regression checks

```sh
node --test tests/deployment-config.test.mjs
npm run test:school-features
npm run test:security
npm run build:vercel
```

In the sandbox, standard engine downloads are unavailable. Local compilation was verified using a generated engine-less Prisma client via process-local test environment overrides. Those overrides are NOT saved in package.json, CI, or Vercel configuration and must NOT be set in production. No production database changes or deployment are performed by the regression tests.

The Next.js configuration still skips the project's pre-existing TypeScript errors; successful compilation is not a claim that the full type check is clean.
