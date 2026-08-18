import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { requireAuth, AuthError } from '@/lib/auth';

export async function GET() {
  try {
    await requireAuth();
    const scriptPath = join(process.cwd(), 'tools', 'dapodik-connector.py');
    const script = readFileSync(scriptPath, 'utf-8');
    return new NextResponse(script, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="pandai-dapodik-connector.py"' },
    });
  } catch (error) {
    if (error instanceof AuthError) { return NextResponse.json({ error: error.message }, { status: error.status }); }
    return NextResponse.json({ error: 'Script connector tidak ditemukan' }, { status: 500 });
  }
}