#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════
// PANDAI — SQLite Database Restore
// Usage: bun scripts/restore.mjs <timestamp>
//        bun scripts/restore.mjs --list
// ═══════════════════════════════════════════════════════

import { cpSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(__dirname, '..');
const DB_FILE = join(PROJECT_DIR, 'db/custom.db');
const BACKUP_DIR = join(PROJECT_DIR, 'backups');

const arg = process.argv[2];

if (arg === '--list' || arg === '-l') {
  console.log('Available backups:');
  console.log('─────────────────────────────────────────────');
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('pandai_backup_') && f.endsWith('.db'))
      .map(f => ({ name: f, size: statSync(join(BACKUP_DIR, f)).size, mtime: statSync(join(BACKUP_DIR, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);
    if (files.length === 0) { console.log('  (none)'); }
    else {
      for (const f of files) {
        console.log(`  ${f.name}  ${(f.size / 1024).toFixed(1)} KB  ${f.mtime.toISOString()}`);
      }
    }
  } catch { console.log('  (no backups dir)'); }
  console.log('─────────────────────────────────────────────');
  process.exit(0);
}

if (!arg) {
  console.error('❌ Usage: bun scripts/restore.mjs <timestamp>');
  console.error('   Use --list to see available backups');
  process.exit(1);
}

const BACKUP_FILE = join(BACKUP_DIR, `pandai_backup_${arg}.db`);

try {
  statSync(BACKUP_FILE);
} catch {
  console.error('❌ Backup not found:', `pandai_backup_${arg}.db`);
  console.error('   Run "bun scripts/restore.mjs --list" to see available');
  process.exit(1);
}

// Pre-restore safety backup
const preTs = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
mkdirSync(BACKUP_DIR, { recursive: true });
cpSync(DB_FILE, join(BACKUP_DIR, `pre_restore_${preTs}.db`));
console.log(`🔒 Pre-restore safety backup: pre_restore_${preTs}.db`);

// Restore
cpSync(BACKUP_FILE, DB_FILE);

const bakSize = statSync(BACKUP_FILE).size;
const restSize = statSync(DB_FILE).size;

console.log('═══════════════════════════════════════════════════════');
console.log('  ✅ RESTORE SUCCESSFUL');
console.log('═══════════════════════════════════════════════════════');
console.log(`  From      : ${arg}`);
console.log(`  Size      : ${(restSize / 1024).toFixed(1)} KB`);
console.log(`  Verified  : ${bakSize} → ${restSize} bytes`);
console.log('═══════════════════════════════════════════════════════');
