import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

/**
 * GET /api/settings — return all AppSetting key-value pairs as a flat object.
 */
export async function GET(_request: NextRequest) {
  try {
    await requireRole(_request, ['SUPER_ADMIN']);

    const rows = await db.appSetting.findMany();
    const obj: Record<string, string> = {};
    for (const r of rows) {
      obj[r.key] = r.value;
    }
    return NextResponse.json(obj);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal mengambil pengaturan' }, { status: 500 });
  }
}

/**
 * PUT /api/settings — upsert all provided key-value pairs.
 * Body: Record<string, string>
 */
export async function PUT(request: NextRequest) {
  try {
    await requireRole(request, ['SUPER_ADMIN']);

    const body: Record<string, string> = await request.json();

    await db.$transaction(
      Object.entries(body).map(([key, value]) =>
        db.appSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}
