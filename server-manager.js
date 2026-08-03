#!/usr/bin/env node
// server-manager.js — Auto-restart dev server when it crashes
// eslint-disable @typescript-eslint/no-require-imports

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG = path.join(__dirname, 'dev.log');
const KEEPALIVE_LOG = path.join(__dirname, 'keepalive.log');

let restartCount = 0;
const MAX_RESTARTS = 100;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(KEEPALIVE_LOG, line);
  console.log(line.trim());
}

function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    log('Max restarts reached, exiting.');
    process.exit(1);
  }

  restartCount++;
  const env = { ...process.env, NODE_OPTIONS: '--max-old-space-size=2048' };

  log(`Starting server (attempt #${restartCount})...`);

  // Clear old log
  if (restartCount === 1) {
    try { fs.writeFileSync(LOG, ''); } catch {}
  }

  const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
    cwd: __dirname,
    env,
    stdio: ['pipe', fs.openSync(LOG, 'a'), fs.openSync(LOG, 'a')],
  });

  child.on('exit', (code, signal) => {
    log(`Server exited with code=${code} signal=${signal}`);
    if (code !== 0) {
      log('Restarting in 2s...');
      setTimeout(startServer, 2000);
    } else {
      log('Clean exit, not restarting.');
    }
  });

  child.on('error', (err) => {
    log(`Server error: ${err.message}`);
    setTimeout(startServer, 2000);
  });
}

// Kill any existing next processes
spawn('pkill', ['-f', 'next'], { stdio: 'inherit' }).on('exit', () => {
  log('Killed existing next processes.');
  setTimeout(startServer, 1500);
});
