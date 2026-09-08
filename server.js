/**
 * Custom server untuk cPanel Passenger (Node.js App Manager).
 *
 * Alternatif terhadap server standalone Next (.next/standalone/server.js):
 * Passenger men-set PORT secara otomatis lalu menjalankan file ini dengan
 * `node server.js`, jadi tidak ada port yang perlu di-hardcode.
 *
 * Setup di cPanel Node.js App Manager:
 *   - Application root        : direktori project ini
 *   - Application startup file: server.js
 *   - Node.js version         : 20+
 *
 * Prasyarat di server:
 *   - npm install --omit=dev
 *   - npm run build        (menghasilkan .next/ — dipakai langsung di sini)
 *   - npx prisma db push   (+ seed bila perlu)
 */

// Passenger kadang tidak men-set NODE_ENV — pastikan selalu production.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const { createServer } = require('http');
const { existsSync } = require('fs');
const { join } = require('path');
const next = require('next');

const port = parseInt(process.env.PORT, 10) || 3000;
const host = process.env.HOST || '0.0.0.0';
const dir = __dirname;

// Gagal cepat dengan pesan yang jelas bila build belum ada.
if (!existsSync(join(dir, '.next', 'BUILD_ID'))) {
  console.error('[server] .next/BUILD_ID tidak ditemukan. Jalankan `npm run build` lebih dulu.');
  process.exit(1);
}

const app = next({ dev: false, dir });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = createServer((req, res) => {
      handle(req, res).catch((err) => {
        console.error('[server] Error menangani request:', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });
    });

    // Keep-alive Node dibuat lebih panjang daripada proxy di depannya
    // (Apache/LiteSpeed pada cPanel) untuk menghindari 502 sporadis.
    server.keepAliveTimeout = 120_000;
    server.headersTimeout = 125_000;

    server.listen(port, host, () => {
      console.log(`[server] Ready — http://${host}:${port} (NODE_ENV=${process.env.NODE_ENV})`);
    });

    // Passenger mengirim SIGTERM saat app di-restart/di-stop.
    const shutdown = (signal) => {
      console.log(`[server] ${signal} diterima — menutup...`);
      server.close(() => process.exit(0));
      // Failsafe: keluar paksa bila ada koneksi yang menggantung.
      setTimeout(() => process.exit(0), 10_000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('[server] Gagal menyiapkan Next.js:', err);
    process.exit(1);
  });

process.on('unhandledRejection', (err) => {
  console.error('[server] unhandledRejection:', err);
});
