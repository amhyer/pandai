#!/usr/bin/env node
/**
 * Static security tests for PANDAI.
 *
 * Runs in CI with zero external dependencies. It intentionally inspects
 * tracked source files only (never runtime secrets or network calls).
 *
 * Run locally:
 *   node tests/security-static.test.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SRC = join(ROOT, 'src');
const failures = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function read(p) {
  return readFileSync(p, 'utf8');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function findFiles(dir, ext) {
  return walk(dir).filter((f) => extname(f) === ext);
}

const sourceFiles = findFiles(SRC, '.ts').concat(findFiles(SRC, '.tsx'));
const apiRouteFiles = findFiles(join(SRC, 'app', 'api'), '.ts').filter((f) => f.endsWith('route.ts'));

// ─── 1. Sensitive env files must never be tracked ────────────────────────
const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const leakedTracked = tracked.filter((p) => {
  const name = basename(p);
  if (name === '.env.example' || name.startsWith('.env.example.')) return false;
  return /^\.env/.test(name);
});
assert(
  leakedTracked.length === 0,
  `Git tracks sensitive env files: ${leakedTracked.join(', ')}`
);

// ─── 2. Hardcoded credentials / secret values ────────────────────────────
const secretPatterns = [
  {
    pattern: /\bDEFAULT_TOKEN\s*=\s*['"][^'"]+['"]/,
    label: 'hardcoded default token',
  },
  {
    pattern:
      /\b(JWT_SECRET|PASSWORD_SALT|DATABASE_URL|OPENAI_API_KEY|UPSTASH_REDIS_REST_TOKEN)\s*[:=]\s*['"][A-Za-z0-9_+./-]{12,}/,
    label: 'hardcoded credential assignment',
  },
];

for (const file of sourceFiles) {
  const content = read(file);
  for (const { pattern, label } of secretPatterns) {
    if (pattern.test(content)) {
      failures.push(`[${label}] ${relative(ROOT, file)}`);
    }
  }
}

// ─── 3. Protected API routes must use the auth layer ─────────────────────
const sensitiveRoutePatterns = [
  /users\/\[\d+\]|users\/\[id\]\/reset-password/,
  /schools\/\[\d+\]\/admin-account/,
  /schools\/\[\d+\]\/approve/,
  /exam-items/,
  /notifications/,
  /announcements/,
  /dapodik\/connect/,
  /dapodik\/proxy/,
  /dapodik-proxy/,
  /dapodik\/status/,
  /schools\/lookup-local/,
  /timetable\/bulk/,
  /import\/template/,
  /backup/,
  /restore/,
  /reset/,
];

for (const file of apiRouteFiles) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const content = read(file);
  const isSensitive = sensitiveRoutePatterns.some((re) => re.test(rel));
  if (!isSensitive) continue;
  assert(
    /\b(requireRole|requireAuth|getCurrentUser|verifySession)\s*\(/.test(content),
    `Protected route missing auth helper: ${rel}`
  );
}

// ─── 4. Rate limiter must protect login, AI, and write routes ────────────
const proxyContent = read(join(SRC, 'proxy.ts'));
assert(
  /\bRATE_AI\b/.test(proxyContent),
  'src/proxy.ts does not rate-limit AI routes'
);
assert(
  /\bRATE_POST\b/.test(proxyContent),
  'src/proxy.ts does not rate-limit write routes'
);

const loginRoute = read(join(SRC, 'app', 'api', 'auth', 'login', 'route.ts'));
assert(
  /checkRateLimitAsync|checkRateLimit|RATE_LOGIN/.test(loginRoute),
  'login API route does not use the rate limiter'
);

const aiHelper = read(join(SRC, 'lib', 'ai-helper.ts'));
assert(
  /checkRateLimitAsync|checkRateLimit|RATE_AI/.test(aiHelper),
  'AI helper does not apply the burst rate limiter'
);

// ─── 5. User mutation routes must not echo raw credentials ───────────────
for (const file of apiRouteFiles) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (!/reset-password|admin-account/.test(rel)) continue;
  const content = read(file);
  assert(
    !/status:\s*200[^}]*newPassword/.test(content) &&
      !/return\s+NextResponse\.json\(\{[^}]*newPassword/.test(content),
    `Reset-password route may return raw newPassword: ${rel}`
  );
}

// ─── 6. XSS hygiene for raw HTML injection ───────────────────────────────
for (const file of sourceFiles) {
  const content = read(file);
  if (!/dangerouslySetInnerHTML/.test(content)) continue;
  // Benign usage: injecting generated CSS from ui/chart.tsx.
  if (relative(ROOT, file) === 'src/components/ui/chart.tsx') continue;
  assert(
    /DOMPurify\.sanitize|sanitizeHtml/.test(content),
    `Raw dangerouslySetInnerHTML without sanitizer: ${relative(ROOT, file)}`
  );
}

// ─── 7. Credential generation script safety ──────────────────────────────
const genScript = read(join(ROOT, 'scripts', 'generate-credentials.sh'));
assert(/chmod\s+600/.test(genScript), 'generator does not set 0600 on .env.local');
assert(
  /openssl rand -hex 32|random_hex 32/.test(genScript),
  'generator does not use a 256-bit random source'
);
assert(
  !/^echo .*(JWT_SECRET|PASSWORD_SALT)=/m.test(genScript),
  'generator may print secret values to stdout'
);

// ─── 7b. School self-registration approval flow invariants ───────────────
const registerSchool = read(
  join(SRC, 'app', 'api', 'auth', 'register-school', 'route.ts')
);
assert(
  /status:\s*'pending'|status:\s*"pending"/.test(registerSchool) &&
    /pendingApproval:\s*true/.test(registerSchool),
  'Self-registered schools are not created as approval-pending'
);

const approveSchool = read(
  join(SRC, 'app', 'api', 'schools', '[id]', 'approve', 'route.ts')
);
assert(
  /requireRole\s*\(\s*_request\s*,\s*\[\s*['"]SUPER_ADMIN/.test(approveSchool),
  'School approval route is not restricted to SUPER_ADMIN'
);
assert(
  /status:\s*'active'|status:\s*"active"/.test(approveSchool),
  'School approval route does not activate the school'
);

const schoolsRoute = read(join(SRC, 'app', 'api', 'schools', 'route.ts'));
assert(
  /status:\s*'deleted'|status:\s*"deleted"/.test(schoolsRoute) &&
    /isActive:\s*false/.test(schoolsRoute),
  'School soft-delete does not deactivate its admin users'
);

// ─── 8. Secret validation helpers must reject placeholders in prod ───────
const authLib = read(join(SRC, 'lib', 'auth.ts'));
const constantsLib = read(join(SRC, 'lib', 'constants.ts'));
assert(
  /process\.env\.NODE_ENV.*production|NODE_ENV.*production/.test(authLib) &&
    /length\s*<\s*32|\.length\s*<\s*32/.test(authLib),
  'JWT secret production validation is missing'
);
assert(
  /process\.env\.NODE_ENV.*production|NODE_ENV.*production/.test(constantsLib) &&
    /length\s*<\s*32|\.length\s*<\s*32/.test(constantsLib),
  'Password salt production validation is missing'
);

// ─── 8b. Edge page-route auth guard ─────────────────────────────────────
const proxyAuth = read(join(SRC, 'lib', 'proxy-auth.ts'));
assert(
  /jwtVerify/.test(proxyAuth) && /pandai_session/.test(proxyAuth),
  'src/lib/proxy-auth.ts does not provide an edge-safe session verifier'
);
assert(
  /verifyProxySession/.test(proxyContent) &&
    /getSessionTokenFromRequest/.test(proxyContent) &&
    /admin-school/.test(proxyContent) &&
    /accounts/.test(proxyContent),
  'src/proxy.ts does not protect role/dashboard page routes at the edge'
);

// ─── 9. App Router feature segments have route boundaries ────────────────
const featureSegments = [
  'admin-school',
  'admin-school/accounts',
  'guru',
  'guru/accounts',
  'kepala-sekolah',
  'kepala-sekolah/accounts',
  'siswa',
  'siswa/accounts',
  'ortu',
  'ortu/accounts',
  'accounts',
  'download',
  'download/dapodik',
];

for (const segment of featureSegments) {
  const dir = join(SRC, 'app', segment);
  for (const boundary of ['loading.tsx', 'error.tsx', 'not-found.tsx']) {
    try {
      readFileSync(join(dir, boundary), 'utf8');
    } catch {
      failures.push(`Missing route boundary ${segment}/${boundary}`);
    }
  }
}

// ─── 10. Route-per-feature migration invariants ──────────────────────────
const routeMap = read(join(SRC, 'lib', 'route-map.ts'));
assert(
  /export function getRoleRoute|export function getAdminSchoolView|export function getSuperAdminView/.test(routeMap) &&
    /admin-school\//.test(routeMap) &&
    /accounts\//.test(routeMap),
  'route-map.ts does not expose admin-school/super-admin feature routes'
);

const appLayout = read(join(SRC, 'components', 'layout', 'app-layout.tsx'));
assert(
  /getRoleRoute/.test(appLayout) && /router\.push/.test(appLayout),
  'AppLayout does not navigate migrated features through the App Router'
);

const superAdminRoot = read(join(SRC, 'app', 'accounts', 'page.tsx'));
assert(
  /RouteShell/.test(superAdminRoot) && /initialView="dashboard"/.test(superAdminRoot),
  'accounts root page is not the RouteShell super-admin dashboard'
);

const superAdminFeature = read(join(SRC, 'app', 'accounts', '[feature]', 'page.tsx'));
assert(
  /useParams/.test(superAdminFeature) &&
    /getSuperAdminView/.test(superAdminFeature) &&
    /RouteShell/.test(superAdminFeature) &&
    /AppRouteNotFound/.test(superAdminFeature),
  'accounts dynamic feature page does not map segments to views'
);

const adminSchoolRoot = read(join(SRC, 'app', 'admin-school', 'page.tsx'));
assert(
  /RouteShell/.test(adminSchoolRoot) && /initialView="dashboard"/.test(adminSchoolRoot),
  'admin-school root page is not the RouteShell dashboard'
);

const adminSchoolFeature = read(join(SRC, 'app', 'admin-school', '[feature]', 'page.tsx'));
assert(
  /useParams/.test(adminSchoolFeature) &&
    /getAdminSchoolView/.test(adminSchoolFeature) &&
    /RouteShell/.test(adminSchoolFeature) &&
    /AppRouteNotFound/.test(adminSchoolFeature),
  'admin-school dynamic feature page does not map segments to views'
);

const roleFeaturePages = [
  ['src/app/guru/[feature]/page.tsx', 'getGuruView', 'GURU'],
  ['src/app/siswa/[feature]/page.tsx', 'getSiswaView', 'SISWA'],
  ['src/app/ortu/[feature]/page.tsx', 'getOrtuView', 'ORANG_TUA'],
  ['src/app/kepala-sekolah/[feature]/page.tsx', 'getKepalaSekolahView', 'KEPALA_SEKOLAH'],
];
for (const [rel, viewFn, role] of roleFeaturePages) {
  const page = read(join(ROOT, rel));
  assert(
    /useParams/.test(page) &&
      new RegExp(viewFn).test(page) &&
      /RouteShell/.test(page) &&
      /AppRouteNotFound/.test(page) &&
      new RegExp(`['"]${role}['"]`).test(page),
    `${rel} is not a role feature route`
  );
}

const roleRootPages = [
  ['src/app/guru/page.tsx', 'GURU'],
  ['src/app/siswa/page.tsx', 'SISWA'],
  ['src/app/ortu/page.tsx', 'ORANG_TUA'],
  ['src/app/kepala-sekolah/page.tsx', 'KEPALA_SEKOLAH'],
];
for (const [rel, role] of roleRootPages) {
  const page = read(join(ROOT, rel));
  assert(
    /RouteShell/.test(page) &&
      new RegExp(`['"]${role}['"]`).test(page) &&
      /initialView="dashboard/.test(page),
    `${rel} is not the Dashboard RouteShell page for ${role}`
  );
}

const viewRouter = read(join(SRC, 'components', 'app', 'view-router.tsx'));
assert(
  /export function ViewRouter/.test(viewRouter) &&
    /React\.lazy/.test(viewRouter) &&
    /viewFromPathname/.test(viewRouter) &&
    /usePathname/.test(viewRouter),
  'ViewRouter is not URL-first'
);

const serverAuth = read(join(SRC, 'lib', 'server-auth.ts'));
assert(
  /cookies/.test(serverAuth) &&
    /verifySession/.test(serverAuth) &&
    /db\.user\.findUnique/.test(serverAuth) &&
    /getServerSessionUser/.test(serverAuth),
  'server-auth.ts does not load the active user for server components'
);

const prefetchedShell = read(join(SRC, 'components', 'app', 'prefetched-route-shell.tsx'));
assert(
  /AppLayout/.test(prefetchedShell) &&
    /ViewRouter/.test(prefetchedShell) &&
    /setUser/.test(prefetchedShell),
  'PrefetchedRouteShell does not seed the session from server data'
);

const serverProfilePage = read(join(SRC, 'app', 'accounts', 'profile', 'page.tsx'));
assert(
  /getServerSessionUser/.test(serverProfilePage) &&
    /PrefetchedRouteShell/.test(serverProfilePage) &&
    /SUPER_ADMIN/.test(serverProfilePage) &&
    /force-dynamic/.test(serverProfilePage),
  'Server Component profile route does not preload a SUPER_ADMIN session'
);

const serverPages = [
  ['src/app/admin-school/profile/page.tsx', 'ADMIN_SCHOOL', 'profile'],
  ['src/app/accounts/notifications/page.tsx', 'SUPER_ADMIN', 'notifications'],
  ['src/app/admin-school/notifications/page.tsx', 'ADMIN_SCHOOL', 'notifications'],
];
for (const [rel, role, initialView] of serverPages) {
  const page = read(join(ROOT, rel));
  assert(
    /getServerSessionUser/.test(page) &&
      /PrefetchedRouteShell/.test(page) &&
      new RegExp(`['"]${role}['"]`).test(page) &&
      new RegExp(initialView).test(page) &&
      /force-dynamic/.test(page),
    `${rel} is not a Server Component route for ${role} (${initialView})`
  );
}

const authenticatedApp = read(join(SRC, 'app', 'authenticated-app.tsx'));
assert(
  authenticatedApp.includes("from '@/components/app/view-router'"),
  'authenticated-app.tsx no longer reuses the extracted ViewRouter'
);

const routeShell = read(join(SRC, 'components', 'app', 'route-shell.tsx'));
assert(
  /restoreSession/.test(routeShell) &&
    /api\/auth\/me/.test(routeShell) &&
    /AppLayout/.test(routeShell) &&
    /ViewRouter/.test(routeShell),
  'RouteShell does not restore session and render the shared app shell'
);

const roleLayouts = [
  ['src/app/admin-school/layout.tsx', 'ADMIN_SCHOOL'],
  ['src/app/guru/layout.tsx', 'GURU'],
  ['src/app/kepala-sekolah/layout.tsx', 'KEPALA_SEKOLAH'],
  ['src/app/siswa/layout.tsx', 'SISWA'],
  ['src/app/ortu/layout.tsx', 'ORANG_TUA'],
  ['src/app/accounts/layout.tsx', 'SUPER_ADMIN'],
];
for (const [rel, role] of roleLayouts) {
  const layout = read(join(ROOT, rel));
  assert(
    /verifySession/.test(layout) && new RegExp(`'${role}'`).test(layout),
    `${rel} does not enforce ${role} on the server`
  );
}

const routePages = [
  ['src/app/admin-school/accounts/page.tsx', 'accounts', 'ADMIN_SCHOOL'],
  ['src/app/guru/accounts/page.tsx', 'dashboard-guru', 'GURU'],
  ['src/app/kepala-sekolah/accounts/page.tsx', 'dashboard-kepsek', 'KEPALA_SEKOLAH'],
  ['src/app/siswa/accounts/page.tsx', 'dashboard-siswa', 'SISWA'],
  ['src/app/ortu/accounts/page.tsx', 'dashboard-ortu', 'ORANG_TUA'],
  ['src/app/accounts/page.tsx', 'dashboard', 'SUPER_ADMIN'],
];
for (const [rel, initialView, role] of routePages) {
  const page = read(join(ROOT, rel));
  assert(
    /RouteShell/.test(page) &&
      new RegExp(initialView).test(page) &&
      new RegExp(`['"]${role}['"]`).test(page),
    `${rel} is not a RouteShell page for ${role} (${initialView})`
  );
}

if (failures.length) {
  console.error('\n❌ Static security checks failed:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('\n✅ Static security checks passed');
