import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { execSync } from 'child_process';

const db = new PrismaClient({ datasources: { db: { url: 'file:/home/z/my-project/db/custom.db' } } });
const S = new TextEncoder().encode('dev_jwt_secret_do_not_use_in_prod');

async function tk(userId: string, role: string, schoolId: string | null, isActive: boolean = true) {
  return new SignJWT({ userId, role, schoolId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('24h').sign(S);
}

async function main() {
  const hash = '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  // Use existing subject if possible
  let subj = await db.subject.findFirst({ where: { code: 'mat' } });
  if (!subj) subj = await db.subject.create({ data: { name: 'Matematika Reg', code: 'mat_reg', type: 'wajib' } });

  const schA = await db.school.create({ data: { name: 'REG_SchA', code: 'REG_SCHA', status: 'active', plan: 'free' } });
  const schB = await db.school.create({ data: { name: 'REG_SchB', code: 'REG_SCHB', status: 'active', plan: 'free' } });
  const clsA = await db.class.create({ data: { name: 'REG_ClsA', grade: 10, academicYear: '2024/2025', schoolId: schA.id } });
  const clsB = await db.class.create({ data: { name: 'REG_ClsB', grade: 10, academicYear: '2024/2025', schoolId: schB.id } });

  const guru = await db.user.create({ data: { name: 'REG_Guru', nip: 'REG_G', password: hash, role: 'GURU', schoolId: schA.id, classId: clsA.id, isActive: true } });
  const sisA = await db.user.create({ data: { name: 'REG_SiswaA', nisn: 'REG_NS1', password: hash, role: 'SISWA', schoolId: schA.id, classId: clsA.id, isActive: true } });
  const sisInact = await db.user.create({ data: { name: 'REG_SiswaInact', nisn: 'REG_NSI', password: hash, role: 'SISWA', schoolId: schA.id, classId: clsA.id, isActive: false } });
  const sisB = await db.user.create({ data: { name: 'REG_SiswaB', nisn: 'REG_NS2', password: hash, role: 'SISWA', schoolId: schB.id, classId: clsB.id, isActive: true } });
  const adminA = await db.user.create({ data: { name: 'REG_AdminA', email: 'reg_aa@test.com', password: hash, role: 'ADMIN_SCHOOL', schoolId: schA.id, isActive: true } });
  const kepsekA = await db.user.create({ data: { name: 'REG_KepsekA', nip: 'REG_KA', password: hash, role: 'KEPALA_SEKOLAH', schoolId: schA.id, isActive: true } });
  const superA = await db.user.create({ data: { name: 'REG_SuperAdmin', email: 'reg_sa@test.com', password: hash, role: 'SUPER_ADMIN', isActive: true } });

  const q1 = await db.question.create({ data: { subjectId: subj.id, schoolId: schA.id, type: 'pg', content: 'REG Q1: 2+2=?', options: JSON.stringify([{ label: 'A', text: '3', isCorrect: false }, { label: 'B', text: '4', isCorrect: true }, { label: 'C', text: '5', isCorrect: false }, { label: 'D', text: '6', isCorrect: false }]), answer: 'B', status: 'published', createdBy: guru.id, difficulty: 'mudah' } });
  const q2 = await db.question.create({ data: { subjectId: subj.id, schoolId: schA.id, type: 'pg', content: 'REG Q2: 3*3=?', options: JSON.stringify([{ label: 'A', text: '6', isCorrect: false }, { label: 'B', text: '8', isCorrect: false }, { label: 'C', text: '9', isCorrect: true }, { label: 'D', text: '12', isCorrect: false }]), answer: 'C', status: 'published', createdBy: guru.id, difficulty: 'sedang' } });

  const pkg = await db.examPackage.create({ data: { title: 'REG_Pkg', schoolId: schA.id, duration: 60, totalQuestions: 2, status: 'published', createdBy: guru.id } });
  await db.examItem.createMany({ data: [{ examPackageId: pkg.id, questionId: q1.id, orderNum: 0, points: 1 }, { examPackageId: pkg.id, questionId: q2.id, orderNum: 1, points: 1 }] });
  const now = new Date();
  const sessActive = await db.examSession.create({ data: { examPackageId: pkg.id, title: 'REG_Active', schoolId: schA.id, classId: clsA.id, status: 'active', startDate: new Date(now.getTime() - 3600000), endDate: new Date(now.getTime() + 3600000), duration: 60, createdBy: guru.id } });
  await db.examAssignment.create({ data: { examSessionId: sessActive.id, schoolId: schA.id, classId: clsA.id } });
  const sessSched = await db.examSession.create({ data: { examPackageId: pkg.id, title: 'REG_Scheduled', schoolId: schA.id, classId: clsA.id, status: 'scheduled', startDate: new Date(now.getTime() + 86400000), endDate: new Date(now.getTime() + 90000000), duration: 60, createdBy: guru.id } });
  const sessEnded = await db.examSession.create({ data: { examPackageId: pkg.id, title: 'REG_Ended', schoolId: schA.id, classId: clsA.id, status: 'ended', startDate: new Date(now.getTime() - 172800000), endDate: new Date(now.getTime() - 172000000 + 3600000), duration: 60, createdBy: guru.id } });
 const sessWrongTime = await db.examSession.create({ data: { examPackageId: pkg.id, title: 'REG_WrongTime', schoolId: schA.id, classId: clsA.id, status: 'active', startDate: new Date(now.getTime() + 86400000), endDate: new Date(now.getTime() + 90000000), duration: 60, createdBy: guru.id } });

  const assignOpen = await db.assignment.create({ data: { title: 'REG_AssignOpen', schoolId: schA.id, classId: clsA.id, teacherId: guru.id, deadline: new Date(now.getTime() + 86400000).toISOString().slice(0, 16), status: 'published', maxScore: 100 } });
  const assignClosed = await db.assignment.create({ data: { title: 'REG_AssignClosed', schoolId: schA.id, classId: clsA.id, teacherId: guru.id, deadline: new Date(now.getTime() - 86400000).toISOString().slice(0, 16), status: 'published', maxScore: 100 } });

  const tSA = await tk(superA.id, 'SUPER_ADMIN', null);
  const tAA = await tk(adminA.id, 'ADMIN_SCHOOL', schA.id);
  const tGA = await tk(guru.id, 'GURU', schA.id);
  const tSIS = await tk(sisA.id, 'SISWA', schA.id);
  const tSI = await tk(sisInact.id, 'SISWA', schA.id);
  const tSB = await tk(sisB.id, 'SISWA', schB.id);
  const tKA = await tk(kepsekA.id, 'KEPALA_SEKOLAH', schA.id);

  const out = JSON.stringify({
    sa: tSA, aa: tAA, ga: tGA, sis: tSIS, si: tSI, sb: tSB, ka: tKA,
    schA: schA.id, schB: schB.id, clsA: clsA.id,
    sessActive: sessActive.id, sessSched: sessSched.id, sessEnded: sessEnded.id, sessWrongTime: sessWrongTime.id,
    pkg: pkg.id, assignOpen: assignOpen.id, assignClosed: assignClosed.id, subjId: subj.id, guruId: guru.id, sisAId: sisA.id, sisBId: sisB.id
  });
  console.log(out);
  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
