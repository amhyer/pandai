import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

const SQLITE_MAGIC = Buffer.from('SQLite format 3\x00', 'ascii');

// POST /api/restore — Restore database from uploaded .db file
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, { roles: ['SUPER_ADMIN'] });
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    // Validate file extension
    if (!file.name.endsWith('.db')) {
      return NextResponse.json({ error: 'Hanya file .db yang diperbolehkan' }, { status: 400 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate SQLite magic bytes
    if (buffer.length < 16 || buffer.subarray(0, 15).toString('ascii') !== 'SQLite format 3') {
      return NextResponse.json({ error: 'File bukan database SQLite yang valid' }, { status: 400 });
    }

    const dbPath = path.join(process.cwd(), 'db', 'custom.db');
    const preRestorePath = path.join(process.cwd(), 'db', 'custom.db.pre-restore');

    // Create backup of current DB before overwriting
    await fs.copyFile(dbPath, preRestorePath);

    // Copy uploaded file to db/custom.db
    await fs.writeFile(dbPath, buffer);

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        schoolId: user.schoolId,
        action: 'Memulihkan database',
        detail: `Database dipulihkan dari file: ${file.name} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`,
        module: 'sistem',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Database berhasil dipulihkan. Silakan refresh halaman.',
    });
  } catch (err) {
    console.error('POST /api/restore error:', err);
    return NextResponse.json({ error: 'Gagal memulihkan database' }, { status: 500 });
  }
}
