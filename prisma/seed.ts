/**
 * PANDAI - Seed Script
 * Membuat data dummy untuk testing: 1 SD, 1 SMP, semua role RBAC, rombel, dan mata pelajaran
 *
 * Usage: bun run prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===== PASSWORD HELPER (sama dengan src/lib/constants.ts) =====
function getSalt(): string {
  return process.env.PASSWORD_SALT || 'pandai_dev_salt_2024';
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + getSalt());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== DATA DUMMY =====
const DUMMY_PASSWORD = 'password123'; // Password universal semua akun dummy (kecuali Orang Tua: 123)

const SCHOOLS = [
  {
    name: 'SD Negeri 1 Makassar',
    code: 'SDN1-MKS',
    npsn: '40200101',
    address: 'Jl. Sultan Alauddin No. 10, Makassar',
    phone: '0411-873456',
    email: 'info@sdn1makassar.sch.id',
    province: 'Sulawesi Selatan',
    city: 'Kota Makassar',
    district: 'Kec. Mariso',
    principalName: 'Hj. Aminah Rasyid, S.Pd., M.Pd.',
    accreditation: 'A',
    schoolType: 'SD',
    established: '1978',
    curriculum: 'Kurikulum Merdeka',
    plan: 'pro',
    maxStudents: 300,
  },
  {
    name: 'SMP Negeri 2 Surabaya',
    code: 'SMPN2-SBY',
    npsn: '20502001',
    address: 'Jl. Rungkut Industri No. 5, Surabaya',
    phone: '031-8781234',
    email: 'info@smpn2surabaya.sch.id',
    province: 'Jawa Timur',
    city: 'Kota Surabaya',
    district: 'Kec. Rungkut',
    principalName: 'Drs. Hendra Wijaya, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMP',
    established: '1985',
    curriculum: 'Kurikulum Merdeka',
    plan: 'starter',
    maxStudents: 400,
  },
];

const ADMINS = [
  { email: 'admin.sdn1@pandai.id', name: 'Siti Nurjannah, S.Pd.', schoolIndex: 0 },
  { email: 'admin.smpn2@pandai.id', name: 'Drs. Budi Prasetyo', schoolIndex: 1 },
];

const GURUS = [
  { name: 'Andi Mustafa, S.Pd.', nip: '198504152010011001', schoolIndex: 0 },
  { name: 'Linda Permata, S.Pd.', nik: '3502155678090002', schoolIndex: 1 },
];

const CLASSES = [
  // SD Negeri 1 Makassar
  { name: 'Kelas 4A', grade: 4, academicYear: '2024/2025', schoolIndex: 0 },
  { name: 'Kelas 4B', grade: 4, academicYear: '2024/2025', schoolIndex: 0 },
  // SMP Negeri 2 Surabaya
  { name: 'Kelas 8A', grade: 8, academicYear: '2024/2025', schoolIndex: 1 },
  { name: 'Kelas 8B', grade: 8, academicYear: '2024/2025', schoolIndex: 1 },
];

const SISWAS = [
  // SD Negeri 1 Makassar - Kelas 4A
  { name: 'Ahmad Fadli Rahman', nisn: '0051234567', namaOrtu: 'Bapak Rahman', jk: 'L', schoolIndex: 0, classIndex: 0 },
  { name: 'Siti Nurhaliza Putri', nisn: '0051234568', namaOrtu: 'Ibu Hajar', jk: 'P', schoolIndex: 0, classIndex: 0 },
  { name: 'Rudi Hartono', nisn: '0051234569', namaOrtu: 'Bapak Hartono', jk: 'L', schoolIndex: 0, classIndex: 0 },
  // SD Negeri 1 Makassar - Kelas 4B
  { name: 'Dewi Anggraeni', nisn: '0051234570', namaOrtu: 'Ibu Anggraeni', jk: 'P', schoolIndex: 0, classIndex: 1 },
  { name: 'Farhan Maulana', nisn: '0051234571', namaOrtu: 'Bapak Maulana', jk: 'L', schoolIndex: 0, classIndex: 1 },
  // SMP Negeri 2 Surabaya - Kelas 8A
  { name: 'Bagus Saputra', nisn: '0060987654', namaOrtu: 'Ibu Wati', jk: 'L', schoolIndex: 1, classIndex: 2 },
  { name: 'Rina Wulandari', nisn: '0060987655', namaOrtu: 'Bapak Widodo', jk: 'P', schoolIndex: 1, classIndex: 2 },
  { name: 'Joko Prasetyo', nisn: '0060987656', namaOrtu: 'Ibu Indah', jk: 'L', schoolIndex: 1, classIndex: 2 },
  // SMP Negeri 2 Surabaya - Kelas 8B
  { name: 'Maya Sari', nisn: '0060987657', namaOrtu: 'Bapak Prayoga', jk: 'P', schoolIndex: 1, classIndex: 3 },
  { name: 'Dimas Kurniawan', nisn: '0060987658', namaOrtu: 'Ibu Lestari', jk: 'L', schoolIndex: 1, classIndex: 3 },
];

// Mata pelajaran global (digunakan SD, SMP, SMA, SMK — 1 entri per mapel)
const SUBJECTS_DATA = [
  { name: 'Bahasa Indonesia', code: 'bahasa-indonesia', type: 'wajib', sortOrder: 1 },
  { name: 'Bahasa Inggris', code: 'bahasa-inggris', type: 'wajib', sortOrder: 2 },
  { name: 'Matematika', code: 'matematika', type: 'wajib', sortOrder: 3 },
  { name: 'IPA (Ilmu Pengetahuan Alam)', code: 'ipa', type: 'wajib', sortOrder: 4 },
  { name: 'IPS (Ilmu Pengetahuan Sosial)', code: 'ips', type: 'wajib', sortOrder: 5 },
  { name: 'PKn (Pendidikan Kewarganegaraan)', code: 'pkn', type: 'wajib', sortOrder: 6 },
  { name: 'Seni Budaya', code: 'seni-budaya', type: 'wajib', sortOrder: 7 },
  { name: 'PJOK (Pendidikan Jasmani)', code: 'pjok', type: 'wajib', sortOrder: 8 },
  { name: 'Prakarya', code: 'prakarya', type: 'wajib', sortOrder: 9 },
  { name: 'Bahasa Daerah', code: 'bahasa-daerah', type: 'wajib', sortOrder: 10 },
];

const TOPICS_DATA: Record<string, { name: string; subtopics: string[] }[]> = {
  // Bahasa Indonesia (SD + SMP topics merged)
  'bahasa-indonesia': [
    // SD topics
    { name: 'Teks Deskripsi', subtopics: ['Ciri-ciri teks', 'Mengamati objek'] },
    { name: 'Teks Cerita Rakyat', subtopics: ['Unsur intrinsik', 'Nilai moral'] },
    { name: 'Pantun & Puisi', subtopics: ['Struktur pantun', 'Membaca puisi'] },
    // SMP topics
    { name: 'Teks Eksplanasi', subtopics: ['Struktur teks', 'Ciri kebahasaan'] },
    { name: 'Teks Persuasi', subtopics: ['Struktur teks', 'Ciri kebahasaan'] },
    { name: 'Teks Ceramah', subtopics: ['Struktur teks', 'Ciri kebahasaan'] },
  ],
  'bahasa-inggris': [
    // SD topics
    { name: 'Greetings & Introductions', subtopics: ['Saying hello', 'Introducing oneself'] },
    { name: 'Things Around Us', subtopics: ['Vocabulary', 'Simple sentences'] },
    // SMP topics
    { name: 'Analytical Exposition', subtopics: ['Generic structure', 'Language features'] },
    { name: 'Report Text', subtopics: ['Generic structure', 'Language features'] },
    { name: 'Narrative Text', subtopics: ['Orientation', 'Complication', 'Resolution'] },
  ],
  'matematika': [
    // SD topics
    { name: 'Pecahan & Desimal', subtopics: ['Operasi pecahan', 'Konversi desimal'] },
    { name: 'Bangun Datar', subtopics: ['Luas & keliling', 'Segitiga & segiempat'] },
    { name: 'Bangun Ruang', subtopics: ['Kubus & balok', 'Volume'] },
    // SMP topics
    { name: 'Persamaan Linear Satu Variabel', subtopics: ['Menyelesaikan PLDV', 'Soal cerita'] },
    { name: 'Sistem Persamaan Linear Dua Variabel', subtopics: ['Metode substitusi', 'Metode eliminasi'] },
    { name: 'Relasi & Fungsi', subtopics: ['Domain & range', 'Fungsi linear'] },
    { name: 'Teorema Pythagoras', subtopics: ['Rumus', 'Soal cerita'] },
  ],
  'ipa': [
    // SD topics
    { name: 'Sifat & Perubahan Wujud Benda', subtopics: ['Menguap', 'Membeku', 'Menyublim'] },
    { name: 'Rantai Makanan', subtopics: ['Produsen', 'Konsumen', 'Dekomposer'] },
    // SMP topics
    { name: 'Sistem Tata Surya', subtopics: ['Planet', 'Satelit', 'Gravitasi'] },
    { name: 'Zat Aditif & Adiktif', subtopics: ['Pengaruh', 'Dampak kesehatan'] },
    { name: 'Getaran & Gelombang', subtopics: ['Gelombang bunyi', 'Gelombang cahaya'] },
  ],
  'ips': [
    // SD topics
    { name: 'Peta & Globe', subtopics: ['Membaca peta', 'Garis lintang'] },
    { name: 'Sejarah Indonesia', subtopics: ['Kemerdekaan', 'Pahlawan nasional'] },
    // SMP topics
    { name: 'Kehidupan Masyarakat Praaksara', subtopics: ['Hunting', 'Gathering', 'Bercocok tanam'] },
    { name: 'Pemerintahan Daerah', subtopics: ['Otonomi', 'Pemekaran'] },
    { name: 'Interaksi Sosial', subtopics: ['Bentuk interaksi', 'Sosialisasi'] },
  ],
  'pkn': [
    // SD topics
    { name: 'Nilai Pancasila', subtopics: ['Sila 1-5', 'Sila 6-10'] },
    { name: 'Hak & Kewajiban', subtopics: ['Di rumah', 'Di sekolah'] },
    // SMP topics
    { name: 'Norma & Keadilan', subtopics: ['Norma hukum', 'Norma sosial'] },
    { name: 'Keberagaman Budaya', subtopics: ['Multikulturalisme', 'Toleransi'] },
  ],
  'seni-budaya': [
    // SD topics (SBdP)
    { name: 'Seni Rupa', subtopics: ['Menggambar', 'Mewarnai'] },
    { name: 'Seni Musik', subtopics: ['Nada', 'Irama'] },
    // SMP topics
    { name: 'Seni Rupa Tradisional', subtopics: ['Batik', 'Ukiran'] },
    { name: 'Tari Tradisional', subtopics: ['Gerakan', 'Iringan'] },
  ],
  'pjok': [
    // SD topics
    { name: 'Permainan Bola Besar', subtopics: ['Bola voli', 'Bola basket'] },
    { name: 'Atletik', subtopics: ['Lari', 'Lompat', 'Lempar'] },
    // SMP topics
    { name: 'Permainan Bola Besar Lanjutan', subtopics: ['Bola sepak', 'Bola voli lanjutan'] },
    { name: 'Pencak Silat', subtopics: ['Kuda-kuda', 'Pukulan', 'Tendangan'] },
  ],
  'prakarya': [
    { name: 'Kerajinan Tangan', subtopics: ['Recycle', 'Bahan lunak'] },
    { name: 'Teknologi Ramah Lingkungan', subtopics: ['Energi terbarukan', 'Daur ulang'] },
  ],
  'bahasa-daerah': [
    { name: 'Sastra Daerah', subtopics: ['Pantun', 'Cerita rakyat lokal'] },
    { name: 'Aksara Daerah', subtopics: ['Huruf Lontara', 'Huruf Jawa'] },
  ],
};

// ===== MAIN SEED FUNCTION =====
async function main() {
  console.log('🌱 PANDAI Seed Script - Memulai...\n');

  const hashedPassword = await hashPassword(DUMMY_PASSWORD);
  console.log(`🔐 Password hash: ${hashedPassword.substring(0, 16)}...`);

  // 1. Bersihkan data lama (seed idempotent via skip logic, but for clean reseed:)
  // Hapus semua data terkait users
  await prisma.assignmentAnswer.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignmentQuestion.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.studentAnswer.deleteMany();
  await prisma.studentAttempt.deleteMany();
  await prisma.examAssignment.deleteMany();
  await prisma.examSession.deleteMany();
  await prisma.examItem.deleteMany();
  await prisma.examPackage.deleteMany();
  await prisma.question.deleteMany();
  await prisma.diagnosticResult.deleteMany();
  await prisma.externalQuizScore.deleteMany();
  await prisma.characterReport.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.teachingJournal.deleteMany();
  await prisma.teacherAssignment.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatbotSession.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.school.deleteMany();
  console.log('🧹 Data lama dihapus');

  // 2. Buat Sekolah
  console.log('\n🏫 Membuat sekolah...');
  const schoolIds: string[] = [];
  for (const schoolData of SCHOOLS) {
    const school = await prisma.school.create({ data: schoolData });
    console.log(`   ✅ Created: ${school.name} (${school.code}) — ${school.schoolType}`);
    schoolIds.push(school.id);
  }

  // 3. Buat Subscription
  console.log('\n💰 Membuat subscription...');
  for (let i = 0; i < schoolIds.length; i++) {
    await prisma.subscription.create({
      data: {
        schoolId: schoolIds[i],
        plan: SCHOOLS[i].plan,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-01-01'),
        amount: SCHOOLS[i].plan === 'pro' ? 500000 : 250000,
      },
    });
    console.log(`   ✅ Subscription ${SCHOOLS[i].plan} untuk ${SCHOOLS[i].name}`);
  }

  // 4. Buat Super Admin
  console.log('\n👤 Membuat Super Admin...');
  const superAdminEmail = 'superadmin@pandai.id';
  await prisma.user.create({
    data: {
      email: superAdminEmail,
      password: hashedPassword,
      name: 'Super Admin PANDAI',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`   ✅ Created: ${superAdminEmail}`);

  // 5. Buat Admin Sekolah
  console.log('\n👨‍💼 Membuat Admin Sekolah...');
  for (const adminData of ADMINS) {
    await prisma.user.create({
      data: {
        email: adminData.email,
        password: hashedPassword,
        name: adminData.name,
        role: 'ADMIN_SCHOOL',
        schoolId: schoolIds[adminData.schoolIndex],
        isActive: true,
      },
    });
    console.log(`   ✅ Created: ${adminData.email} (${SCHOOLS[adminData.schoolIndex].name})`);
  }

  // 5.5 Buat Kepala Sekolah
  console.log('\n🎓 Membuat Kepala Sekolah...');
  const KEPALA_SEKOLAH = [
    { username: 'kepsek.sdn1', name: 'Hj. Aminah Rasyid, S.Pd., M.Pd.', schoolIndex: 0 },
    { username: 'kepsek.smpn2', name: 'Drs. Hendra Wijaya, M.Pd.', schoolIndex: 1 },
  ];
  for (const kepsekData of KEPALA_SEKOLAH) {
    await prisma.user.create({
      data: {
        username: kepsekData.username,
        password: hashedPassword,
        name: kepsekData.name,
        role: 'KEPALA_SEKOLAH',
        schoolId: schoolIds[kepsekData.schoolIndex],
        isActive: true,
      },
    });
    console.log(`   ✅ Created: ${kepsekData.name} (login: ${kepsekData.username}, ${SCHOOLS[kepsekData.schoolIndex].name})`);
  }

  // 6. Buat Guru (login pakai NIP/NIK)
  console.log('\n👩‍🏫 Membuat Guru...');
  for (const guruData of GURUS) {
    const loginId = guruData.nip || guruData.nik;
    await prisma.user.create({
      data: {
        username: loginId,
        password: hashedPassword,
        name: guruData.name,
        role: 'GURU',
        schoolId: schoolIds[guruData.schoolIndex],
        nip: guruData.nip || null,
        nik: guruData.nik || null,
        isActive: true,
      },
    });
    console.log(`   ✅ Created: ${guruData.name} (login: ${loginId}, ${SCHOOLS[guruData.schoolIndex].name})`);
  }

  // 7. Buat Rombel (Kelas)
  console.log('\n🏫 Membuat Rombel...');
  const classIds: string[] = [];
  for (const classData of CLASSES) {
    const cls = await prisma.class.create({
      data: {
        name: classData.name,
        grade: classData.grade,
        academicYear: classData.academicYear,
        schoolId: schoolIds[classData.schoolIndex],
      },
    });
    console.log(`   ✅ Created: ${cls.name} (${SCHOOLS[classData.schoolIndex].name})`);
    classIds.push(cls.id);
  }

  // 8. Buat Siswa (login pakai NISN) + auto-create Orang Tua
  console.log('\n👨‍🎓 Membuat Siswa & Orang Tua...');
  const ortuHash = await hashPassword('123');
  const ORTU_ACCOUNTS: { username: string; name: string; schoolIndex: number }[] = [];
  for (const siswaData of SISWAS) {
    // Auto-create Orang Tua
    let parentId: string | undefined;
    if (siswaData.namaOrtu) {
      const ortuFirstName = siswaData.namaOrtu.trim().split(/\s+/).slice(1)[0]?.toLowerCase() || siswaData.namaOrtu.trim().split(/\s+/)[0].toLowerCase();
      // Check if ortu already exists
      const existingOrtu = ORTU_ACCOUNTS.find(o => o.schoolIndex === siswaData.schoolIndex && o.username === ortuFirstName);
      if (existingOrtu) {
        const ortuUser = await prisma.user.findFirst({ where: { username: existingOrtu.username, role: 'ORANG_TUA' } });
        parentId = ortuUser?.id;
      } else {
        // Generate unique username
        let ortuUsername = ortuFirstName;
        let counter = 1;
        while (await prisma.user.findUnique({ where: { username: ortuUsername } })) {
          ortuUsername = `${ortuFirstName}${counter++}`;
        }
        const ortu = await prisma.user.create({
          data: {
            username: ortuUsername,
            password: ortuHash,
            name: siswaData.namaOrtu.trim(),
            role: 'ORANG_TUA',
            schoolId: schoolIds[siswaData.schoolIndex],
            isActive: true,
          },
        });
        parentId = ortu.id;
        ORTU_ACCOUNTS.push({ username: ortuUsername, name: ortu.name, schoolIndex: siswaData.schoolIndex });
        console.log(`   👨‍👩‍👧 Created Ortu: ${ortu.name} (login: ${ortuUsername}, password: 123)`);
      }
    }

    await prisma.user.create({
      data: {
        username: siswaData.nisn,
        password: hashedPassword,
        name: siswaData.name,
        role: 'SISWA',
        schoolId: schoolIds[siswaData.schoolIndex],
        classId: classIds[siswaData.classIndex],
        nisn: siswaData.nisn,
        namaOrtu: siswaData.namaOrtu || null,
        jk: siswaData.jk || null,
        parentId,
        isActive: true,
      },
    });
    console.log(`   ✅ Created: ${siswaData.name} (NISN: ${siswaData.nisn}, ${CLASSES[siswaData.classIndex].name})`);
  }

  // 9. Buat Mata Pelajaran & Topik (global)
  console.log('\n📚 Membuat Mata Pelajaran & Topik...');
  for (const subjectData of SUBJECTS_DATA) {
    const subject = await prisma.subject.create({
      data: subjectData,
    });
    console.log(`   ✅ Created: ${subjectData.name}`);

    const topics = TOPICS_DATA[subjectData.code] || [];
    for (const topicData of topics) {
      const topic = await prisma.topic.create({
        data: {
          name: topicData.name,
          subjectId: subject.id,
          sortOrder: topics.indexOf(topicData) + 1,
        },
      });
      for (const subtopic of topicData.subtopics) {
        await prisma.topic.create({
          data: {
            name: subtopic,
            subjectId: subject.id,
            parentId: topic.id,
          },
        });
      }
    }
  }

  // ===== SUMMARY =====
  const totalUsers = await prisma.user.count();
  const totalSchools = await prisma.school.count();
  const totalClasses = await prisma.class.count();
  const totalSubjects = await prisma.subject.count();
  const totalTopics = await prisma.topic.count();

  console.log('\n' + '='.repeat(60));
  console.log('✅ SEED COMPLETED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log(`   👤 Total Users    : ${totalUsers}`);
  console.log(`   🏫 Total Schools  : ${totalSchools} (1 SD + 1 SMP)`);
  console.log(`   📋 Total Classes  : ${totalClasses}`);
  console.log(`   📚 Total Subjects : ${totalSubjects}`);
  console.log(`   📝 Total Topics   : ${totalTopics}`);
  console.log('');
  console.log('📋 DAFTAR AKUN DEMO:');
  console.log('   Super Admin     : superadmin@pandai.id / password123');
  console.log('   Admin Sekolah SD: admin.sdn1@pandai.id / password123');
  console.log('   Admin Sekolah SMP: admin.smpn2@pandai.id / password123');
  console.log('   Kepala Sekolah SD: kepsek.sdn1 / password123');
  console.log('   Kepala Sekolah SMP: kepsek.smpn2 / password123');
  console.log('   Guru SD         : 198504152010011001 / password123');
  console.log('   Guru SMP        : 3502155678090002 / password123');
  console.log('   Siswa SD        : 0051234567 / password123');
  console.log('   Siswa SMP       : 0060987654 / password123');
  console.log('   Orang Tua SD    : rahman / 123');
  console.log('   Orang Tua SMP   : wati / 123');
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
