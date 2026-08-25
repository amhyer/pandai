import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import { requireRole, AuthError } from '@/lib/auth';

const execAsync = promisify(exec);

const IS_POSTGRESQL = (process.env.DATABASE_URL || '').startsWith('postgresql://');

// GET /api/backup
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'download') {
      if (IS_POSTGRESQL) {
        return NextResponse.json(
          { error: 'File backup tidak tersedia untuk PostgreSQL. Gunakan pg_dump.' },
          { status: 400 }
        );
      }
      const dbPath = path.join(process.cwd(), 'db', 'custom.db');
      const dbBuffer = await fs.readFile(dbPath);
      const filename = `pandai-backup-${new Date().toISOString().split('T')[0]}.db`;

      return new NextResponse(dbBuffer, {
        headers: {
          'Content-Type': 'application/x-sqlite3',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const tables = [
      'School', 'User', 'Class', 'Subject', 'Topic', 'Question',
      'ExamPackage', 'ExamItem', 'ExamSession', 'ExamAssignment',
      'StudentAttempt', 'StudentAnswer', 'DiagnosticResult',
      'Attendance', 'TeacherAssignment', 'TeachingJournal',
      'CharacterReport', 'ActivityLog', 'Material', 'Subscription'
    ];

    const tableStats = await Promise.all(
      tables.map(async (table) => {
        try {
          const result = await db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
          return { table, count: Number((result as any[])[0].count) };
        } catch {
          return { table, count: 0 };
        }
      })
    );

    const totalRecords = tableStats.reduce((sum, t) => sum + t.count, 0);

    if (IS_POSTGRESQL) {
      // PostgreSQL: use pg_database_size instead of file stat
      const dbSizeResult = await db.$queryRawUnsafe(`SELECT pg_database_size(current_database()) as size`);
      const dbSize = Number((dbSizeResult as any[])[0].size);

      return NextResponse.json({
        tables: tableStats,
        totalRecords,
        dbSize,
        dbType: 'postgresql',
        lastBackup: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      tables: tableStats,
      totalRecords,
      dbSize: (await fs.stat(path.join(process.cwd(), 'db', 'custom.db'))).size,
      dbType: 'sqlite',
      lastBackup: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/backup error:', error);
    return NextResponse.json({ error: 'Gagal mengambil info backup' }, { status: 500 });
  }
}

// POST /api/backup
export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['SUPER_ADMIN']);

    if (IS_POSTGRESQL) {
      // PostgreSQL: use pg_dump
      const { DATABASE_URL } = process.env;
      if (!DATABASE_URL) {
        return NextResponse.json({ error: 'DATABASE_URL tidak dikonfigurasi' }, { status: 500 });
      }

      const backupDir = path.join(process.cwd(), 'db', 'backups');
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupPath = path.join(backupDir, `pandai-${timestamp}.sql`);

      try {
        await execAsync(`pg_dump "${DATABASE_URL}" > "${backupPath}"`);
        const stats = await fs.stat(backupPath);

        return NextResponse.json({
          success: true,
          message: 'Backup PostgreSQL berhasil dibuat',
          file: `pandai-${timestamp}.sql`,
          size: stats.size,
          dbType: 'postgresql',
          createdAt: new Date().toISOString(),
        });
      } catch (execError: unknown) {
        const msg = execError instanceof Error ? execError.message : 'Unknown error';
        console.error('pg_dump failed:', msg);
        return NextResponse.json({
          success: false,
          error: 'pg_dump gagal. Pastikan pg_dump terinstall.'
        }, { status: 500 });
      }
    }

    // SQLite: file copy
    const dbPath = path.join(process.cwd(), 'db', 'custom.db');
    const backupDir = path.join(process.cwd(), 'db', 'backups');

    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupPath = path.join(backupDir, `pandai-${timestamp}.db`);

    await fs.copyFile(dbPath, backupPath);
    const stats = await fs.stat(backupPath);

    return NextResponse.json({
      success: true,
      message: 'Backup berhasil dibuat',
      file: `pandai-${timestamp}.db`,
      size: stats.size,
      dbType: 'sqlite',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/backup error:', error);
    return NextResponse.json({ error: 'Gagal membuat backup' }, { status: 500 });
  }
}
