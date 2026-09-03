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

if (failures.length) {
  console.error('\n❌ Static security checks failed:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('\n✅ Static security checks passed');
