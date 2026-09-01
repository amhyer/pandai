// Build wrapper — menjalankan `next build` dengan output standalone.
// Dipakai oleh CI (bun run build) dan Dockerfile. Deploy Vercel TIDAK
// memakai script ini (vercel.json -> npm run build:vercel), jadi build
// Vercel tetap non-standalone sesuai komentar di next.config.ts.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const env = { ...process.env, BUILD_STANDALONE: '1' };

// Pastikan client Prisma sudah digenerate (CI menjalankan ini terpisah,
// tapi jaga-jaga bila wrapper dipanggil langsung).
if (!existsSync('node_modules/.prisma/client/index.js')) {
  console.log('> prisma generate (client belum ada)');
  const gen = spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit', env, shell: true });
  if (gen.status !== 0) process.exit(gen.status ?? 1);
}

console.log('> next build (BUILD_STANDALONE=1)');
const nextBin = existsSync('node_modules/.bin/next')
  ? spawnSync('node_modules/.bin/next', ['build'], { stdio: 'inherit', env })
  : spawnSync('npx', ['next', 'build'], { stdio: 'inherit', env, shell: true });

process.exit(nextBin.status ?? 1);
