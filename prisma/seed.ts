/**
 * PANDAI - Seed Script
 * Membuat data dummy untuk testing: 2 sekolah, 4 role RBAC, rombel, dan mata pelajaran
 *
 * Usage: bun run prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===== PASSWORD HELPER (sama dengan src/lib/constants.ts) =====
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'pandai_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== DATA DUMMY =====
const DUMMY_PASSWORD = 'password123'; // Password universal semua akun dummy

const SCHOOLS = [
  {
    name: 'SMA Negeri 1 Makassar',
    code: 'SMAN1-MKS',
    npsn: '40201234',
    address: 'Jl. Sultan Alauddin No. 5, Makassar',
    phone: '0411-873456',
    email: 'info@sman1makassar.sch.id',
    province: 'Sulawesi Selatan',
    city: 'Kota Makassar',
    district: 'Kec. Mariso',
    principalName: 'Dr. H. Ahmad Daud, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1962',
    curriculum: 'Kurikulum Merdeka',
    plan: 'pro',
    maxStudents: 500,
  },
  {
    name: 'SMK Negeri 2 Surabaya',
    code: 'SMKN2-SBY',
    npsn: '20504567',
    address: 'Jl. Rungkut Industri No. 12, Surabaya',
    phone: '031-8781234',
    email: 'info@smkn2surabaya.sch.id',
    province: 'Jawa Timur',
    city: 'Kota Surabaya',
    district: 'Kec. Rungkut',
    principalName: 'Ir. Bambang Suryanto, M.T.',
    accreditation: 'A',
    schoolType: 'SMK',
    established: '1975',
    curriculum: 'Kurikulum Merdeka',
    plan: 'starter',
    maxStudents: 300,
  },
];

const ADMINS = [
  { email: 'admin.sman1@pandai.id', name: 'Hj. Siti Rahmawati, S.Pd.', schoolIndex: 0 },
  { email: 'admin.smkn2@pandai.id', name: 'Drs. Budi Prasetyo', schoolIndex: 1 },
];

const GURUS = [
  { name: 'Andi Mustafa, S.Pd., M.Si.', nip: '198504152010011001', schoolIndex: 0 },
  { name: 'Linda Permata, S.Kom., M.Pd.', nik: '3502155678090002', schoolIndex: 1 },
];

const CLASSES = [
  { name: 'XII IPA 1', grade: 12, academicYear: '2024/2025', schoolIndex: 0 },
  { name: 'XII IPA 2', grade: 12, academicYear: '2024/2025', schoolIndex: 0 },
  { name: 'XII TKJ 1', grade: 12, academicYear: '2024/2025', schoolIndex: 1 },
  { name: 'XII RPL 1', grade: 12, academicYear: '2024/2025', schoolIndex: 1 },
];

const SISWAS = [
  // SMA Negeri 1 Makassar - XII IPA 1
  { name: 'Ahmad Fadli Rahman', nisn: '0051234567', namaOrtu: 'Rahman', jk: 'L', schoolIndex: 0, classIndex: 0 },
  { name: 'Siti Nurhaliza Putri', nisn: '0051234568', namaOrtu: 'Haji Putri', jk: 'P', schoolIndex: 0, classIndex: 0 },
  { name: 'Rudi Hartono', nisn: '0051234569', namaOrtu: 'Hartono', jk: 'L', schoolIndex: 0, classIndex: 0 },
  // SMA Negeri 1 Makassar - XII IPA 2
  { name: 'Dewi Anggraeni', nisn: '0051234570', namaOrtu: 'Anggraeni', jk: 'P', schoolIndex: 0, classIndex: 1 },
  { name: 'Farhan Maulana', nisn: '0051234571', namaOrtu: 'Maulana', jk: 'L', schoolIndex: 0, classIndex: 1 },
  // SMK Negeri 2 Surabaya - XII TKJ 1
  { name: 'Bagus Saputra', nisn: '0060987654', namaOrtu: 'Saputra', jk: 'L', schoolIndex: 1, classIndex: 2 },
  { name: 'Rina Wati', nisn: '0060987655', namaOrtu: 'Wati', jk: 'P', schoolIndex: 1, classIndex: 2 },
  { name: 'Joko Widodo Putra', nisn: '0060987656', namaOrtu: 'Widodo', jk: 'L', schoolIndex: 1, classIndex: 2 },
  // SMK Negeri 2 Surabaya - XII RPL 1
  { name: 'Maya Indah', nisn: '0060987657', namaOrtu: 'Indah', jk: 'P', schoolIndex: 1, classIndex: 3 },
  { name: 'Dimas Prayoga', nisn: '0060987658', namaOrtu: 'Prayoga', jk: 'L', schoolIndex: 1, classIndex: 3 },
];

const SUBJECTS_DATA = [
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
];

const TOPICS_DATA: Record<string, { name: string; subtopics: string[] }[]> = {
  bindo: [
    { name: 'Teks Eksplanasi', subtopics: ['Struktur teks', 'Ciri kebahasaan'] },
    { name: 'Teks Persuasi', subtopics: ['Struktur teks', 'Ciri kebahasaan'] },
    { name: 'Teks Ceramah', subtopics: ['Struktur teks', 'Ciri kebahasaan'] },
  ],
  bing: [
    { name: 'Analytical Exposition', subtopics: ['Generic structure', 'Language features'] },
    { name: 'Report Text', subtopics: ['Generic structure', 'Language features'] },
  ],
  mat: [
    { name: 'Induksi Matematika', subtopics: ['Langkah induksi', 'Bukti'] },
    { name: 'Program Linear', subtopics: ['Nilai optimum', 'Daerah feasibel'] },
    { name: 'Matriks', subtopics: ['Operasi matriks', 'Determinan', 'Invers'] },
  ],
  fis: [
    { name: 'Gerak Harmonik', subtopics: ['Persamaan umum', 'Energi'] },
    { name: 'Gelombang', subtopics: ['Sifat gelombang', 'Interferensi'] },
  ],
  kim: [
    { name: 'Larutan Penyangga', subtopics: ['Asam-basa', 'pH larutan'] },
    { name: 'Termokimia', subtopics: ['Reaksi eksoterm', 'Reaksi endoterm'] },
  ],
  bio: [
    { name: 'Genetika', subtopics: ['Hukum Mendel', 'Mutasi'] },
    { name: 'Evolusi', subtopics: ['Teori Darwin', 'Seleksi alam'] },
  ],
  eko: [
    { name: 'Pertumbuhan Ekonomi', subtopics: ['Indikator', 'Faktor'] },
    { name: 'APBN & APBD', subtopics: ['Struktur', 'Kebijakan fiskal'] },
  ],
  sos: [
    { name: 'Struktur Sosial', subtopics: ['Stratifikasi', 'Mobilitas sosial'] },
    { name: 'Konflik Sosial', subtopics: ['Penyebab', 'Penyelesaian'] },
  ],
  sej: [
    { name: 'Sejarah Indonesia Modern', subtopics: ['Orde Baru', 'Reformasi'] },
    { name: 'Perang Dunia II', subtopics: ['Penyebab', 'Dampak'] },
  ],
  geo: [
    { name: 'Atmosfer', subtopics: ['Lapisan atmosfer', 'Iklim'] },
    { name: 'Hidrosfer', subtopics: ['Arus laut', 'Dampak perubahan'] },
  ],
};

// ===== MAIN SEED FUNCTION =====
async function main() {
  console.log('🌱 PANDAI Seed Script - Memulai...\n');

  const hashedPassword = await hashPassword(DUMMY_PASSWORD);
  console.log(`🔐 Password hash: ${hashedPassword.substring(0, 16)}...`);

  // 1. Bersihkan data lama (opsional - uncomment jika ingin reset total)
  // await prisma.studentAnswer.deleteMany();
  // await prisma.studentAttempt.deleteMany();
  // await prisma.examAssignment.deleteMany();
  // await prisma.examSession.deleteMany();
  // await prisma.examItem.deleteMany();
  // await prisma.examPackage.deleteMany();
  // await prisma.question.deleteMany();
  // await prisma.diagnosticResult.deleteMany();
  // await prisma.topic.deleteMany();
  // await prisma.subject.deleteMany();
  // await prisma.user.deleteMany();
  // await prisma.class.deleteMany();
  // await prisma.subscription.deleteMany();
  // await prisma.school.deleteMany();

  // 2. Buat Sekolah
  console.log('\n🏫 Membuat sekolah...');
  const schoolIds: string[] = [];
  for (const schoolData of SCHOOLS) {
    const existing = await prisma.school.findFirst({ where: { npsn: schoolData.npsn } });
    if (existing) {
      console.log(`   ✅ Skip: ${schoolData.name} (NPSN: ${schoolData.npsn}) sudah ada`);
      schoolIds.push(existing.id);
      continue;
    }
    const school = await prisma.school.create({ data: schoolData });
    console.log(`   ✅ Created: ${school.name} (${school.code})`);
    schoolIds.push(school.id);
  }

  // 3. Buat Subscription
  console.log('\n💰 Membuat subscription...');
  for (let i = 0; i < schoolIds.length; i++) {
    const existing = await prisma.subscription.findFirst({ where: { schoolId: schoolIds[i] } });
    if (existing) continue;
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
  const existingSA = await prisma.user.findFirst({ where: { email: superAdminEmail } });
  if (existingSA) {
    console.log(`   ✅ Skip: ${superAdminEmail} sudah ada`);
  } else {
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
  }

  // 5. Buat Admin Sekolah
  console.log('\n👨‍💼 Membuat Admin Sekolah...');
  for (const adminData of ADMINS) {
    const existing = await prisma.user.findFirst({ where: { email: adminData.email } });
    if (existing) {
      console.log(`   ✅ Skip: ${adminData.email} sudah ada`);
      continue;
    }
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

  // 6. Buat Guru (login pakai NIP/NIK)
  console.log('\n👩‍🏫 Membuat Guru...');
  for (const guruData of GURUS) {
    const loginId = guruData.nip || guruData.nik;
    const existing = await prisma.user.findFirst({ where: { username: loginId } });
    if (existing) {
      console.log(`   ✅ Skip: ${loginId} sudah ada`);
      continue;
    }
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
    const existing = await prisma.class.findFirst({
      where: {
        schoolId: schoolIds[classData.schoolIndex],
        name: classData.name,
        academicYear: classData.academicYear,
      },
    });
    if (existing) {
      console.log(`   ✅ Skip: ${classData.name} sudah ada`);
      classIds.push(existing.id);
      continue;
    }
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
  for (const siswaData of SISWAS) {
    const existing = await prisma.user.findFirst({ where: { nisn: siswaData.nisn } });
    if (existing) {
      console.log(`   ✅ Skip: NISN ${siswaData.nisn} sudah ada`);
      continue;
    }

    // Auto-create Orang Tua
    let parentId: string | undefined;
    if (siswaData.namaOrtu) {
      const ortuFirstName = siswaData.namaOrtu.trim().split(/\s+/)[0].toLowerCase();
      // Check if ortu already exists
      const existingOrtu = await prisma.user.findFirst({
        where: { role: 'ORANG_TUA', schoolId: schoolIds[siswaData.schoolIndex], name: siswaData.namaOrtu.trim(), isActive: true },
      });
      if (existingOrtu) {
        parentId = existingOrtu.id;
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
    const existingSubject = await prisma.subject.findFirst({ where: { code: subjectData.code } });
    const subjectId = existingSubject?.id || (await prisma.subject.create({
      data: subjectData,
    })).id;

    if (existingSubject) {
      console.log(`   ✅ Skip: ${subjectData.name} sudah ada`);
      continue;
    }
    console.log(`   ✅ Created: ${subjectData.name}`);

    const topics = TOPICS_DATA[subjectData.code] || [];
    for (const topicData of topics) {
      const topic = await prisma.topic.create({
        data: {
          name: topicData.name,
          subjectId,
          sortOrder: topics.indexOf(topicData) + 1,
        },
      });
      for (const subtopic of topicData.subtopics) {
        await prisma.topic.create({
          data: {
            name: subtopic,
            subjectId,
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

  console.log('\n' + '='.repeat(55));
  console.log('✅ SEED COMPLETED SUCCESSFULLY');
  console.log('='.repeat(55));
  console.log(`   👤 Total Users    : ${totalUsers}`);
  console.log(`   🏫 Total Schools  : ${totalSchools}`);
  console.log(`   📋 Total Classes  : ${totalClasses}`);
  console.log(`   📚 Total Subjects : ${totalSubjects}`);
  console.log(`   📝 Total Topics   : ${totalTopics}`);
  console.log(`   🔑 Password       : ${DUMMY_PASSWORD}`);
  console.log('='.repeat(55));
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
