/**
 * PANDAI - Idempotent Seed Script for PostgreSQL
 * Safe to run multiple times — uses upsert / findFirst+update patterns.
 * No deleteMany is performed.
 *
 * Usage:
 *   npx tsx prisma/seed.postgresql.ts
 *   bun run prisma/seed.postgresql.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ===== PASSWORD HELPER =====
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// ===== DATA DUMMY (same as seed.ts) =====
const DUMMY_PASSWORD = 'password123';

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

const KEPALA_SEKOLAH = [
  { username: 'kepsek.sdn1', name: 'Hj. Aminah Rasyid, S.Pd., M.Pd.', schoolIndex: 0 },
  { username: 'kepsek.smpn2', name: 'Drs. Hendra Wijaya, M.Pd.', schoolIndex: 1 },
];

const CLASSES = [
  { name: 'Kelas 4A', grade: 4, academicYear: '2024/2025', schoolIndex: 0 },
  { name: 'Kelas 4B', grade: 4, academicYear: '2024/2025', schoolIndex: 0 },
  { name: 'Kelas 8A', grade: 8, academicYear: '2024/2025', schoolIndex: 1 },
  { name: 'Kelas 8B', grade: 8, academicYear: '2024/2025', schoolIndex: 1 },
];

const SISWAS = [
  { name: 'Ahmad Fadli Rahman', nisn: '0051234567', namaOrtu: 'Bapak Rahman', jk: 'L', schoolIndex: 0, classIndex: 0 },
  { name: 'Siti Nurhaliza Putri', nisn: '0051234568', namaOrtu: 'Ibu Hajar', jk: 'P', schoolIndex: 0, classIndex: 0 },
  { name: 'Rudi Hartono', nisn: '0051234569', namaOrtu: 'Bapak Hartono', jk: 'L', schoolIndex: 0, classIndex: 0 },
  { name: 'Dewi Anggraeni', nisn: '0051234570', namaOrtu: 'Ibu Anggraeni', jk: 'P', schoolIndex: 0, classIndex: 1 },
  { name: 'Farhan Maulana', nisn: '0051234571', namaOrtu: 'Bapak Maulana', jk: 'L', schoolIndex: 0, classIndex: 1 },
  { name: 'Bagus Saputra', nisn: '0060987654', namaOrtu: 'Ibu Wati', jk: 'L', schoolIndex: 1, classIndex: 2 },
  { name: 'Rina Wulandari', nisn: '0060987655', namaOrtu: 'Bapak Widodo', jk: 'P', schoolIndex: 1, classIndex: 2 },
  { name: 'Joko Prasetyo', nisn: '0060987656', namaOrtu: 'Ibu Indah', jk: 'L', schoolIndex: 1, classIndex: 2 },
  { name: 'Maya Sari', nisn: '0060987657', namaOrtu: 'Bapak Prayoga', jk: 'P', schoolIndex: 1, classIndex: 3 },
  { name: 'Dimas Kurniawan', nisn: '0060987658', namaOrtu: 'Ibu Lestari', jk: 'L', schoolIndex: 1, classIndex: 3 },
];

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
  'bahasa-indonesia': [
    { name: 'Teks Deskripsi', subtopics: ['Ciri-ciri teks', 'Mengamati objek'] },
    { name: 'Teks Cerita Rakyat', subtopics: ['Unsur intrinsik', 'Nilai moral'] },
    { name: 'Pantun & Puisi', subtopics: ['Struktur pantun', 'Membaca puisi'] },
    { name: 'Teks Eksplanasi', subtopics: ['Struktur teks', 'Ciri kebahasaan'] },
    { name: 'Teks Persuasi', subtopics: ['Struktur teks', 'Ciri kebahasaan'] },
    { name: 'Teks Ceramah', subtopics: ['Struktur teks', 'Ciri kebahasaan'] },
  ],
  'bahasa-inggris': [
    { name: 'Greetings & Introductions', subtopics: ['Saying hello', 'Introducing oneself'] },
    { name: 'Things Around Us', subtopics: ['Vocabulary', 'Simple sentences'] },
    { name: 'Analytical Exposition', subtopics: ['Generic structure', 'Language features'] },
    { name: 'Report Text', subtopics: ['Generic structure', 'Language features'] },
    { name: 'Narrative Text', subtopics: ['Orientation', 'Complication', 'Resolution'] },
  ],
  'matematika': [
    { name: 'Pecahan & Desimal', subtopics: ['Operasi pecahan', 'Konversi desimal'] },
    { name: 'Bangun Datar', subtopics: ['Luas & keliling', 'Segitiga & segiempat'] },
    { name: 'Bangun Ruang', subtopics: ['Kubus & balok', 'Volume'] },
    { name: 'Persamaan Linear Satu Variabel', subtopics: ['Menyelesaikan PLDV', 'Soal cerita'] },
    { name: 'Sistem Persamaan Linear Dua Variabel', subtopics: ['Metode substitusi', 'Metode eliminasi'] },
    { name: 'Relasi & Fungsi', subtopics: ['Domain & range', 'Fungsi linear'] },
    { name: 'Teorema Pythagoras', subtopics: ['Rumus', 'Soal cerita'] },
  ],
  'ipa': [
    { name: 'Sifat & Perubahan Wujud Benda', subtopics: ['Menguap', 'Membeku', 'Menyublim'] },
    { name: 'Rantai Makanan', subtopics: ['Produsen', 'Konsumen', 'Dekomposer'] },
    { name: 'Sistem Tata Surya', subtopics: ['Planet', 'Satelit', 'Gravitasi'] },
    { name: 'Zat Aditif & Adiktif', subtopics: ['Pengaruh', 'Dampak kesehatan'] },
    { name: 'Getaran & Gelombang', subtopics: ['Gelombang bunyi', 'Gelombang cahaya'] },
  ],
  'ips': [
    { name: 'Peta & Globe', subtopics: ['Membaca peta', 'Garis lintang'] },
    { name: 'Sejarah Indonesia', subtopics: ['Kemerdekaan', 'Pahlawan nasional'] },
    { name: 'Kehidupan Masyarakat Praaksara', subtopics: ['Hunting', 'Gathering', 'Bercocok tanam'] },
    { name: 'Pemerintahan Daerah', subtopics: ['Otonomi', 'Pemekaran'] },
    { name: 'Interaksi Sosial', subtopics: ['Bentuk interaksi', 'Sosialisasi'] },
  ],
  'pkn': [
    { name: 'Nilai Pancasila', subtopics: ['Sila 1-5', 'Sila 6-10'] },
    { name: 'Hak & Kewajiban', subtopics: ['Di rumah', 'Di sekolah'] },
    { name: 'Norma & Keadilan', subtopics: ['Norma hukum', 'Norma sosial'] },
    { name: 'Keberagaman Budaya', subtopics: ['Multikulturalisme', 'Toleransi'] },
  ],
  'seni-budaya': [
    { name: 'Seni Rupa', subtopics: ['Menggambar', 'Mewarnai'] },
    { name: 'Seni Musik', subtopics: ['Nada', 'Irama'] },
    { name: 'Seni Rupa Tradisional', subtopics: ['Batik', 'Ukiran'] },
    { name: 'Tari Tradisional', subtopics: ['Gerakan', 'Iringan'] },
  ],
  'pjok': [
    { name: 'Permainan Bola Besar', subtopics: ['Bola voli', 'Bola basket'] },
    { name: 'Atletik', subtopics: ['Lari', 'Lompat', 'Lempar'] },
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

// ===== IDEMPOTENT HELPERS =====

/**
 * Pre-compute deterministic ORANG_TUA usernames from seed data.
 * Matches the original seed.ts logic but resolves conflicts deterministically.
 */
function computeOrtuEntries(siswaList: typeof SISWAS) {
  const seen: Map<string, number> = new Map(); // username -> count
  const entries: { username: string; name: string; schoolIndex: number; siswaIndex: number }[] = [];

  for (let i = 0; i < siswaList.length; i++) {
    const s = siswaList[i];
    if (!s.namaOrtu) continue;

    const ortuFirstName =
      s.namaOrtu.trim().split(/\s+/).slice(1)[0]?.toLowerCase() ||
      s.namaOrtu.trim().split(/\s+/)[0].toLowerCase();

    // Dedup: if same schoolIndex + username already seen, reuse that entry
    const existing = entries.find(
      (e) => e.schoolIndex === s.schoolIndex && e.username === ortuFirstName,
    );
    if (existing) {
      continue; // reuse — will be linked by siswaIndex later
    }

    // Resolve conflicts across all entries (not just same school)
    let username = ortuFirstName;
    const count = seen.get(username) ?? 0;
    if (count > 0) {
      username = `${ortuFirstName}${count + 1}`;
    }
    seen.set(ortuFirstName, count + 1);

    entries.push({
      username,
      name: s.namaOrtu.trim(),
      schoolIndex: s.schoolIndex,
      siswaIndex: i,
    });
  }
  return entries;
}

// ===== MAIN SEED FUNCTION =====
async function main() {
  console.log('🌱 PANDAI Idempotent Seed Script (PostgreSQL) - Memulai...\n');

  const hashedPassword = await hashPassword(DUMMY_PASSWORD);
  console.log(`🔐 Password hashed (bcrypt, cost 12): ${hashedPassword.substring(0, 20)}...`);

  // ─────────────────────────────────────────────
  // 1. SCHOOLS — upsert by code (@unique)
  // ─────────────────────────────────────────────
  console.log('\n🏫 Upserting sekolah...');
  const schoolIds: string[] = [];
  for (const schoolData of SCHOOLS) {
    const school = await prisma.school.upsert({
      where: { code: schoolData.code },
      update: { name: schoolData.name },
      create: schoolData,
    });
    console.log(`   ${school.id === school.id ? '✅' : '🔄'} ${school.name} (${school.code}) — ${school.schoolType}`);
    schoolIds.push(school.id);
  }

  // ─────────────────────────────────────────────
  // 2. SUBSCRIPTIONS — findFirst by schoolId, then create/update
  // ─────────────────────────────────────────────
  console.log('\n💰 Upserting subscriptions...');
  for (let i = 0; i < schoolIds.length; i++) {
    const plan = SCHOOLS[i].plan;
    const existing = await prisma.subscription.findFirst({
      where: { schoolId: schoolIds[i] },
    });

    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          plan,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2026-01-01'),
          amount: plan === 'pro' ? 500000 : 250000,
          status: 'active',
        },
      });
      console.log(`   🔄 Updated: Subscription ${plan} untuk ${SCHOOLS[i].name}`);
    } else {
      await prisma.subscription.create({
        data: {
          schoolId: schoolIds[i],
          plan,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2026-01-01'),
          amount: plan === 'pro' ? 500000 : 250000,
        },
      });
      console.log(`   ✅ Created: Subscription ${plan} untuk ${SCHOOLS[i].name}`);
    }
  }

  // ─────────────────────────────────────────────
  // 3. SUPER ADMIN — upsert by email (@unique)
  // ─────────────────────────────────────────────
  console.log('\n👤 Upserting Super Admin...');
  const superAdminEmail = 'superadmin@pandai.id';
  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: { name: 'Super Admin PANDAI', role: 'SUPER_ADMIN', isActive: true, password: hashedPassword },
    create: {
      email: superAdminEmail,
      password: hashedPassword,
      name: 'Super Admin PANDAI',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`   ✅ ${superAdminEmail}`);

  // ─────────────────────────────────────────────
  // 4. ADMIN SEKOLAH — upsert by email (@unique)
  // ─────────────────────────────────────────────
  console.log('\n👨‍💼 Upserting Admin Sekolah...');
  for (const adminData of ADMINS) {
    const schoolName = SCHOOLS[adminData.schoolIndex].name;
    await prisma.user.upsert({
      where: { email: adminData.email },
      update: {
        name: adminData.name,
        role: 'ADMIN_SCHOOL',
        schoolId: schoolIds[adminData.schoolIndex],
        isActive: true,
        password: hashedPassword,
      },
      create: {
        email: adminData.email,
        password: hashedPassword,
        name: adminData.name,
        role: 'ADMIN_SCHOOL',
        schoolId: schoolIds[adminData.schoolIndex],
        isActive: true,
      },
    });
    console.log(`   ✅ ${adminData.email} (${schoolName})`);
  }

  // ─────────────────────────────────────────────
  // 5. KEPALA SEKOLAH — upsert by username (@unique)
  // ─────────────────────────────────────────────
  console.log('\n🎓 Upserting Kepala Sekolah...');
  for (const kepsekData of KEPALA_SEKOLAH) {
    const schoolName = SCHOOLS[kepsekData.schoolIndex].name;
    await prisma.user.upsert({
      where: { username: kepsekData.username },
      update: {
        name: kepsekData.name,
        role: 'KEPALA_SEKOLAH',
        schoolId: schoolIds[kepsekData.schoolIndex],
        isActive: true,
        password: hashedPassword,
      },
      create: {
        username: kepsekData.username,
        password: hashedPassword,
        name: kepsekData.name,
        role: 'KEPALA_SEKOLAH',
        schoolId: schoolIds[kepsekData.schoolIndex],
        isActive: true,
      },
    });
    console.log(`   ✅ ${kepsekData.name} (login: ${kepsekData.username}, ${schoolName})`);
  }

  // ─────────────────────────────────────────────
  // 6. GURU — upsert by username (@unique, = NIP/NIK)
  // ─────────────────────────────────────────────
  console.log('\n👩‍🏫 Upserting Guru...');
  for (const guruData of GURUS) {
    const loginId = guruData.nip || guruData.nik!;
    const schoolName = SCHOOLS[guruData.schoolIndex].name;
    await prisma.user.upsert({
      where: { username: loginId },
      update: {
        name: guruData.name,
        role: 'GURU',
        schoolId: schoolIds[guruData.schoolIndex],
        nip: guruData.nip || null,
        nik: guruData.nik || null,
        isActive: true,
        password: hashedPassword,
      },
      create: {
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
    console.log(`   ✅ ${guruData.name} (login: ${loginId}, ${schoolName})`);
  }

  // ─────────────────────────────────────────────
  // 7. ORANG TUA — upsert by username (@unique)
  //    Pre-compute entries first so we can link parentId for siswa.
  // ─────────────────────────────────────────────
  console.log('\n👨‍👩‍👧 Upserting Orang Tua...');
  const ortuHash = await hashPassword('123');
  const ortuEntries = computeOrtuEntries(SISWAS);

  // Build a lookup: siswaIndex -> parentId
  const siswaToParentId: Record<number, string> = {};

  // First, figure out which siswaIndex maps to which ortu entry
  const ortuBySiswaIndex: Record<number, typeof ortuEntries[number]> = {};
  for (const entry of ortuEntries) {
    ortuBySiswaIndex[entry.siswaIndex] = entry;
  }

  // For each siswa that has namaOrtu, find the matching ortu entry
  // (the first siswa in a school+username group defines the ortu)
  for (let i = 0; i < SISWAS.length; i++) {
    const s = SISWAS[i];
    if (!s.namaOrtu) continue;

    const ortuFirstName =
      s.namaOrtu.trim().split(/\s+/).slice(1)[0]?.toLowerCase() ||
      s.namaOrtu.trim().split(/\s+/)[0].toLowerCase();

    // Find the ortu entry for this school+username
    const ortuEntry = ortuEntries.find(
      (e) => e.schoolIndex === s.schoolIndex && e.username.startsWith(ortuFirstName),
    );
    if (ortuEntry) {
      siswaToParentId[i] = ortuEntry.username; // temporarily store username, will resolve to ID
    }
  }

  // Upsert all ORANG_TUA users
  const ortuUsernameToId: Map<string, string> = new Map();
  for (const entry of ortuEntries) {
    const schoolName = SCHOOLS[entry.schoolIndex].name;
    const ortu = await prisma.user.upsert({
      where: { username: entry.username },
      update: {
        name: entry.name,
        role: 'ORANG_TUA',
        schoolId: schoolIds[entry.schoolIndex],
        isActive: true,
        password: ortuHash,
      },
      create: {
        username: entry.username,
        password: ortuHash,
        name: entry.name,
        role: 'ORANG_TUA',
        schoolId: schoolIds[entry.schoolIndex],
        isActive: true,
      },
    });
    ortuUsernameToId.set(entry.username, ortu.id);
    console.log(`   ✅ ${ortu.name} (login: ${entry.username}, password: 123, ${schoolName})`);
  }

  // ─────────────────────────────────────────────
  // 8. CLASSES — findFirst by name+schoolId, then create/update
  // ─────────────────────────────────────────────
  console.log('\n🏫 Upserting Rombel...');
  const classIds: string[] = [];
  for (const classData of CLASSES) {
    const schoolName = SCHOOLS[classData.schoolIndex].name;
    const existing = await prisma.class.findFirst({
      where: {
        name: classData.name,
        schoolId: schoolIds[classData.schoolIndex],
      },
    });

    let cls;
    if (existing) {
      cls = await prisma.class.update({
        where: { id: existing.id },
        data: {
          grade: classData.grade,
          academicYear: classData.academicYear,
        },
      });
      console.log(`   🔄 Updated: ${cls.name} (${schoolName})`);
    } else {
      cls = await prisma.class.create({
        data: {
          name: classData.name,
          grade: classData.grade,
          academicYear: classData.academicYear,
          schoolId: schoolIds[classData.schoolIndex],
        },
      });
      console.log(`   ✅ Created: ${cls.name} (${schoolName})`);
    }
    classIds.push(cls.id);
  }

  // ─────────────────────────────────────────────
  // 9. SISWA — upsert by username (@unique, = NISN)
  // ─────────────────────────────────────────────
  console.log('\n👨‍🎓 Upserting Siswa...');
  for (let i = 0; i < SISWAS.length; i++) {
    const s = SISWAS[i];
    const className = CLASSES[s.classIndex].name;

    // Resolve parentId from username to actual ID
    let parentId: string | undefined;
    const parentUsername = siswaToParentId[i];
    if (parentUsername) {
      parentId = ortuUsernameToId.get(parentUsername);
    }

    await prisma.user.upsert({
      where: { username: s.nisn },
      update: {
        name: s.name,
        role: 'SISWA',
        schoolId: schoolIds[s.schoolIndex],
        classId: classIds[s.classIndex],
        nisn: s.nisn,
        namaOrtu: s.namaOrtu || null,
        jk: s.jk || null,
        parentId: parentId || null,
        isActive: true,
        password: hashedPassword,
      },
      create: {
        username: s.nisn,
        password: hashedPassword,
        name: s.name,
        role: 'SISWA',
        schoolId: schoolIds[s.schoolIndex],
        classId: classIds[s.classIndex],
        nisn: s.nisn,
        namaOrtu: s.namaOrtu || null,
        jk: s.jk || null,
        parentId: parentId || null,
        isActive: true,
      },
    });
    console.log(`   ✅ ${s.name} (NISN: ${s.nisn}, ${className})`);
  }

  // ─────────────────────────────────────────────
  // 10. SUBJECTS — upsert by code (@unique)
  // ─────────────────────────────────────────────
  console.log('\n📚 Upserting Mata Pelajaran & Topik...');
  const subjectIds: Record<string, string> = {};
  for (const subjectData of SUBJECTS_DATA) {
    const subject = await prisma.subject.upsert({
      where: { code: subjectData.code },
      update: {
        name: subjectData.name,
        type: subjectData.type,
        sortOrder: subjectData.sortOrder,
      },
      create: subjectData,
    });
    subjectIds[subjectData.code] = subject.id;
    console.log(`   ✅ ${subjectData.name}`);

    const topics = TOPICS_DATA[subjectData.code] || [];

    // ── Parent topics — findFirst by name+subjectId+parentId(null)
    for (let t = 0; t < topics.length; t++) {
      const topicData = topics[t];
      const existing = await prisma.topic.findFirst({
        where: {
          name: topicData.name,
          subjectId: subject.id,
          parentId: null,
        },
      });

      let parentTopic;
      if (existing) {
        parentTopic = await prisma.topic.update({
          where: { id: existing.id },
          data: { sortOrder: t + 1 },
        });
      } else {
        parentTopic = await prisma.topic.create({
          data: {
            name: topicData.name,
            subjectId: subject.id,
            sortOrder: t + 1,
          },
        });
      }

      // ── Subtopics — findFirst by name+subjectId+parentId
      for (const subtopicName of topicData.subtopics) {
        const existingSub = await prisma.topic.findFirst({
          where: {
            name: subtopicName,
            subjectId: subject.id,
            parentId: parentTopic.id,
          },
        });

        if (!existingSub) {
          await prisma.topic.create({
            data: {
              name: subtopicName,
              subjectId: subject.id,
              parentId: parentTopic.id,
            },
          });
        }
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
  console.log('✅ IDEMPOTENT SEED COMPLETED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log(`   👤 Total Users    : ${totalUsers}`);
  console.log(`   🏫 Total Schools  : ${totalSchools} (1 SD + 1 SMP)`);
  console.log(`   📋 Total Classes  : ${totalClasses}`);
  console.log(`   📚 Total Subjects : ${totalSubjects}`);
  console.log(`   📝 Total Topics   : ${totalTopics}`);
  console.log('');
  console.log('📋 DAFTAR AKUN DEMO:');
  console.log('   Super Admin      : superadmin@pandai.id / password123');
  console.log('   Admin Sekolah SD : admin.sdn1@pandai.id / password123');
  console.log('   Admin Sekolah SMP: admin.smpn2@pandai.id / password123');
  console.log('   Kepala Sekolah SD: kepsek.sdn1 / password123');
  console.log('   Kepala Sekolah SMP: kepsek.smpn2 / password123');
  console.log('   Guru SD          : 198504152010011001 / password123');
  console.log('   Guru SMP         : 3502155678090002 / password123');
  console.log('   Siswa SD         : 0051234567 / password123');
  console.log('   Siswa SMP        : 0060987654 / password123');
  console.log('   Orang Tua SD     : rahman / 123');
  console.log('   Orang Tua SMP    : wati / 123');
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
