// Build wrapper — menjalankan `next build` dengan output standalone.
// Dipakai oleh CI (npm run build) dan Dockerfile. Deploy Vercel TIDAK
// memakai script ini (vercel.json -> npm run build:vercel), jadi build
// Vercel tetap non-standalone sesuai komentar di next.config.ts.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync } from 'node:fs';

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

if (nextBin.status !== 0) process.exit(nextBin.status ?? 1);

// Output standalone TIDAK menyertakan aset statis secara otomatis —
// salin manual supaya .next/standalone/server.js bisa menyajikannya
// di production (tanpa ini CSS/JS akan 404).
const standaloneDir = '.next/standalone';
if (!existsSync(standaloneDir)) {
  console.warn(`> WARN: ${standaloneDir} tidak ditemukan; lewati penyalinan aset statis`);
  process.exit(0);
}

console.log('> salin .next/static -> .next/standalone/.next/static');
cpSync('.next/static', `${standaloneDir}/.next/static`, { recursive: true });

if (existsSync('public')) {
  console.log('> salin public -> .next/standalone/public');
  cpSync('public', `${standaloneDir}/public`, { recursive: true });
}

process.exit(0);
