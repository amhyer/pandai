import { NextResponse } from 'next/server';
import { lookupSchool } from '@/lib/npsn-database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || !q.trim()) {
      return NextResponse.json({ error: 'Parameter q wajib diisi' }, { status: 400 });
    }

    const results = lookupSchool(q);

    // Limit to 10 results
    return NextResponse.json(results.slice(0, 10));
  } catch (error) {
    console.error('School lookup error:', error);
    return NextResponse.json({ error: 'Gagal mencari data sekolah' }, { status: 500 });
  }
}
