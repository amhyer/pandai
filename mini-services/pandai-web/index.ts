import { execSync, spawn } from 'child_process';
import http from 'http';

const PORT = 3000;

// Simple health check server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('PANDAI Web Server is running');
});

// Start Next.js as child process
const nextProcess = spawn('npx', ['next', 'start', '-p', '3001'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=256' },
  cwd: '/home/z/my-project',
});

nextProcess.stdout.on('data', (data) => {
  console.log(`[Next.js] ${data.toString().trim()}`);
});

nextProcess.stderr.on('data', (data) => {
  console.error(`[Next.js ERR] ${data.toString().trim()}`);
});

nextProcess.on('exit', (code) => {
  console.log(`Next.js exited with code ${code}`);
});

// Actually, let's just run next start directly on port 3000
// and use this as a process wrapper
server.close();

// Run next dev with webpack (more stable in this env)
const devProcess = spawn('npx', ['next', 'dev', '-p', '3000', '--webpack'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { 
    ...process.env, 
    NODE_OPTIONS: '--max-old-space-size=512',
    NEXT_DISABLE_HMR: '1',
  },
  cwd: '/home/z/my-project',
});

devProcess.stdout.on('data', (data) => {
  console.log(`[Dev] ${data.toString().trim()}`);
});

devProcess.stderr.on('data', (data) => {
  console.error(`[Dev ERR] ${data.toString().trim()}`);
});

devProcess.on('exit', (code) => {
  console.log(`Dev server exited with code ${code}, restarting in 3s...`);
  setTimeout(() => process.exit(1), 3000);
});

// Keep alive with periodic self-ping
setInterval(() => {
  http.get('http://localhost:3000/', (res) => {
    res.destroy();
  }).on('error', () => {});
}, 10000);

console.log('PANDAI Web wrapper started');
