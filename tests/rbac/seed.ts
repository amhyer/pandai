/**
 * Seed deterministic RBAC fixtures into the test database.
 * Run: bun run tests/rbac/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { FIX, TEST_PASSWORD } from './fixtures';

const db = new PrismaClient();

async function main() {
  const password = await bcrypt.hash(TEST_PASSWORD, 10);

  // Clean related rows (order matters for FKs)
  await db.chatMessage.deleteMany({});
  await db.chatbotSession.deleteMany({});
  await db.aiUsageLog.deleteMany({});
  await db.aiConfig.deleteMany({});
  await db.studentAnswer.deleteMany({});
  await db.studentAttempt.deleteMany({});
  await db.examItem.deleteMany({});
  await db.examPackage.deleteMany({});
  await db.question.deleteMany({});
  await db.attendance.deleteMany({});
  await db.characterReport.deleteMany({});
  await db.user.deleteMany({
    where: { id: { startsWith: 'rbac_' } },
  });
  await db.class.deleteMany({
    where: { id: { startsWith: 'rbac_' } },
  });
  await db.school.deleteMany({
    where: { id: { startsWith: 'rbac_' } },
  });
  await db.subject.deleteMany({
    where: { id: FIX.subject },
  });

  await db.school.createMany({
    data: [
      {
        id: FIX.schoolA,
        name: 'SD RBAC A',
        code: 'RBAC-A',
        status: 'active',
        plan: 'pro',
        maxStudents: 500,
      },
      {
        id: FIX.schoolB,
        name: 'SD RBAC B',
        code: 'RBAC-B',
        status: 'active',
        plan: 'pro',
        maxStudents: 500,
      },
    ],
  });

  await db.subject.create({
    data: {
      id: FIX.subject,
      name: 'Matematika',
      code: 'rbac_mat',
      type: 'wajib',
    },
  });

  await db.class.createMany({
    data: [
      {
        id: FIX.classA,
        name: 'Kelas 5A',
        grade: 5,
        academicYear: '2025/2026',
        schoolId: FIX.schoolA,
      },
      {
        id: FIX.classB,
        name: 'Kelas 5B',
        grade: 5,
        academicYear: '2025/2026',
        schoolId: FIX.schoolB,
      },
    ],
  });

  const users = [
    {
      id: FIX.superAdmin,
      username: 'rbac_super',
      email: 'super@rbac.test',
      name: 'Super Admin RBAC',
      role: 'SUPER_ADMIN',
      schoolId: null as string | null,
      classId: null as string | null,
      parentId: null as string | null,
    },
    {
      id: FIX.adminA,
      username: 'rbac_admin_a',
      email: 'admin_a@rbac.test',
      name: 'Admin Sekolah A',
      role: 'ADMIN_SCHOOL',
      schoolId: FIX.schoolA,
      classId: null,
      parentId: null,
    },
    {
      id: FIX.adminB,
      username: 'rbac_admin_b',
      email: 'admin_b@rbac.test',
      name: 'Admin Sekolah B',
      role: 'ADMIN_SCHOOL',
      schoolId: FIX.schoolB,
      classId: null,
      parentId: null,
    },
    {
      id: FIX.guruA,
      username: 'rbac_guru_a',
      email: null,
      name: 'Guru A',
      role: 'GURU',
      schoolId: FIX.schoolA,
      classId: null,
      parentId: null,
      nip: 'NIP-RBAC-A',
    },
    {
      id: FIX.guruB,
      username: 'rbac_guru_b',
      email: null,
      name: 'Guru B',
      role: 'GURU',
      schoolId: FIX.schoolB,
      classId: null,
      parentId: null,
      nip: 'NIP-RBAC-B',
    },
    {
      id: FIX.kepsekA,
      username: 'rbac_kepsek_a',
      email: 'kepsek_a@rbac.test',
      name: 'Kepala Sekolah A',
      role: 'KEPALA_SEKOLAH',
      schoolId: FIX.schoolA,
      classId: null,
      parentId: null,
    },
    {
      id: FIX.ortuA,
      username: 'rbac_ortu_a',
      email: null,
      name: 'Orang Tua A',
      role: 'ORANG_TUA',
      schoolId: FIX.schoolA,
      classId: null,
      parentId: null,
    },
    {
      id: FIX.ortuB,
      username: 'rbac_ortu_b',
      email: null,
      name: 'Orang Tua B',
      role: 'ORANG_TUA',
      schoolId: FIX.schoolB,
      classId: null,
      parentId: null,
    },
    {
      id: FIX.siswaA1,
      username: 'rbac_siswa_a1',
      email: null,
      name: 'Siswa A1',
      role: 'SISWA',
      schoolId: FIX.schoolA,
      classId: FIX.classA,
      parentId: FIX.ortuA,
      nisn: 'NISN-A1',
    },
    {
      id: FIX.siswaA2,
      username: 'rbac_siswa_a2',
      email: null,
      name: 'Siswa A2',
      role: 'SISWA',
      schoolId: FIX.schoolA,
      classId: FIX.classA,
      parentId: null,
      nisn: 'NISN-A2',
    },
    {
      id: FIX.siswaB1,
      username: 'rbac_siswa_b1',
      email: null,
      name: 'Siswa B1',
      role: 'SISWA',
      schoolId: FIX.schoolB,
      classId: FIX.classB,
      parentId: FIX.ortuB,
      nisn: 'NISN-B1',
    },
  ];

  for (const u of users) {
    await db.user.create({
      data: {
        id: u.id,
        username: u.username,
        email: u.email ?? undefined,
        password,
        name: u.name,
        role: u.role,
        schoolId: u.schoolId,
        classId: u.classId,
        parentId: u.parentId,
        nisn: (u as { nisn?: string }).nisn,
        nip: (u as { nip?: string }).nip,
        isActive: true,
      },
    });
  }

  await db.question.create({
    data: {
      id: FIX.questionA,
      subjectId: FIX.subject,
      schoolId: FIX.schoolA,
      type: 'pg',
      content: 'Berapa 2+2?',
      options: JSON.stringify([
        { label: 'A', text: '3', isCorrect: false },
        { label: 'B', text: '4', isCorrect: true },
      ]),
      answer: 'B',
      status: 'published',
      createdBy: FIX.guruA,
    },
  });

  await db.examPackage.create({
    data: {
      id: FIX.packageA,
      title: 'Paket RBAC A',
      schoolId: FIX.schoolA,
      status: 'published',
      createdBy: FIX.guruA,
    },
  });

  await db.studentAttempt.createMany({
    data: [
      {
        id: FIX.attemptA1,
        userId: FIX.siswaA1,
        examPackageId: FIX.packageA,
        schoolId: FIX.schoolA,
        classId: FIX.classA,
        score: 80,
        status: 'submitted',
      },
      {
        id: FIX.attemptB1,
        userId: FIX.siswaB1,
        examPackageId: FIX.packageA,
        schoolId: FIX.schoolB,
        classId: FIX.classB,
        score: 70,
        status: 'submitted',
      },
    ],
  });

  await db.attendance.create({
    data: {
      id: FIX.attendanceA1,
      studentId: FIX.siswaA1,
      classId: FIX.classA,
      schoolId: FIX.schoolA,
      date: '2026-08-01',
      status: 'hadir',
      recordedBy: FIX.guruA,
    },
  });

  await db.characterReport.create({
    data: {
      id: FIX.charReportA1,
      studentId: FIX.siswaA1,
      classId: FIX.classA,
      schoolId: FIX.schoolA,
      reporterId: FIX.ortuA,
      filledBy: 'ORANG_TUA',
      date: '2026-08-01',
      habit: 'gemar_belajar',
      rating: 4,
    },
  });

  await db.aiConfig.create({
    data: {
      schoolId: FIX.schoolA,
      enabled: true,
    },
  });

  console.log('✅ RBAC fixtures seeded');
  console.log(JSON.stringify(FIX, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
