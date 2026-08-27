import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/maintenance - Check if maintenance mode is active
export async function GET() {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: 'maintenance_mode' },
    });
    const isMaintenance = setting?.value === 'true';
    return NextResponse.json({ maintenance: isMaintenance });
  } catch (error) {
    console.error('[GET /api/maintenance]', error);
    return NextResponse.json({ maintenance: false });
  }
}
