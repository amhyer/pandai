#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const LOG = '/home/z/my-project/dev.log';
const PROJECT_DIR = '/home/z/my-project';
function log(msg) { fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${msg}\n`); }
function startServer() {
  log('Starting Next.js production server on port 3000...');
  const child = spawn('npx', ['next', 'start', '-p', '3000'], {
    cwd: PROJECT_DIR, detached: true,
    stdio: ['ignore', fs.openSync(LOG, 'a'), fs.openSync(LOG, 'a')],
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512', NEXT_TELEMETRY_DISABLED: '1' }
  });
  child.unref();
  child.on('exit', (code, signal) => { log(`Server exited (code=${code}, signal=${signal}). Restarting in 3s...`); setTimeout(startServer, 3000); });
  child.on('error', (err) => { log(`Server error: ${err.message}. Restarting in 3s...`); setTimeout(startServer, 3000); });
}
log('Keep-alive daemon started');
startServer();
setInterval(() => {}, 60000);
