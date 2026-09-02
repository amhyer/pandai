#!/usr/bin/env node
/**
 * Build standalone EXE dari pull-dapodik.mjs
 * 
 * Jalankan: node scripts/build-exe.mjs
 * Output: dist/pull-dapodik.exe
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'scripts/pull-dapodik.mjs';
const OUT = 'dist/pull-dapodik.exe';

console.log('');
console.log('  ╔══════════════════════════════════════╗');
console.log('  ║  Building EXE dari pull-dapodik.mjs  ║');
console.log('  ╚══════════════════════════════════════╝');
console.log('');

// Pastikan source ada
if (!fs.existsSync(SRC)) {
  console.error(`  ❌ File ${SRC} tidak ditemukan`);
  process.exit(1);
}

// Buat dist folder
fs.mkdirSync('dist', { recursive: true });

// Build dengan bun
console.log('  Building...');
try {
  execSync(
    `bun build --compile --target=bun-windows-x64 "${SRC}" --outfile "${OUT}"`,
    { stdio: 'inherit', cwd: process.cwd() }
  );
  
  const stats = fs.statSync(OUT);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
  
  console.log('');
  console.log(`  ✅ Berhasil!`);
  console.log(`  📦 Output: ${path.resolve(OUT)}`);
  console.log(`  📏 Ukuran: ${sizeMB} MB`);
  console.log('');
  console.log('  Cara pakai:');
  console.log('  1. Copy file pull-dapodik.exe ke komputer目标');
  console.log('  2. Buka Command Prompt');
  console.log('  3. Jalankan: pull-dapodik.exe');
  console.log('');
} catch (err) {
  console.error(`  ❌ Build gagal: ${err.message}`);
  process.exit(1);
}
