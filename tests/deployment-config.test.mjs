import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const vercel = JSON.parse(read('vercel.json'));
const workflow = read('.github/workflows/ci.yml');

test('Vercel and CI install with the same npm lockfile, not an unrelated stale Bun lock', () => {
  assert.equal(vercel.installCommand, 'npm ci --include=dev');
  assert.match(workflow, /cache: npm/);
  assert.match(workflow, /npm ci --include=dev/);
  assert.doesNotMatch(workflow, /bun install|setup-bun|bun run build/);
  assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
});

test('Vercel and CI use Node 22, which satisfies the native SQLite tooling requirement', () => {
  assert.equal(pkg.engines.node, '22.x');
  assert.equal(lock.packages[''].engines.node, pkg.engines.node);
  assert.match(workflow, /node-version: 22/);
});

test('redeploy builds code without altering schema, resetting accounts or accepting data loss', () => {
  assert.equal(vercel.buildCommand, 'npm run build:vercel');
  assert.equal(pkg.scripts['build:vercel'], 'prisma generate && next build');
  assert.equal(pkg.scripts.postinstall, 'prisma generate');
  assert.equal(pkg.scripts['db:deploy-schema'], 'prisma db push');
  assert.doesNotMatch(pkg.scripts['build:vercel'], /db push|migrate|super-admin|seed|accept-data-loss/);
});

test('Geist fonts are bundled with the app and never fetched from Google at build time', () => {
  const layout = read('src/app/layout.tsx');
  assert.match(layout, /next\/font\/local/);
  assert.doesNotMatch(layout, /next\/font\/google/);
  for (const name of ['geist', 'geist-mono']) {
    const path = `./fonts/${name}-latin-wght-normal.woff2`;
    assert.ok(layout.includes(path));
    const font = readFileSync(new URL(`src/app/fonts/${name}-latin-wght-normal.woff2`, root));
    assert.equal(font.subarray(0, 4).toString(), 'wOF2');
    assert.ok(font.length > 1000);
  }
  assert.match(read('src/app/fonts/OFL-Geist.txt'), /SIL OPEN FONT LICENSE/i);
  assert.match(read('src/app/fonts/OFL-Geist-Mono.txt'), /SIL OPEN FONT LICENSE/i);
});
