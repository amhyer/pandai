const { spawn } = require('child_process');
const path = require('path');

const log = (msg) => {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${msg}`);
};

function startServer() {
  log('Starting Next.js dev server...');
  const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
    cwd: path.join(__dirname),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' },
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('exit', (code) => {
    log(`Server exited with code ${code}, restarting in 2s...`);
    setTimeout(startServer, 2000);
  });

  child.on('error', (err) => {
    log(`Error: ${err.message}, restarting in 2s...`);
    setTimeout(startServer, 2000);
  });
}

startServer();
