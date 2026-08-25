import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'connected',
    });
  } catch (error: unknown) {
    return NextResponse.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      db: 'disconnected',
    }, { status: 503 });
  }
}
