import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';

export async function POST() {
  try {
    // Clear existing data (order matters for FK constraints)
    await db.studentAnswer.deleteMany();
    await db.studentAttempt.deleteMany();
    await db.examAssignment.deleteMany();
    await db.examSession.deleteMany();
    await db.examItem.deleteMany();
    await db.examPackage.deleteMany();
    await db.diagnosticResult.deleteMany();
    await db.question.deleteMany();
    await db.topic.deleteMany();
    await db.subject.deleteMany();
    await db.attendance.deleteMany();
    await db.teacherAssignment.deleteMany();
    await db.teachingJournal.deleteMany();
    await db.characterReport.deleteMany();
    await db.activityLog.deleteMany();
    await db.material.deleteMany();
    await db.user.deleteMany();
    await db.class.deleteMany();
    await db.subscription.deleteMany();
    await db.school.deleteMany();

    // ===== SEKOLAH =====
    const sma1 = await db.school.create({
      data: { name: 'SMA Negeri 1 Jakarta', code: 'SMA1JKT', address: 'Jl. Sudirman No. 1, Jakarta', plan: 'pro', maxStudents: 500, status: 'active' },
    });
    const sma2 = await db.school.create({
      data: { name: 'SMA Negeri 3 Bandung', code: 'SMA3BDG', address: 'Jl. Asia Afrika No. 3, Bandung', plan: 'starter', maxStudents: 200, status: 'active' },
    });
    const sma3 = await db.school.create({
      data: { name: 'SMK Negeri 2 Surabaya', code: 'SMK2SBY', address: 'Jl. Pahlawan No. 2, Surabaya', plan: 'free', maxStudents: 50, status: 'active' },
    });

    // Subscriptions
    await db.subscription.createMany({
      data: [
        { schoolId: sma1.id, plan: 'pro', startDate: new Date('2024-01-01'), endDate: new Date('2025-12-31'), amount: 500000 },
        { schoolId: sma2.id, plan: 'starter', startDate: new Date('2024-03-01'), endDate: new Date('2025-02-28'), amount: 250000 },
        { schoolId: sma3.id, plan: 'free', startDate: new Date('2024-06-01'), amount: 0 },
      ],
    });

    // ===== SUBJECTS =====
    const subjects = await db.subject.createMany({
      data: [
        { name: 'Bahasa Indonesia', code: 'bindo', type: 'wajib', sortOrder: 1 },
        { name: 'Bahasa Inggris', code: 'bing', type: 'wajib', sortOrder: 2 },
        { name: 'Matematika', code: 'mat', type: 'wajib', sortOrder: 3 },
        { name: 'Fisika', code: 'fis', type: 'pilihan', sortOrder: 4 },
        { name: 'Kimia', code: 'kim', type: 'pilihan', sortOrder: 5 },
        { name: 'Biologi', code: 'bio', type: 'pilihan', sortOrder: 6 },
        { name: 'Ekonomi', code: 'eko', type: 'pilihan', sortOrder: 7 },
        { name: 'Sosiologi', code: 'sos', type: 'pilihan', sortOrder: 8 },
        { name: 'Sejarah', code: 'sej', type: 'pilihan', sortOrder: 9 },
        { name: 'Geografi', code: 'geo', type: 'pilihan', sortOrder: 10 },
      ],
    });

    const subjectRecords = await db.subject.findMany();

    // ===== TOPICS =====
    const topicData: any[] = [];
    const bindo = subjectRecords.find(s => s.code === 'bindo')!;
    const bing = subjectRecords.find(s => s.code === 'bing')!;
    const mat = subjectRecords.find(s => s.code === 'mat')!;
    const fis = subjectRecords.find(s => s.code === 'fis')!;

    const topicNames = {
      [bindo.id]: ['Teks Narasi', 'Teks Deskripsi', 'Teks Eksposisi', 'Teks Argumentasi', 'Teks Persuasi', 'Teks Drama', 'Puisi', 'Prosedur', 'Telaah Struktur & Kebahasaan'],
      [bing.id]: ['Reading Comprehension', 'Grammar - Tenses', 'Grammar - Conditional', 'Vocabulary', 'Writing - Essay', 'Listening Comprehension', 'Idioms & Expressions'],
      [mat.id]: ['Aljabar', 'Logaritma', 'Trigonometri', 'Fungsi', 'Turunan (Kalkulus)', 'Integral', 'Statistika', 'Peluang', 'Matriks', 'Program Linear', 'Vektor', 'Barisan & Deret', 'Garis & Lingkaran'],
      [fis.id]: ['Kinematika', 'Dinamika', 'Usaha & Energi', 'Impuls & Momentum', 'Fluida Statis', 'Termodinamika', 'Listrik Statis', 'Listrik Dinamis', 'Magnet', 'Gelombang', 'Optika', 'Fisika Modern'],
    };

    for (const [subjId, topics] of Object.entries(topicNames)) {
      for (let i = 0; i < (topics as string[]).length; i++) {
        topicData.push({ name: (topics as string[])[i], subjectId: subjId, sortOrder: i });
      }
    }
    await db.topic.createMany({ data: topicData });

    // ===== USERS =====
    const pw = await hashPassword('password123');
    const pwOrtu = await hashPassword('123');

    // Super Admin
    const superAdmin = await db.user.create({
      data: { username: 'superadmin@pandai.id', email: 'admin@nalar.id', password: pw, name: 'Admin NALAR', role: 'SUPER_ADMIN', isActive: true },
    });

    // Admin Sekolah SMA1
    await db.user.create({
      data: { username: 'admin.sman1@pandai.id', email: 'admin@sma1jkt.sch.id', password: pw, name: 'Dra. Siti Rahayu', role: 'ADMIN_SCHOOL', schoolId: sma1.id, isActive: true },
    });
    // Admin SMA2
    await db.user.create({
      data: { email: 'admin@sma3bdg.sch.id', password: pw, name: 'Dr. Budi Santoso', role: 'ADMIN_SCHOOL', schoolId: sma2.id, isActive: true },
    });

    // Guru SMA1
    const guruBindo = await db.user.create({
      data: { username: '198504152010011001', nip: '198504152010011001', email: 'guru.bindo@sma1jkt.sch.id', password: pw, name: 'Hj. Ratna Dewi, M.Pd', role: 'GURU', schoolId: sma1.id, isActive: true },
    });
    const guruBing = await db.user.create({
      data: { email: 'guru.bing@sma1jkt.sch.id', password: pw, name: 'Mr. John Smith, M.Ed', role: 'GURU', schoolId: sma1.id, isActive: true },
    });
    const guruMat = await db.user.create({
      data: { email: 'guru.mat@sma1jkt.sch.id', password: pw, name: 'Ir. Agus Prasetyo, M.Si', role: 'GURU', schoolId: sma1.id, isActive: true },
    });

    // Kelas SMA1
    const kelas = await db.class.createMany({
      data: [
        { name: 'XII IPA 1', grade: 12, academicYear: '2024/2025', schoolId: sma1.id },
        { name: 'XII IPA 2', grade: 12, academicYear: '2024/2025', schoolId: sma1.id },
        { name: 'XII IPS 1', grade: 12, academicYear: '2024/2025', schoolId: sma1.id },
        { name: 'XI IPA 1', grade: 11, academicYear: '2024/2025', schoolId: sma1.id },
      ],
    });
    const classRecords = await db.class.findMany({ where: { schoolId: sma1.id } });

    // Siswa SMA1
    const siswaNames = [
      'Ahmad Rizky Pratama', 'Siti Nurhaliza', 'Muhammad Farhan', 'Dewi Lestari', 'Budi Hartono',
      'Anisa Rahma', 'Rizky Aditya', 'Putri Wulandari', 'Dimas Saputra', 'Rina Marlina',
      'Fajar Nugroho', 'Fitria Handayani', 'Galih Permana', 'Hani Oktaviani', 'Irfan Maulana',
    ];
    const siswaRecords: any[] = [];
    for (let i = 0; i < siswaNames.length; i++) {
      const cls = classRecords[i % classRecords.length];
      siswaRecords.push({
        email: `siswa${i + 1}@sma1jkt.sch.id`,
        username: i === 0 ? '0051234567' : undefined,
        nisn: i === 0 ? '0051234567' : undefined,
        password: pw,
        name: siswaNames[i],
        role: 'SISWA',
        schoolId: sma1.id,
        classId: cls.id,
        isActive: true,
      });
    }
    await db.user.createMany({ data: siswaRecords });

    // ===== GLOBAL QUESTIONS (NALAR) =====
    const globalQuestions: any[] = [];
    const systemUserId = superAdmin.id; // Use super admin as system creator

    // Bahasa Indonesia questions
    const qOptions1 = JSON.stringify([
      { label: 'A', text: 'Teks narasi', isCorrect: false },
      { label: 'B', text: 'Teks eksposisi', isCorrect: true },
      { label: 'C', text: 'Teks persuasi', isCorrect: false },
      { label: 'D', text: 'Teks prosedur', isCorrect: false },
      { label: 'E', text: 'Teks deskripsi', isCorrect: false },
    ]);
    globalQuestions.push({ subjectId: bindo.id, schoolId: null, type: 'pg', content: 'Teks yang bertujuan untuk menjelaskan atau memberitahukan sesuatu agar pembaca mengetahui dan memahami hal yang dibahas disebut...', options: qOptions1, answer: 'B', explanation: 'Teks eksposisi bertujuan untuk memberikan informasi atau penjelasan kepada pembaca.', cognitiveLevel: 'C2', difficulty: 'mudah', createdBy: systemUserId, status: 'published' });

    const qOptions2 = JSON.stringify([
      { label: 'A', text: 'Amatan langsung', isCorrect: false },
      { label: 'B', text: 'Fakta dan opini', isCorrect: false },
      { label: 'C', text: 'Tesis, argumentasi, dan penegasan ulang', isCorrect: true },
      { label: 'D', text: 'Orientasi, komplikasi, resolusi', isCorrect: false },
      { label: 'E', text: 'Identifikasi, deskripsi bagian, deskripsi kesimpulan', isCorrect: false },
    ]);
    globalQuestions.push({ subjectId: bindo.id, schoolId: null, type: 'pg', content: 'Struktur teks argumentasi terdiri atas...', options: qOptions2, answer: 'C', explanation: 'Struktur argumentasi: tesis (gagasan pokok), argumentasi (alasan), dan penegasan ulang (kesimpulan).', cognitiveLevel: 'C4', difficulty: 'sedang', createdBy: systemUserId, status: 'published' });

    const qOptions3 = JSON.stringify([
      { label: 'A', text: 'Sinonim', isCorrect: false },
      { label: 'B', text: 'Antonim', isCorrect: true },
      { label: 'C', text: 'Polisemi', isCorrect: false },
      { label: 'D', text: 'Homonim', isCorrect: false },
      { label: 'E', text: 'Hipernim', isCorrect: false },
    ]);
    globalQuestions.push({ subjectId: bindo.id, schoolId: null, type: 'pg', content: 'Hubungan kata "panas" dan "dingin" merupakan...', options: qOptions3, answer: 'B', explanation: 'Antonim adalah hubungan kata yang berlawanan makna.', cognitiveLevel: 'C2', difficulty: 'mudah', createdBy: systemUserId, status: 'published' });

    // Bahasa Inggris
    const qOptions4 = JSON.stringify([
      { label: 'A', text: 'have been working', isCorrect: true },
      { label: 'B', text: 'had worked', isCorrect: false },
      { label: 'C', text: 'has working', isCorrect: false },
      { label: 'D', text: 'were working', isCorrect: false },
      { label: 'E', text: 'is worked', isCorrect: false },
    ]);
    globalQuestions.push({ subjectId: bing.id, schoolId: null, type: 'pg', content: 'She ___ in this company for five years.', options: qOptions4, answer: 'A', explanation: 'Present Perfect Continuous: has/have + been + V-ing, digunakan untuk aksi yang dimulai di masa lalu dan masih berlanjut.', cognitiveLevel: 'C3', difficulty: 'sedang', createdBy: systemUserId, status: 'published' });

    const qOptions5 = JSON.stringify([
      { label: 'A', text: 'beautiful', isCorrect: false },
      { label: 'B', text: 'beauty', isCorrect: true },
      { label: 'C', text: 'beautifully', isCorrect: false },
      { label: 'D', text: 'beautify', isCorrect: false },
      { label: 'E', text: 'beautified', isCorrect: false },
    ]);
    globalQuestions.push({ subjectId: bing.id, schoolId: null, type: 'pg', content: 'The ___ of the sunset was breathtaking. (Choose the correct noun form)', options: qOptions5, answer: 'B', explanation: '"Beauty" adalah bentuk noun dari adjective "beautiful".', cognitiveLevel: 'C3', difficulty: 'mudah', createdBy: systemUserId, status: 'published' });

    // Matematika
    globalQuestions.push({ subjectId: mat.id, schoolId: null, type: 'isian', content: 'Jika f(x) = 2x + 3, maka f(5) = ...', answer: '13', explanation: 'f(5) = 2(5) + 3 = 10 + 3 = 13', cognitiveLevel: 'C3', difficulty: 'mudah', createdBy: systemUserId, status: 'published' });

    const qOptions6 = JSON.stringify([
      { label: 'A', text: '5 dan -5', isCorrect: false },
      { label: 'B', text: '7 dan -7', isCorrect: true },
      { label: 'C', text: '49', isCorrect: false },
      { label: 'D', text: '-49', isCorrect: false },
      { label: 'E', text: 'Tidak ada jawaban', isCorrect: false },
    ]);
    globalQuestions.push({ subjectId: mat.id, schoolId: null, type: 'pg', content: 'Akar-akar persamaan x² - 49 = 0 adalah...', options: qOptions6, answer: 'B', explanation: 'x² - 49 = 0 → x² = 49 → x = ±7', cognitiveLevel: 'C3', difficulty: 'mudah', createdBy: systemUserId, status: 'published' });

    const qOptions7 = JSON.stringify([
      { label: 'A', text: '2x + 3y = 12', isCorrect: false },
      { label: 'B', text: 'x - y = 3', isCorrect: false },
      { label: 'C', text: '2x + y = 4', isCorrect: true },
      { label: 'D', text: 'x + 2y = 6', isCorrect: false },
      { label: 'E', text: '3x - y = 1', isCorrect: false },
    ]);
    globalQuestions.push({ subjectId: mat.id, schoolId: null, type: 'pg', content: 'Diketahui sistem persamaan linear: x + y = 3 dan 3x + 2y = 7. Nilai y yang memenuhi adalah...', options: qOptions7, answer: 'C', explanation: 'Dari x + y = 3, x = 3-y. Substitusi: 3(3-y)+2y=7 → 9-3y+2y=7 → -y=-2 → y=2, maka x=1. Jawaban: 2(1)+2=4 ✓', cognitiveLevel: 'C4', difficulty: 'sedang', createdBy: systemUserId, status: 'published' });

    // Fisika
    globalQuestions.push({ subjectId: fis.id, schoolId: null, type: 'isian', content: 'Sebuah benda bermassa 2 kg bergerak dengan kecepatan 4 m/s. Berapa momentum benda tersebut? (dalam kg·m/s)', answer: '8', explanation: 'p = m × v = 2 kg × 4 m/s = 8 kg·m/s', cognitiveLevel: 'C3', difficulty: 'mudah', createdBy: systemUserId, status: 'published' });

    const qOptions8 = JSON.stringify([
      { label: 'A', text: 'Energi kinetik berkurang', isCorrect: false },
      { label: 'B', text: 'Energi potensial bertambah', isCorrect: true },
      { label: 'C', text: 'Kecepatan bertambah', isCorrect: false },
      { label: 'D', text: 'Gaya gravitasi berkurang', isCorrect: false },
      { label: 'E', text: 'Massa berubah', isCorrect: false },
    ]);
    globalQuestions.push({ subjectId: fis.id, schoolId: null, type: 'pg', content: 'Ketika sebuah benda dilempar vertikal ke atas, yang terjadi adalah...', options: qOptions8, answer: 'B', explanation: 'Saat benda naik, ketinggiannya bertambah sehingga energi potensial gravitasi bertambah.', cognitiveLevel: 'C4', difficulty: 'sedang', createdBy: systemUserId, status: 'published' });

    await db.question.createMany({ data: globalQuestions });

    // ===== PRIVATE QUESTIONS (SMA1) =====
    const privateQuestions: any[] = [];
    const pq1 = JSON.stringify([
      { label: 'A', text: 'Latar', isCorrect: false },
      { label: 'B', text: 'Amanat', isCorrect: true },
      { label: 'C', text: 'Tema', isCorrect: false },
      { label: 'D', text: 'Tokoh', isCorrect: false },
      { label: 'E', text: 'Alur', isCorrect: false },
    ]);
    privateQuestions.push({ subjectId: bindo.id, schoolId: sma1.id, type: 'pg', content: 'Pesan yang ingin disampaikan penulis kepada pembaca melalui cerita disebut...', options: pq1, answer: 'B', explanation: 'Amanat adalah pesan moral atau pelajaran yang terkandung dalam sebuah karya sastra.', cognitiveLevel: 'C4', difficulty: 'sedang', createdBy: guruBindo.id, status: 'published' });

    const pq2 = JSON.stringify([
      { label: 'A', text: 'would have gone', isCorrect: true },
      { label: 'B', text: 'will go', isCorrect: false },
      { label: 'C', text: 'goes', isCorrect: false },
      { label: 'D', text: 'went', isCorrect: false },
      { label: 'E', text: 'has gone', isCorrect: false },
    ]);
    privateQuestions.push({ subjectId: bing.id, schoolId: sma1.id, type: 'pg', content: 'If I had known about the meeting, I ___ to the office.', options: pq2, answer: 'A', explanation: 'Type 3 Conditional: If + S + had + V3, S + would have + V3.', cognitiveLevel: 'C5', difficulty: 'sulit', createdBy: guruBing.id, status: 'published' });

    privateQuestions.push({ subjectId: mat.id, schoolId: sma1.id, type: 'isian', content: 'Turunan pertama dari f(x) = x³ - 6x² + 12x - 8 adalah f\'(x) = ...', answer: '3x²-12x+12', explanation: 'f\'(x) = 3x² - 12x + 12', cognitiveLevel: 'C3', difficulty: 'sedang', createdBy: guruMat.id, status: 'published' });

    await db.question.createMany({ data: privateQuestions });

    // ===== EXAM PACKAGES =====
    const allQuestions = await db.question.findMany();
    const globalQs = allQuestions.filter(q => !q.schoolId);
    const examPkg1 = await db.examPackage.create({
      data: { title: 'Diagnostic Test TKA - Wajib', description: 'Tes diagnostik untuk mata uji wajib TKA', schoolId: null, duration: 60, totalQuestions: globalQs.length, status: 'published', createdBy: systemUserId },
    });
    // Add items to exam package
    for (let i = 0; i < globalQs.length; i++) {
      await db.examItem.create({
        data: { examPackageId: examPkg1.id, questionId: globalQs[i].id, orderNum: i, points: 1 },
      });
    }

    // Exam session
    const examSession = await db.examSession.create({
      data: {
        examPackageId: examPkg1.id,
        title: 'Tryout TKA Desember 2024',
        schoolId: sma1.id,
        startDate: new Date('2024-12-01T08:00:00'),
        endDate: new Date('2024-12-15T23:59:59'),
        duration: 60,
        shuffleQuestions: true,
        status: 'active',
        createdBy: guruBindo.id,
      },
    });

    // Assign to classes
    for (const cls of classRecords) {
      await db.examAssignment.create({
        data: { examSessionId: examSession.id, schoolId: sma1.id, classId: cls.id },
      });
    }

    // ===== SIMULATED ATTEMPTS =====
    const students = await db.user.findMany({ where: { role: 'SISWA', schoolId: sma1.id } });
    const sessionQuestions = await db.examItem.findMany({ where: { examPackageId: examPkg1.id }, include: { question: true } });

    for (let s = 0; s < Math.min(students.length, 8); s++) {
      const student = students[s];
      const cls = classRecords[s % classRecords.length];
      let correct = 0;
      const answerData: any[] = [];

      for (const item of sessionQuestions) {
        const isCorrect = Math.random() > 0.4; // ~60% correct rate
        if (isCorrect) correct++;

        if (item.question.type === 'pg' || item.question.type === 'pg_kompleks') {
          const opts = item.question.options ? JSON.parse(item.question.options) : [];
          const selectedOpt = isCorrect
            ? opts.find((o: any) => o.isCorrect)?.label || 'A'
            : opts.find((o: any) => !o.isCorrect)?.label || 'B';
          answerData.push({
            questionId: item.questionId,
            answer: selectedOpt,
            isCorrect,
            pointsEarned: isCorrect ? 1 : 0,
            timeSpent: Math.floor(Math.random() * 120) + 20,
          });
        } else {
          answerData.push({
            questionId: item.questionId,
            answer: isCorrect ? item.question.answer : 'salah',
            isCorrect,
            pointsEarned: isCorrect ? 1 : 0,
            timeSpent: Math.floor(Math.random() * 180) + 30,
          });
        }
      }

      const total = sessionQuestions.length;
      const pct = Math.round((correct / total) * 10000) / 100;

      await db.studentAttempt.create({
        data: {
          userId: student.id,
          examSessionId: examSession.id,
          examPackageId: examPkg1.id,
          schoolId: sma1.id,
          classId: cls.id,
          score: correct,
          totalCorrect: correct,
          totalWrong: total - correct,
          totalUnanswered: 0,
          percentage: pct,
          tkaPrediction: Math.round(pct * 8 + 200),
          duration: Math.floor(Math.random() * 3000) + 1200,
          status: 'submitted',
          submittedAt: new Date(Date.now() - Math.random() * 7 * 86400000),
          answers: { create: answerData },
        },
      });
    }

    // ===== TEACHER ASSIGNMENTS =====
    await db.teacherAssignment.createMany({
      data: [
        { teacherId: guruBindo.id, subjectId: bindo.id, classId: classRecords[0].id, schoolId: sma1.id, academicYear: '2024/2025', semester: 'Ganjil' },
        { teacherId: guruBindo.id, subjectId: bindo.id, classId: classRecords[1].id, schoolId: sma1.id, academicYear: '2024/2025', semester: 'Ganjil' },
        { teacherId: guruBing.id, subjectId: bing.id, classId: classRecords[0].id, schoolId: sma1.id, academicYear: '2024/2025', semester: 'Ganjil' },
        { teacherId: guruBing.id, subjectId: bing.id, classId: classRecords[3].id, schoolId: sma1.id, academicYear: '2024/2025', semester: 'Ganjil' },
        { teacherId: guruMat.id, subjectId: mat.id, classId: classRecords[0].id, schoolId: sma1.id, academicYear: '2024/2025', semester: 'Ganjil' },
        { teacherId: guruMat.id, subjectId: mat.id, classId: classRecords[1].id, schoolId: sma1.id, academicYear: '2024/2025', semester: 'Ganjil' },
        { teacherId: guruMat.id, subjectId: fis.id, classId: classRecords[0].id, schoolId: sma1.id, academicYear: '2024/2025', semester: 'Ganjil' },
      ],
    });

    // ===== ATTENDANCE (last 30 days) =====
    const statuses = ['hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'izin', 'sakit', 'alpa'];
    const attendanceData: any[] = [];
    const now = new Date();
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
      const dateStr = date.toISOString().split('T')[0];

      for (let s = 0; s < Math.min(students.length, 10); s++) {
        const student = students[s];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        attendanceData.push({
          studentId: student.id,
          classId: classRecords[s % classRecords.length].id,
          schoolId: sma1.id,
          date: dateStr,
          status,
          recordedBy: guruBindo.id,
        });
      }
    }
    // Batch insert (max 1000 at a time)
    for (let i = 0; i < attendanceData.length; i += 500) {
      await db.attendance.createMany({ data: attendanceData.slice(i, i + 500) });
    }

    // ===== TEACHING JOURNALS =====
    await db.teachingJournal.createMany({
      data: [
        { teacherId: guruBindo.id, classId: classRecords[0].id, subjectId: bindo.id, schoolId: sma1.id, date: '2025-01-06', topic: 'Teks Eksposisi - Struktur dan Ciri', activities: 'Menjelaskan struktur teks eksposisi, membaca contoh teks, diskusi kelompok', notes: 'Siswa antusias dalam diskusi kelompok' },
        { teacherId: guruBindo.id, classId: classRecords[1].id, subjectId: bindo.id, schoolId: sma1.id, date: '2025-01-06', topic: 'Teks Argumentasi', activities: 'Analisis contoh teks argumentasi dari media massa', notes: 'Perlu drill lebih banyak soal' },
        { teacherId: guruBing.id, classId: classRecords[0].id, subjectId: bing.id, schoolId: sma1.id, date: '2025-01-07', topic: 'Conditional Sentences Type 1-3', activities: 'Penjelasan materi, latihan soal, role play', notes: null },
        { teacherId: guruBing.id, classId: classRecords[3].id, subjectId: bing.id, schoolId: sma1.id, date: '2025-01-07', topic: 'Reading Comprehension Strategies', activities: 'Skimming and scanning techniques, practice passages', notes: 'Beberapa siswa masih kesulitan inferensi' },
        { teacherId: guruMat.id, classId: classRecords[0].id, subjectId: mat.id, schoolId: sma1.id, date: '2025-01-08', topic: 'Turunan Fungsi - Konsep Dasar', activities: 'Definisi turunan, contoh perhitungan, latihan 20 soal', notes: 'Materi dipahami dengan baik' },
        { teacherId: guruMat.id, classId: classRecords[1].id, subjectId: mat.id, schoolId: sma1.id, date: '2025-01-08', topic: 'Integral Tentu', activities: 'Penjelasan konsep, hubungan turunan-integral, latihan', notes: null },
        { teacherId: guruMat.id, classId: classRecords[0].id, subjectId: fis.id, schoolId: sma1.id, date: '2025-01-09', topic: 'Hukum Newton tentang Gravitasi', activities: 'Demonstrasi, perhitungan gaya gravitasi, latihan soal', notes: 'Interaktif, siswa aktif bertanya' },
      ],
    });

    // ===== CHARACTER REPORTS (7 Kebiasaan) =====
    const habitNames = ['proaktif', 'tujuan', 'prioritas', 'menang', 'mengerti', 'bersinergi', 'asah'];
    const charData: any[] = [];
    for (let dayOffset = 0; dayOffset < 20; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const dateStr = date.toISOString().split('T')[0];

      for (let s = 0; s < Math.min(students.length, 5); s++) {
        // Guru reports
        for (const habit of habitNames.slice(0, 3 + Math.floor(Math.random() * 5))) {
          charData.push({
            studentId: students[s].id,
            classId: classRecords[s % classRecords.length].id,
            schoolId: sma1.id,
            reporterId: guruBindo.id,
            date: dateStr,
            habit,
            rating: Math.floor(Math.random() * 3) + 3, // 3-5
            note: Math.random() > 0.7 ? 'Menunjukkan perkembangan baik' : null,
          });
        }
      }
    }
    for (let i = 0; i < charData.length; i += 500) {
      await db.characterReport.createMany({ data: charData.slice(i, i + 500) });
    }

    // ===== MATERIALS (Materi Pelajaran) =====
    await db.material.createMany({
      data: [
        { title: 'Pengantar Teks Eksposisi', description: 'Memahami konsep dasar teks eksposisi', content: 'Teks eksposisi adalah teks yang menjelaskan atau memberitahukan sesuatu agar pembaca mengetahui dan memahami hal yang dibahas.', subjectId: bindo.id, classId: classRecords[0].id, schoolId: sma1.id, teacherId: guruBindo.id, type: 'materi', status: 'published' },
        { title: 'Struktur Teks Argumentasi', description: 'Tesis, argumentasi, dan penegasan ulang', content: 'Teks argumentasi memiliki tiga bagian utama...', subjectId: bindo.id, classId: classRecords[0].id, schoolId: sma1.id, teacherId: guruBindo.id, type: 'materi', status: 'published' },
        { title: 'Conditional Sentences Review', description: 'Kembali mengulang conditional type 1-3', content: 'Conditional sentences digunakan untuk menyatakan...', subjectId: bing.id, classId: classRecords[0].id, schoolId: sma1.id, teacherId: guruBing.id, type: 'materi', status: 'published' },
        { title: 'Tips Reading Comprehension', description: 'Strategi menjawab soal reading', content: 'Skimming untuk gambaran umum, scanning untuk detail...', subjectId: bing.id, classId: classRecords[0].id, schoolId: sma1.id, teacherId: guruBing.id, type: 'materi', status: 'published' },
        { title: 'Turunan Fungsi Aljabar', description: 'Aturan dasar turunan', content: 'f\'(x) = limit h→0 [f(x+h) - f(x)] / h', subjectId: mat.id, classId: classRecords[0].id, schoolId: sma1.id, teacherId: guruMat.id, type: 'materi', status: 'published' },
        { title: 'Hukum Newton tentang Gravitasi', description: 'F = G(m1*m2)/r²', content: 'Hukum gravitasi universal Newton menyatakan...', subjectId: fis.id, classId: classRecords[0].id, schoolId: sma1.id, teacherId: guruMat.id, type: 'materi', status: 'published' },
        { title: 'Latihan Soal Eksposisi', description: '10 soal latihan teks eksposisi', content: 'Kerjakan 10 soal berikut...', subjectId: bindo.id, classId: classRecords[0].id, schoolId: sma1.id, teacherId: guruBindo.id, type: 'tugas', status: 'published', dueDate: '2025-02-01' },
        { title: 'Kuis Conditional Sentences', description: 'Quiz online 15 soal', subjectId: bing.id, classId: classRecords[0].id, schoolId: sma1.id, teacherId: guruBing.id, type: 'quiz', status: 'published', dueDate: '2025-01-20' },
        { title: 'Tugas Turunan Fungsi', description: '20 soal turunan fungsi', content: 'Selesaikan turunan dari fungsi-fungsi berikut...', subjectId: mat.id, classId: classRecords[0].id, schoolId: sma1.id, teacherId: guruMat.id, type: 'tugas', status: 'published', dueDate: '2025-01-25' },
        { title: 'Kuis Hukum Newton', description: '10 soal pilihan ganda', subjectId: fis.id, classId: classRecords[0].id, schoolId: sma1.id, teacherId: guruMat.id, type: 'quiz', status: 'published', dueDate: '2025-02-05' },
      ],
    });

    // ===== ACTIVITY LOGS =====
    await db.activityLog.createMany({
      data: [
        { userId: superAdmin.id, action: 'Login ke sistem', detail: 'Super admin login', module: 'auth' },
        { userId: superAdmin.id, action: 'Melihat dashboard global', detail: null, module: 'dashboard' },
        { userId: superAdmin.id, schoolId: sma1.id, action: 'Membuat sekolah baru', detail: 'SMA Negeri 1 Jakarta', module: 'schools' },
        { schoolId: sma1.id, action: 'Seed data demo', detail: 'Semua data demo berhasil dimuat', module: 'system' },
        { userId: guruBindo.id, schoolId: sma1.id, action: 'Membuat materi baru', detail: 'Pengantar Teks Eksposisi', module: 'materials' },
        { userId: guruBindo.id, schoolId: sma1.id, action: 'Membuat tugas', detail: 'Latihan Soal Eksposisi', module: 'materials' },
        { userId: guruBing.id, schoolId: sma1.id, action: 'Membuat kuis', detail: 'Kuis Conditional Sentences', module: 'materials' },
        { userId: guruMat.id, schoolId: sma1.id, action: 'Input jurnal mengajar', detail: 'Turunan Fungsi - Konsep Dasar', module: 'journals' },
        { userId: guruMat.id, schoolId: sma1.id, action: 'Input kehadiran kelas XII IPA 1', detail: '15 siswa hadir, 1 izin', module: 'attendance' },
        { userId: guruBindo.id, schoolId: sma1.id, action: 'Input laporan karakter', detail: '7 Kebiasaan - XII IPA 1', module: 'character' },
        { schoolId: sma1.id, action: 'Tryout TKA dimulai', detail: 'Tryout TKA Desember 2024', module: 'exams' },
        { schoolId: sma1.id, action: 'Backup database', detail: 'Auto backup berhasil', module: 'system' },
        { userId: guruBing.id, schoolId: sma1.id, action: 'Membuat materi baru', detail: 'Tips Reading Comprehension', module: 'materials' },
        { userId: guruMat.id, schoolId: sma1.id, action: 'Input jurnal mengajar', detail: 'Hukum Newton tentang Gravitasi', module: 'journals' },
        { schoolId: sma1.id, action: 'Registrasi akun guru baru', detail: '3 guru terdaftar', module: 'users' },
        { schoolId: sma1.id, action: 'Registrasi akun siswa', detail: '15 siswa terdaftar', module: 'users' },
        { schoolId: sma1.id, action: 'Pembuatan kelas baru', detail: '4 kelas dibuat', module: 'classes' },
        { userId: guruMat.id, schoolId: sma1.id, action: 'Input nilai siswa', detail: 'XII IPA 1 - Matematika', module: 'grades' },
      ],
    });

    // ===== ORANG TUA ACCOUNT =====
    const ortu1 = await db.user.create({
      data: { username: 'ahmad', email: 'ortu.ahmad@email.com', password: pwOrtu, name: 'Bpk. Hasan Basri', role: 'ORANG_TUA', schoolId: sma1.id, isActive: true },
    });
    // Link first student to this parent
    if (students.length > 0) {
      await db.user.update({
        where: { id: students[0].id },
        data: { parentId: ortu1.id, namaOrtu: 'Bpk. Hasan Basri' },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Data demo berhasil di-seed!',
      accounts: {
        superAdmin: { email: 'admin@nalar.id', password: 'password123' },
        adminSekolah: { email: 'admin@sma1jkt.sch.id', password: 'password123' },
        guru: { email: 'guru.bindo@sma1jkt.sch.id', password: 'password123' },
        siswa: { email: 'siswa1@sma1jkt.sch.id', password: 'password123' },
        orangTua: { username: 'ahmad', password: '123' },
      },
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Gagal seed data: ' + error.message }, { status: 500 });
  }
}
