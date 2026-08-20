#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════
// PANDAI — SQLite Database Backup
// Usage: bun scripts/backup.mjs
// ═══════════════════════════════════════════════════════

import { cpSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(__dirname, '..');
const DB_FILE = join(PROJECT_DIR, 'db/custom.db');
const BACKUP_DIR = join(PROJECT_DIR, 'backups');

if (!statSync(DB_FILE, { throwIfNoEntry: false })) {
  console.error('❌ Database file not found:', DB_FILE);
  process.exit(1);
}

const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
mkdirSync(BACKUP_DIR, { recursive: true });

const backupFile = join(BACKUP_DIR, `pandai_backup_${ts}.db`);
cpSync(DB_FILE, backupFile);

const origSize = statSync(DB_FILE).size;
const bakSize = statSync(backupFile).size;
const fmtSize = (b) => (b / 1024).toFixed(1) + ' KB';

console.log('═══════════════════════════════════════════════════════');
console.log('  ✅ BACKUP SUCCESSFUL');
console.log('═══════════════════════════════════════════════════════');
console.log(`  Timestamp : ${ts}`);
console.log(`  File      : backups/pandai_backup_${ts}.db`);
console.log(`  Size      : ${fmtSize(bakSize)}`);
console.log(`  Verified  : ${origSize} → ${bakSize} bytes`);
console.log('═══════════════════════════════════════════════════════');

// Keep only last 10 backups
try {
  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('pandai_backup_') && f.endsWith('.db'))
    .map(f => ({ name: f, mtime: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const f of files.slice(10)) {
    unlinkSync(join(BACKUP_DIR, f.name));
    console.log(`  🗑️  Removed old backup: ${f.name}`);
  }
} catch {}

console.log('');
console.log('To restore:');
console.log(`  bun scripts/restore.mjs ${ts}`);
