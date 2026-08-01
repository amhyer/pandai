import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * GET /api/dapodik/connector/download
 * Serves the standalone DAPODIK connector Python script for admin to run locally.
 */
export async function GET() {
  try {
    const scriptPath = join(process.cwd(), 'tools', 'dapodik-connector.py');
    const script = readFileSync(scriptPath, 'utf-8');

    return new NextResponse(script, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pandai-dapodik-connector.py"',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Script connector tidak ditemukan' }, { status: 500 });
  }
}
