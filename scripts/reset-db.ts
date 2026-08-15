/**
 * Production Database Reset Script
 * 
 * RUN THIS SCRIPT ONCE before deploying to production.
 * It removes ALL demo/dummy data from previous testing rounds.
 * 
 * Usage:
 *   NODE_ENV=production bun run scripts/reset-db.ts
 * 
 * WARNING: This will DELETE all data in the database!
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function resetDatabase() {
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ This script must be run with NODE_ENV=production');
    process.exit(1);
  }

  console.log('⚠️  WARNING: This will DELETE ALL data in the database!');
  console.log('   Press Ctrl+C within 5 seconds to cancel...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🗑️  Starting database reset...');

  const tables = [
    'studentAnswer', 'studentAttempt', 'examAssignment', 'examSession',
    'examItem', 'examPackage', 'diagnosticResult', 'question', 'topic',
    'subject', 'attendance', 'teacherAssignment', 'teachingJournal',
    'characterReport', 'activityLog', 'errorLog', 'material', 'user',
    'class', 'subscription', 'school',
    'chatMessage', 'chatbotSession', 'aiUsageLog', 'aiConfig',
    'timetable',
  ] as const;

  let deleted = 0;
  for (const table of tables) {
    try {
      // @ts-ignore — dynamic model access
      const result = await db[table].deleteMany();
      deleted += result.count;
      console.log(`  ✓ Cleared ${table}: ${result.count} rows`);
    } catch (e: any) {
      console.log(`  - Skipped ${table}: ${e.message}`);
    }
  }

  console.log(`\n✅ Database reset complete. ${deleted} total rows deleted.`);
  console.log('   Database is now clean and ready for first school onboarding.');
  
  await db.$disconnect();
}

resetDatabase().catch(e => {
  console.error('Reset failed:', e);
  process.exit(1);
});
