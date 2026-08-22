/**
 * PANDAI Smoke Test Seed
 * Creates minimal test data with bcrypt hashes for smoke testing.
 * Usage: npx tsx scripts/smoke-seed.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'SmokeTest123!';

async function main() {
  console.log('=== SMOKE SEED: Creating test data ===');

  const hashedPassword = await bcrypt.hash(PASSWORD, 12);

  // 1. School
  const school = await prisma.school.create({
    data: {
      name: 'SMP Negeri 1 Smoke Test',
      code: 'SMOKE001',
      province: 'Sulawesi Selatan',
      city: 'Makassar',
      schoolType: 'SMP',
      plan: 'pro',
      maxStudents: 100,
    },
  });
  console.log(`[1/7] School: ${school.name} (${school.id})`);

  // 2. Subscription
  await prisma.subscription.create({
    data: {
      schoolId: school.id,
      plan: 'pro',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 86400000),
      amount: 0,
    },
  });

  // 3. Class
  const cls = await prisma.class.create({
    data: {
      name: 'Kelas 8A',
      grade: 8,
      academicYear: '2025/2026',
      schoolId: school.id,
    },
  });
  console.log(`[2/7] Class: ${cls.name} (${cls.id})`);

  // 4. Subject
  const subject = await prisma.subject.create({
    data: { name: 'Matematika', code: 'matematika', type: 'wajib', sortOrder: 1 },
  });
  console.log(`[3/7] Subject: ${subject.name} (${subject.id})`);

  // 5. Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@smoke.test',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`[4/7] Super Admin: ${superAdmin.email} (${superAdmin.id})`);

  // 6. Admin Sekolah
  const adminSchool = await prisma.user.create({
    data: {
      email: 'admin@smoke.test',
      password: hashedPassword,
      name: 'Admin Sekolah',
      role: 'ADMIN_SCHOOL',
      schoolId: school.id,
      isActive: true,
    },
  });
  console.log(`[5/7] Admin: ${adminSchool.email} (${adminSchool.id})`);

  // 7. Guru (login with NIP)
  const guru = await prisma.user.create({
    data: {
      username: '198501012010011001',
      password: hashedPassword,
      name: 'Guru Matematika',
      role: 'GURU',
      schoolId: school.id,
      nip: '198501012010011001',
      nik: '7504010101010001',
      isActive: true,
    },
  });
  console.log(`[6/7] Guru: ${guru.name} (${guru.id})`);

  // 8. Two Siswa (login with NISN)
  const siswaA = await prisma.user.create({
    data: {
      username: '0099900001',
      password: hashedPassword,
      name: 'Siswa Ani',
      role: 'SISWA',
      schoolId: school.id,
      classId: cls.id,
      nisn: '0099900001',
      namaOrtu: 'Bapak Ani',
      jk: 'P',
      isActive: true,
    },
  });
  console.log(`[7/7] Siswa A: ${siswaA.name} (${siswaA.id})`);

  const siswaB = await prisma.user.create({
    data: {
      username: '0099900002',
      password: hashedPassword,
      name: 'Siswa Budi',
      role: 'SISWA',
      schoolId: school.id,
      classId: cls.id,
      nisn: '0099900002',
      namaOrtu: 'Bapak Budi',
      jk: 'L',
      isActive: true,
    },
  });
  console.log(`[7/7] Siswa B: ${siswaB.name} (${siswaB.id})`);

  // 9. Create 3 questions for exam
  const q1 = await prisma.question.create({
    data: {
      schoolId: school.id,
      subjectId: subject.id,
      type: 'pg',
      content: 'Berapakah hasil dari 5 + 3?',
      options: JSON.stringify([{ label: 'A', text: '6' }, { label: 'B', text: '7' }, { label: 'C', text: '8' }, { label: 'D', text: '9' }]),
      answer: 'C',
      difficulty: 'mudah',
      cognitiveLevel: 'C1',
      createdBy: guru.id,
      status: 'published',
    },
  });

  const q2 = await prisma.question.create({
    data: {
      schoolId: school.id,
      subjectId: subject.id,
      type: 'pg',
      content: 'Berapakah hasil dari 10 - 4?',
      options: JSON.stringify([{ label: 'A', text: '5' }, { label: 'B', text: '6' }, { label: 'C', text: '7' }, { label: 'D', text: '8' }]),
      answer: 'B',
      difficulty: 'mudah',
      cognitiveLevel: 'C1',
      createdBy: guru.id,
      status: 'published',
    },
  });

  const q3 = await prisma.question.create({
    data: {
      schoolId: school.id,
      subjectId: subject.id,
      type: 'pg',
      content: 'Berapakah hasil dari 3 x 4?',
      options: JSON.stringify([{ label: 'A', text: '10' }, { label: 'B', text: '11' }, { label: 'C', text: '12' }, { label: 'D', text: '13' }]),
      answer: 'C',
      difficulty: 'mudah',
      cognitiveLevel: 'C2',
      createdBy: guru.id,
      status: 'published',
    },
  });
  console.log(`[EXTRA] 3 questions created: ${q1.id}, ${q2.id}, ${q3.id}`);

  // 10. Create Exam Package + Items + Session
  const examPkg = await prisma.examPackage.create({
    data: {
      title: 'Paket Ujian Smoke Test',
      schoolId: school.id,
      duration: 60,
      totalQuestions: 3,
      status: 'published',
      createdBy: guru.id,
    },
  });

  await prisma.examItem.createMany({
    data: [
      { examPackageId: examPkg.id, questionId: q1.id, orderNum: 0 },
      { examPackageId: examPkg.id, questionId: q2.id, orderNum: 1 },
      { examPackageId: examPkg.id, questionId: q3.id, orderNum: 2 },
    ],
  });

  const examSession = await prisma.examSession.create({
    data: {
      examPackageId: examPkg.id,
      title: 'Sesi Ujian Smoke Test',
      schoolId: school.id,
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      duration: 60,
      status: 'active',
      createdBy: guru.id,
    },
  });

  await prisma.examAssignment.create({
    data: { examSessionId: examSession.id, schoolId: school.id, classId: cls.id },
  });

  console.log(`[EXTRA] Exam session: ${examSession.id}`);

  // 11. Create an Assignment (for race condition test)
  const assignment = await prisma.assignment.create({
    data: {
      title: 'Tugas Smoke Test',
      description: 'Tugas untuk race condition test',
      schoolId: school.id,
      classId: cls.id,
      subjectId: subject.id,
      teacherId: guru.id,
      deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      status: 'published',
      maxScore: 100,
    },
  });

  // Add questions to assignment
  await prisma.assignmentQuestion.createMany({
    data: [
      { assignmentId: assignment.id, questionId: q1.id, orderNum: 0, points: 50 },
      { assignmentId: assignment.id, questionId: q2.id, orderNum: 1, points: 50 },
    ],
  });

  console.log(`[EXTRA] Assignment: ${assignment.id}`);

  // Output JSON summary for the smoke test script to consume
  const summary = {
    schoolId: school.id,
    classId: cls.id,
    subjectId: subject.id,
    superAdminId: superAdmin.id,
    adminId: adminSchool.id,
    guruId: guru.id,
    siswaAId: siswaA.id,
    siswaBId: siswaB.id,
    examSessionId: examSession.id,
    examPackageId: examPkg.id,
    assignmentId: assignment.id,
    questionIds: [q1.id, q2.id, q3.id],
    password: PASSWORD,
  };

  // Write to a file that the shell script can source
  const fs = await import('fs');
  fs.writeFileSync('/tmp/smoke-seed-data.json', JSON.stringify(summary, null, 2));
  console.log(`\n=== SEED COMPLETE ===`);
  console.log(`Data written to /tmp/smoke-seed-data.json`);
}

main()
  .catch((e) => { console.error('SEED ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
