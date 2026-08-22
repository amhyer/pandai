import { db } from '@/lib/db';

export function setupGracefulShutdown() {
  const forceExitTimeout = setTimeout(() => {
    console.error('Graceful shutdown timed out after 10s, forcing exit');
    process.exit(1);
  }, 10_000);

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down...`);
    clearTimeout(forceExitTimeout);
    try {
      await db.$disconnect();
      console.log('Database disconnected');
    } catch (err) {
      console.error('Error disconnecting from database:', err);
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
