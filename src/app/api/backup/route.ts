import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// GET /api/backup — Get backup list or trigger download
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'download') {
      // Return current DB as downloadable file
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

    // List tables and counts
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
          // @ts-ignore
          const result = await db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
          return { table, count: (result as any[])[0].count };
        } catch {
          return { table, count: 0 };
        }
      })
    );

    const totalRecords = tableStats.reduce((sum, t) => sum + t.count, 0);

    return NextResponse.json({
      tables: tableStats,
      totalRecords,
      dbSize: (await fs.stat(path.join(process.cwd(), 'db', 'custom.db'))).size,
      lastBackup: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /api/backup error:', error);
    return NextResponse.json({ error: 'Gagal mengambil info backup' }, { status: 500 });
  }
}

// POST /api/backup — Create backup
export async function POST(req: NextRequest) {
  try {
    const dbPath = path.join(process.cwd(), 'db', 'custom.db');
    const backupDir = path.join(process.cwd(), 'db', 'backups');

    // Ensure backup dir exists
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupPath = path.join(backupDir, `pandai-${timestamp}.db`);

    // Copy database file
    await fs.copyFile(dbPath, backupPath);
    const stats = await fs.stat(backupPath);

    return NextResponse.json({
      success: true,
      message: 'Backup berhasil dibuat',
      file: `pandai-${timestamp}.db`,
      size: stats.size,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST /api/backup error:', error);
    return NextResponse.json({ error: 'Gagal membuat backup' }, { status: 500 });
  }
}
