import { db } from '@/lib/db';

/**
 * `GoogleSheetsConfig.schoolId` is indexed but NOT unique (`@@index([schoolId])`),
 * so Prisma's `upsert` cannot target it — `where` there only accepts unique fields.
 * Resolve the row first, then update or create.
 *
 * `schoolId === null` represents the global config.
 */
export type GoogleSheetsConfigPatch = {
  spreadsheetId?: string;
  mode?: string;
  status: string;
  lastSync?: Date;
};

export async function upsertConfigBySchool(
  schoolId: string | null,
  create: GoogleSheetsConfigPatch,
  update: GoogleSheetsConfigPatch
) {
  const existing = await db.googleSheetsConfig.findFirst({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return db.googleSheetsConfig.update({
      where: { id: existing.id },
      data: { ...update, updatedAt: new Date() },
    });
  }

  return db.googleSheetsConfig.create({
    data: { schoolId, ...create },
  });
}
