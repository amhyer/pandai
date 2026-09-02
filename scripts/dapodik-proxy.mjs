#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 * PANDAI — Local Dapodik Proxy
 * ═══════════════════════════════════════════════════════════════════
 *
 * menjembatani koneksi antara website PANDAI (Vercel/HTTPS)
 * dan Dapodik Lokal (localhost:5774/HTTP).
 *
 * CARA PAKAI:
 *   1. Pastikan Dapodik Lokal sudah berjalan
 *   2. Jalankan: node scripts/dapodik-proxy.mjs
 *   3. Buka website PANDAI → Tarik Data Dapodik → Koneksi Dapodik Lokal
 *   4. Isi Token & NPSN → Tes Koneksi → Tarik Semua Data
 *
 * Proxy ini mendengarkan di http://localhost:5775
 * ═══════════════════════════════════════════════════════════════════
 */

import http from 'node:http';

const PROXY_PORT = 5775;
const DAPODIK_PORT = 5774;

const server = http.createServer(async (req, res) => {
  // CORS headers — izinkan request dari website PANDAI
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', proxy: 'pandai-dapodik-proxy', port: PROXY_PORT }));
    return;
  }

  // Proxy ke Dapodik Lokal
  // POST body: { query: 'ws=getSekolah&akses_token=xxx&npsn=xxx' }
  // atau: { ws: 'getSekolah', akses_token: 'xxx', npsn: 'xxx' }
  try {
    const body = await readBody(req);
    const parsed = JSON.parse(body);

    let queryString = '';
    if (parsed.query) {
      // Langsung query string
      queryString = parsed.query;
    } else if (parsed.ws) {
      // Object params → query string
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(parsed)) {
        if (v) sp.set(k, String(v));
      }
      queryString = sp.toString();
    }

    const dapodikUrl = `http://localhost:${DAPODIK_PORT}/WebService/?${queryString}`;

    console.log(`[PROXY] → ${dapodikUrl}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(dapodikUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      status: response.status,
      data,
    }));

    console.log(`[PROXY] ← OK (${response.status})`);
  } catch (err) {
    const msg = err?.message || 'Unknown error';
    console.error(`[PROXY] ERROR: ${msg}`);

    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: msg,
      detail: msg.includes('ECONNREFUSED')
        ? 'Dapodik Lokal tidak berjalan di port 5774'
        : msg.includes('abort')
          ? 'Timeout — Dapodik Lokal tidak merespons'
          : msg,
    }));
  }
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

server.listen(PROXY_PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║   PANDAI — Local Dapodik Proxy                  ║');
  console.log('  ╠══════════════════════════════════════════════════╣');
  console.log(`  ║   Proxy berjalan di: http://localhost:${PROXY_PORT}     ║`);
  console.log(`  ║   Forward ke:        http://localhost:${DAPODIK_PORT}     ║`);
  console.log('  ╠══════════════════════════════════════════════════╣');
  console.log('  ║   Buka website PANDAI → Tarik Data Dapodik      ║');
  console.log('  ║   → Tab "Koneksi Dapodik Lokal"                 ║');
  console.log('  ║   → Tes Koneksi → Tarik Semua Data              ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Tekan Ctrl+C untuk menghentikan proxy.');
  console.log('');
});
