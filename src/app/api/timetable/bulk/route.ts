import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/timetable/bulk — Bulk create with upsert logic
export async function POST(req: NextRequest) {
  try {
    const { entries } = await req.json();
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'entries (array) wajib diisi' }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const classId = e.classId;
      const day = e.day;
      const slotNumber = e.slotNumber;
      const academicYear = e.academicYear || '2024/2025';
      const semester = e.semester || 'Ganjil';

      if (!classId || !day || !slotNumber || !e.schoolId) {
        errors.push(`Baris ${i + 1}: classId, day, slotNumber, dan schoolId wajib`);
        continue;
      }

      try {
        // Check if entry exists (unique constraint)
        const existing = await db.timetable.findUnique({
          where: {
            classId_day_slotNumber_academicYear_semester: {
              classId,
              day,
              slotNumber,
              academicYear,
              semester,
            },
          },
        });

        if (existing) {
          // Upsert: delete old and create new
          await db.timetable.delete({ where: { id: existing.id } });
          updated++;
        }

        await db.timetable.create({
          data: {
            classId,
            day,
            slotNumber,
            subjectId: e.subjectId || null,
            teacherId: e.teacherId || null,
            schoolId: e.schoolId,
            academicYear,
            semester,
          },
        });
        created++;
      } catch (err: any) {
        errors.push(`Baris ${i + 1}: ${err.message}`);
      }
    }

    return NextResponse.json({ created, updated, errors, total: entries.length }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/timetable/bulk error:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat jadwal secara massal' }, { status: 500 });
  }
}

// DELETE /api/timetable/bulk — Delete all entries for a class+year+semester
export async function DELETE(req: NextRequest) {
  try {
    const { classId, academicYear, semester } = await req.json();

    if (!classId) {
      return NextResponse.json({ error: 'classId diperlukan' }, { status: 400 });
    }

    const where: Record<string, unknown> = { classId };
    if (academicYear) where.academicYear = academicYear;
    if (semester) where.semester = semester;

    const result = await db.timetable.deleteMany({ where });
    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('DELETE /api/timetable/bulk error:', error);
    return NextResponse.json({ error: 'Gagal menghapus jadwal' }, { status: 500 });
  }
}
