import { db } from '@/lib/db';

async function main() {
  const school = await db.school.findFirst();
  if (!school) { console.error('No school found'); return; }
  const cls = await db.class.findFirst({ where: { schoolId: school.id } });
  if (!cls) { console.error('No class found'); return; }
  const siswa = await db.user.findFirst({ where: { role: 'SISWA', schoolId: school.id, classId: cls.id } });
  if (!siswa) { console.error('No siswa found'); return; }

  console.log('School:', school.id, school.name);
  console.log('Class:', cls.id, cls.name);
  console.log('Siswa:', siswa.id, siswa.name);

  // Find or create Subject (no schoolId on Subject)
  let subj = await db.subject.findFirst({ where: { code: 'MTK' } });
  if (!subj) {
    subj = await db.subject.create({ data: { name: 'Matematika', code: 'MTK' } });
    console.log('Created subject:', subj.id);
  } else {
    console.log('Subject:', subj.id, subj.name);
  }

  // Create 5 PG questions
  const questions = [];
  for (let i = 1; i <= 5; i++) {
    const correctIdx = i % 4; // 1,2,3,4,1
    const labels = ['A', 'B', 'C', 'D'];
    const options = labels.map((label, j) => ({
      label,
      text: `Opsi ${label} soal ${i}`,
      isCorrect: j === correctIdx,
    }));
    const correctAnswer = labels[correctIdx];
    const q = await db.question.create({
      data: {
        subjectId: subj.id,
        schoolId: school.id,
        type: 'pg',
        content: `Ini adalah soal nomor ${i}. Manakah jawaban yang benar?`,
        options: JSON.stringify(options),
        answer: correctAnswer,
        explanation: `Pembahasan soal ${i}: jawaban yang benar adalah ${correctAnswer}.`,
        cognitiveLevel: 'C3',
        difficulty: 'sedang',
        status: 'published',
        createdBy: siswa.id,
      },
    });
    questions.push(q);
    console.log(`Created question ${i}: ${q.id} (answer: ${correctAnswer})`);
  }

  // Create ExamPackage
  const pkg = await db.examPackage.create({
    data: {
      title: 'Tryout Matematika Kelas 10',
      description: 'Tryout TKA Matematika untuk kelas 10',
      schoolId: school.id,
      duration: 30,
      totalQuestions: 5,
      status: 'published',
      createdBy: siswa.id,
    },
  });
  console.log('Package:', pkg.id);

  // Create ExamItems
  for (let i = 0; i < questions.length; i++) {
    await db.examItem.create({
      data: { examPackageId: pkg.id, questionId: questions[i].id, orderNum: i + 1, points: 1 },
    });
  }
  console.log('Created 5 exam items');

  // Create ExamSession (active now)
  const now = new Date();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const session = await db.examSession.create({
    data: {
      examPackageId: pkg.id,
      title: 'Sesi Tryout MTK Kelas 10',
      schoolId: school.id,
      classId: cls.id,
      startDate: now,
      endDate: end,
      duration: 30,
      shuffleQuestions: false,
      status: 'active',
      createdBy: siswa.id,
    },
  });
  console.log('Session:', session.id);

  // Create ExamAssignment
  const assignment = await db.examAssignment.create({
    data: { examSessionId: session.id, schoolId: school.id, classId: cls.id },
  });
  console.log('Assignment:', assignment.id);

  console.log('\n=== SEED COMPLETE ===');
  console.log('Package ID:', pkg.id);
  console.log('Session ID:', session.id);
  console.log('Class ID:', cls.id);
  console.log('Siswa ID:', siswa.id);
  console.log('School ID:', school.id);

  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
