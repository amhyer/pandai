import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/settings — return all AppSetting key-value pairs as a flat object.
 */
export async function GET(_request: NextRequest) {
  const { error } = await requireAuth(_request, { roles: ['SUPER_ADMIN'] });
  if (error) return error;

  const rows = await db.appSetting.findMany();
  const obj: Record<string, string> = {};
  for (const r of rows) {
    obj[r.key] = r.value;
  }
  return NextResponse.json(obj);
}

/**
 * PUT /api/settings — upsert all provided key-value pairs.
 * Body: Record<string, string>
 */
export async function PUT(request: NextRequest) {
  const { error } = await requireAuth(request, { roles: ['SUPER_ADMIN'] });
  if (error) return error;

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
}
