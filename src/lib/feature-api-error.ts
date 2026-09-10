import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AuthError } from '@/lib/auth';

export function featureApiError(error: unknown) {
  if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Data tidak valid' }, { status: 400 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Format permintaan tidak valid' }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return NextResponse.json({ error: 'NISN atau username sudah terdaftar. Data lama tidak diubah.' }, { status: 409 });
  }
  console.error('School feature request failed:', error instanceof Error ? error.name : 'Unknown error');
  return NextResponse.json({ error: 'Gagal memproses data. Silakan coba kembali.' }, { status: 500 });
}
