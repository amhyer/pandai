import PDFDocument from 'pdfkit';
import { db } from './db';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 40;
const COL_W = A4_W - MARGIN * 2;

const HABIT_LABELS: Record<string, string> = {
  bangun_pagi: 'Bangun Pagi',
  beribadah: 'Beribadah',
  berolahraga: 'Berolahraga',
  makan_sehat: 'Makan Sehat',
  gemar_belajar: 'Gemar Belajar',
  bermasyarakat: 'Bermasyarakat',
  tidur_cepat: 'Tidur Cepat',
};

const HABIT_RATING: Record<number, string> = {
  1: 'Mulai Berkembang',
  2: 'Kadang',
  3: 'Sering',
  4: 'Selalu',
};

const DIM_LABELS: Record<string, string> = {
  KEIMANAN_KETAKWAAN: 'Keimanan & Ketakwaan',
  KEWARGAAN: 'Kewarganegaraan',
  PENALARAN_KRITIS: 'Penalaran Kritis',
  KREATIVITAS: 'Kreativitas',
  KOLABORASI: 'Kolaborasi',
  KEMANDIRIAN: 'Kemandirian',
  KESEHATAN: 'Kesehatan',
  KOMUNIKASI: 'Komunikasi',
};

const DIM_SHORT: Record<string, string> = {
  KEIMANAN_KETAKWAAN: 'Iman',
  KEWARGAAN: 'Warga',
  PENALARAN_KRITIS: 'Kritis',
  KREATIVITAS: 'Kreatif',
  KOLABORASI: 'Kolab',
  KEMANDIRIAN: 'Mandiri',
  KESEHATAN: 'Sehat',
  KOMUNIKASI: 'Komunik',
};

function predikat(n: number | null): string {
  if (n === null || n === undefined) return '-';
  if (n >= 90) return 'A';
  if (n >= 80) return 'B';
  if (n >= 70) return 'C';
  if (n >= 60) return 'D';
  return 'E';
}

// ═══════════════════════════════════════════════════════════════
// RAPOR SISWA (1 halaman A4)
// ═══════════════════════════════════════════════════════════════

export async function generateRaporSiswaPDF(studentId: string, term: string): Promise<Buffer> {
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, nisn: true, nip: true, schoolId: true, classId: true, parentId: true, jk: true },
  });
  if (!student) throw new Error('Siswa tidak ditemukan');

  const school = await db.school.findUnique({ where: { id: student.schoolId! } });
  if (!school) throw new Error('Sekolah tidak ditemukan');

  const klass = student.classId ? await db.class.findUnique({ where: { id: student.classId } }) : null;
  const parent = student.parentId ? await db.user.findUnique({ where: { id: student.parentId }, select: { name: true } }) : null;
  const kepsek = await db.user.findFirst({ where: { role: 'KEPALA_SEKOLAH', schoolId: student.schoolId!, isActive: true }, select: { name: true, nip: true } });

  // Get grade components and student grades
  const components = await db.gradeComponent.findMany({
    where: { schoolId: student.schoolId!, term },
    orderBy: { sortOrder: 'asc' },
  });

  const grades = await db.studentGrade.findMany({
    where: { studentId, term },
  });

  // Best score per component
  const best: Record<string, { score: number; maxScore: number; source: string }> = {};
  for (const g of grades) {
    if (!best[g.componentId] || g.score > best[g.componentId].score) {
      best[g.componentId] = { score: g.score, maxScore: g.maxScore, source: g.source };
    }
  }

  // Calculate final grade with SIMANTAP normalization
  let weightedSum = 0;
  let totalWeightFilled = 0;
  const compResults: { name: string; weight: number; score: number | null; weighted: number | null }[] = [];

  for (const comp of components) {
    const g = best[comp.id];
    if (g) {
      const normalized = (g.score / Math.max(g.maxScore, 1)) * 100;
      const weighted = (normalized * comp.weight) / 100;
      weightedSum += weighted;
      totalWeightFilled += comp.weight;
      compResults.push({ name: comp.name, weight: comp.weight, score: g.score, weighted: Math.round(weighted * 100) / 100 });
    } else {
      compResults.push({ name: comp.name, weight: comp.weight, score: null, weighted: null });
    }
  }

  const finalGrade = totalWeightFilled > 0 ? Math.round(weightedSum * 100 / totalWeightFilled * 100) / 100 : null;

  // Attendance recap
  const attendanceRecords = await db.attendance.findMany({ where: { studentId, schoolId: student.schoolId! } });
  const attCounts: Record<string, number> = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  for (const a of attendanceRecords) {
    if (a.status in attCounts) attCounts[a.status]++;
  }
  const totalAtt = Object.values(attCounts).reduce((s, v) => s + v, 0);

  // 7 Kebiasaan
  const charReports = await db.characterReport.findMany({
    where: { studentId, schoolId: student.schoolId! },
    select: { habit: true, rating: true },
  });
  const habitMap: Record<string, number> = {};
  for (const c of charReports) {
    if (!habitMap[c.habit] || c.rating > habitMap[c.habit]) habitMap[c.habit] = c.rating;
  }

  // 8 Dimensi Profil Lulusan
  const compAssess = await db.competencyAssessment.findMany({
    where: { studentId, term },
    select: { dimension: true, rating: true },
  });
  const dimMap: Record<string, { sum: number; count: number }> = {};
  for (const a of compAssess) {
    if (!dimMap[a.dimension]) dimMap[a.dimension] = { sum: 0, count: 0 };
    dimMap[a.dimension].sum += a.rating;
    dimMap[a.dimension].count++;
  }
  const dimAvg: Record<string, number> = {};
  for (const [k, v] of Object.entries(dimMap)) {
    dimAvg[k] = Math.round((v.sum / v.count) * 100) / 100;
  }

  // ═══ BUILD PDF ═══
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c as Buffer));

  let y = MARGIN;

  // ── KOP SURAT ──
  doc.fontSize(12).font('Helvetica-Bold').text(school.name.toUpperCase(), MARGIN, y, { width: COL_W, align: 'center' });
  y += 16;
  if (school.npsn) {
    doc.fontSize(8).font('Helvetica').text(`NPSN: ${school.npsn}`, MARGIN, y, { width: COL_W, align: 'center' });
    y += 12;
  }
  if (school.address) {
    doc.fontSize(8).font('Helvetica').text(school.address, MARGIN, y, { width: COL_W, align: 'center' });
    y += 12;
  }
  if (school.accreditation) {
    doc.fontSize(8).font('Helvetica').text(`Akreditasi: ${school.accreditation}`, MARGIN, y, { width: COL_W, align: 'center' });
    y += 12;
  }
  y += 4;
  doc.moveTo(MARGIN, y).lineTo(A4_W - MARGIN, y).stroke('#333');
  y += 4;
  doc.moveTo(MARGIN, y).lineTo(A4_W - MARGIN, y).stroke('#333');
  y += 10;

  // ── JUDUL ──
  doc.fontSize(12).font('Helvetica-Bold').text('LAPORAN HASIL BELAJAR SISWA', MARGIN, y, { width: COL_W, align: 'center' });
  y += 16;
  doc.fontSize(9).font('Helvetica').text(`Periode: ${term}`, MARGIN, y, { width: COL_W, align: 'center' });
  y += 16;

  // ── IDENTITAS SISWA ──
  const leftX = MARGIN;
  const rightX = MARGIN + COL_W / 2 + 10;
  doc.fontSize(9).font('Helvetica-Bold').text('Nama Siswa', leftX, y).font('Helvetica').text(`: ${student.name}`, leftX + 90, y);
  doc.font('Helvetica-Bold').text('Kelas', rightX, y).font('Helvetica').text(`: ${klass?.name || '-'}`, rightX + 45, y);
  y += 13;
  doc.font('Helvetica-Bold').text('NIS/NISN', leftX, y).font('Helvetica').text(`: ${student.nisn || student.nip || '-'}`, leftX + 90, y);
  doc.font('Helvetica-Bold').text('L/P', rightX, y).font('Helvetica').text(`: ${student.jk === 'L' ? 'Laki-laki' : student.jk === 'P' ? 'Perempuan' : '-'}`, rightX + 45, y);
  y += 13;
  doc.font('Helvetica-Bold').text('Orang Tua', leftX, y).font('Helvetica').text(`: ${parent?.name || '-'}`, leftX + 90, y);
  y += 16;

  // ── TABEL NILAI PER KOMPONEN ──
  doc.moveTo(MARGIN, y).lineTo(A4_W - MARGIN, y).stroke('#333');
  y += 3;
  const colW: number[] = [40, 140, 55, 80, 65, 75];
  const colLabels = ['No', 'Komponen', 'Bobot(%)', 'Nilai', 'Terbobot', 'Predikat'];
  const colX: number[] = [];
  let cx = MARGIN;
  for (let i = 0; i < colW.length; i++) { colX.push(cx); cx += colW[i]; }

  doc.fontSize(8).font('Helvetica-Bold');
  for (let i = 0; i < colLabels.length; i++) {
    doc.text(colLabels[i], colX[i] + 2, y, { width: colW[i] - 4 });
  }
  y += 13;
  doc.moveTo(MARGIN, y).lineTo(A4_W - MARGIN, y).stroke('#999');
  y += 2;

  doc.font('Helvetica');
  compResults.forEach((r, idx) => {
    doc.text(String(idx + 1), colX[0] + 2, y, { width: colW[0] - 4 });
    doc.text(r.name, colX[1] + 2, y, { width: colW[1] - 4 });
    doc.text(String(r.weight), colX[2] + 2, y, { width: colW[2] - 4, align: 'center' });
    doc.text(r.score !== null ? String(r.score) : '-', colX[3] + 2, y, { width: colW[3] - 4, align: 'center' });
    doc.text(r.weighted !== null ? String(r.weighted) : '-', colX[4] + 2, y, { width: colW[4] - 4, align: 'center' });
    doc.text(predikat(r.score), colX[5] + 2, y, { width: colW[5] - 4, align: 'center' });
    y += 12;
  });

  doc.moveTo(MARGIN, y).lineTo(A4_W - MARGIN, y).stroke('#999');
  y += 3;
  doc.font('Helvetica-Bold').fontSize(8);
  doc.text('Nilai Akhir (Normalisasi)', MARGIN + 2, y);
  doc.text(`${finalGrade ?? '-'}`, colX[3] + 2, y, { width: colW[3] - 4, align: 'center' });
  doc.text(predikat(finalGrade), colX[5] + 2, y, { width: colW[5] - 4, align: 'center' });
  y += 14;
  doc.font('Helvetica').fontSize(7);
  doc.fillColor('#666').text(
    totalWeightFilled > 0 && totalWeightFilled < 100
      ? `* Dinormalisasi terhadap ${totalWeightFilled}% bobot terisi (komponen kosong diabaikan)`
      : '', MARGIN, y, { width: COL_W }
  );
  doc.fillColor('#000');
  y += 14;

  // ── KEHADIRAN ──
  doc.fontSize(9).font('Helvetica-Bold').text('Rekap Kehadiran', MARGIN, y);
  y += 13;
  doc.font('Helvetica').fontSize(8);
  doc.text(`Hadir: ${attCounts.hadir} hari`, MARGIN + 10, y);
  doc.text(`Izin: ${attCounts.izin} hari`, MARGIN + 140, y);
  doc.text(`Sakit: ${attCounts.sakit} hari`, MARGIN + 250, y);
  doc.text(`Alpa: ${attCounts.alpa} hari`, MARGIN + 360, y);
  y += 16;

  // ── 7 KEBIASAAN ──
  doc.fontSize(9).font('Helvetica-Bold').text('Capaian 7 Kebiasaan Anak Indonesia Hebat', MARGIN, y);
  y += 12;
  const habits = Object.keys(HABIT_LABELS);
  if (habits.some(h => habitMap[h])) {
    doc.font('Helvetica').fontSize(7);
    let hx = MARGIN + 10;
    let hy = y;
    for (const h of habits) {
      const r = habitMap[h];
      const label = HABIT_LABELS[h] || h;
      const val = r ? HABIT_RATING[r] || `${r}` : '-';
      doc.text(`${label}: ${val}`, hx, hy, { width: 230 });
      hy += 10;
      if (hy > y + 40) { hy = y; hx += 240; }
    }
    y += 50;
  } else {
    doc.font('Helvetica').fontSize(8).fillColor('#999').text('Belum ada data kebiasaan', MARGIN + 10, y);
    doc.fillColor('#000');
    y += 14;
  }

  // ── 8 DIMENSI PROFIL LULUSAN ──
  doc.fontSize(9).font('Helvetica-Bold').text('Profil Lulusan (8 Dimensi P5)', MARGIN, y);
  y += 12;
  const dims = Object.keys(DIM_LABELS);
  if (dims.some(d => dimAvg[d] !== undefined)) {
    doc.font('Helvetica').fontSize(7);
    let dx = MARGIN + 10;
    let dy = y;
    for (const d of dims) {
      const avg = dimAvg[d];
      const label = DIM_SHORT[d] || d;
      const val = avg !== undefined ? `${avg}` : '-';
      doc.text(`${label}: ${val}`, dx, dy, { width: 230 });
      dy += 10;
      if (dy > y + 40) { dy = y; dx += 240; }
    }
    y += 50;
  } else {
    doc.font('Helvetica').fontSize(8).fillColor('#999').text('Belum ada data profil lulusan', MARGIN + 10, y);
    doc.fillColor('#000');
    y += 14;
  }

  // ── CATATAN GURU ──
  doc.fontSize(9).font('Helvetica-Bold').text('Catatan Guru:', MARGIN, y);
  y += 13;
  doc.font('Helvetica').fontSize(8).fillColor('#999').text('(Belum diisi)', MARGIN + 10, y);
  doc.fillColor('#000');
  y += 20;

  // ── TANDA TANGAN ──
  if (y > A4_H - 100) { doc.addPage(); y = MARGIN; }
  y = Math.max(y, A4_H - 100);

  const sigY = y;
  const sigW = COL_W / 3;
  doc.fontSize(8).font('Helvetica');
  doc.text('Wali Kelas,', MARGIN, sigY, { width: sigW, align: 'center' });
  doc.text('Orang Tua,', MARGIN + sigW, sigY, { width: sigW, align: 'center' });
  doc.text('Kepala Sekolah,', MARGIN + sigW * 2, sigY, { width: sigW, align: 'center' });

  const signGap = 50;
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('(____________________)', MARGIN, sigY + signGap, { width: sigW, align: 'center' });
  doc.text('(____________________)', MARGIN + sigW, sigY + signGap, { width: sigW, align: 'center' });
  doc.text(kepsek?.name || '(____________________)', MARGIN + sigW * 2, sigY + signGap, { width: sigW, align: 'center' });
  if (kepsek?.nip) {
    doc.font('Helvetica').fontSize(7);
    doc.text(`NIP. ${kepsek.nip}`, MARGIN + sigW * 2, sigY + signGap + 14, { width: sigW, align: 'center' });
  }

  doc.end();
  return Buffer.concat(chunks);
}

// ═══════════════════════════════════════════════════════════════
// RAPOR SISWA (JSON)
// ═══════════════════════════════════════════════════════════════

export async function getRaporSiswaData(studentId: string, term: string) {
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, nisn: true, nip: true, schoolId: true, classId: true, parentId: true, jk: true },
  });
  if (!student) throw new Error('Siswa tidak ditemukan');

  const school = await db.school.findUnique({ where: { id: student.schoolId! } });
  const klass = student.classId ? await db.class.findUnique({ where: { id: student.classId } }) : null;
  const parent = student.parentId ? await db.user.findUnique({ where: { id: student.parentId }, select: { name: true } }) : null;
  const kepsek = await db.user.findFirst({ where: { role: 'KEPALA_SEKOLAH', schoolId: student.schoolId!, isActive: true }, select: { name: true, nip: true } });

  const components = await db.gradeComponent.findMany({ where: { schoolId: student.schoolId!, term }, orderBy: { sortOrder: 'asc' } });
  const grades = await db.studentGrade.findMany({ where: { studentId, term } });

  const best: Record<string, { score: number; maxScore: number; source: string }> = {};
  for (const g of grades) {
    if (!best[g.componentId] || g.score > best[g.componentId].score) best[g.componentId] = { score: g.score, maxScore: g.maxScore, source: g.source };
  }

  let weightedSum = 0;
  let totalWeightFilled = 0;
  const compResults = components.map(comp => {
    const g = best[comp.id];
    if (g) {
      const normalized = (g.score / Math.max(g.maxScore, 1)) * 100;
      const weighted = (normalized * comp.weight) / 100;
      weightedSum += weighted;
      totalWeightFilled += comp.weight;
      return { name: comp.name, weight: comp.weight, score: g.score, weighted: Math.round(weighted * 100) / 100 };
    }
    return { name: comp.name, weight: comp.weight, score: null, weighted: null };
  });

  const finalGrade = totalWeightFilled > 0 ? Math.round(weightedSum * 100 / totalWeightFilled * 100) / 100 : null;

  const attRecs = await db.attendance.findMany({ where: { studentId, schoolId: student.schoolId! } });
  const attendance = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  for (const a of attRecs) { if (a.status in attendance) (attendance as Record<string, number>)[a.status]++; }

  const charReports = await db.characterReport.findMany({ where: { studentId, schoolId: student.schoolId! }, select: { habit: true, rating: true } });
  const habits: Record<string, number> = {};
  for (const c of charReports) { if (!habits[c.habit] || c.rating > habits[c.habit]) habits[c.habit] = c.rating; }

  const compAssess = await db.competencyAssessment.findMany({ where: { studentId, term }, select: { dimension: true, rating: true } });
  const dimMap: Record<string, { sum: number; count: number }> = {};
  for (const a of compAssess) {
    if (!dimMap[a.dimension]) dimMap[a.dimension] = { sum: 0, count: 0 };
    dimMap[a.dimension].sum += a.rating;
    dimMap[a.dimension].count++;
  }
  const profilLulusan: Record<string, number> = {};
  for (const [k, v] of Object.entries(dimMap)) profilLulusan[k] = Math.round((v.sum / v.count) * 100) / 100;

  return {
    school: { name: school?.name, npsn: school?.npsn, address: school?.address, province: school?.province, city: school?.city, accreditation: school?.accreditation },
    student: { name: student.name, nisn: student.nisn, kelas: klass?.name, jk: student.jk, ortuName: parent?.name },
    kepsek: { name: kepsek?.name, nip: kepsek?.nip },
    term,
    components: compResults,
    finalGrade,
    totalWeightFilled,
    totalWeightAll: components.reduce((s, c) => s + c.weight, 0),
    predikat: predikat(finalGrade),
    attendance,
    habits,
    profilLulusan,
  };
}

// ═══════════════════════════════════════════════════════════════
// REKAP KELAS (JSON)
// ═══════════════════════════════════════════════════════════════

export async function getRekapKelasData(classId: string, term: string) {
  const klass = await db.class.findUnique({ where: { id: classId }, include: { school: { select: { id: true, name: true } } } });
  if (!klass) throw new Error('Kelas tidak ditemukan');

  const students = await db.user.findMany({
    where: { role: 'SISWA', classId, schoolId: klass.schoolId, isActive: true },
    select: { id: true, name: true, nisn: true },
    orderBy: { name: 'asc' },
  });

  const components = await db.gradeComponent.findMany({ where: { schoolId: klass.schoolId, term }, orderBy: { sortOrder: 'asc' } });
  const compIds = components.map(c => c.id);

  const allGrades = compIds.length > 0
    ? await db.studentGrade.findMany({ where: { studentId: { in: students.map(s => s.id) }, componentId: { in: compIds }, term } })
    : [];

  const studentResults = students.map(student => {
    const sGrades = allGrades.filter(g => g.studentId === student.id);
    const best: Record<string, number> = {};
    for (const g of sGrades) {
      if (!best[g.componentId] || g.score > best[g.componentId]) best[g.componentId] = g.score;
    }

    let wSum = 0, twf = 0;
    for (const comp of components) {
      const s = best[comp.id];
      if (s !== undefined) {
        wSum += (s / 100) * comp.weight;
        twf += comp.weight;
      }
    }
    const fg = twf > 0 ? Math.round(wSum * 100 / twf * 100) / 100 : null;
    return { studentId: student.id, name: student.name, nisn: student.nisn, finalGrade: fg, predikat: predikat(fg) };
  });

  const grades = studentResults.map(r => r.finalGrade).filter((g): g is number => g !== null);
  const avg = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g, 0) / grades.length * 100) / 100 : null;
  const max = grades.length > 0 ? Math.max(...grades) : null;
  const min = grades.length > 0 ? Math.min(...grades) : null;

  return { kelas: { id: klass.id, name: klass.name, school: klass.school }, term, students: studentResults, rataRata: avg, nilaiTertinggi: max, nilaiTerendah: min, jumlahSiswa: students.length };
}

// ═══════════════════════════════════════════════════════════════
// LEGGER (JSON)
// ═══════════════════════════════════════════════════════════════

export async function getLeggerData(classId: string, term: string) {
  const klass = await db.class.findUnique({ where: { id: classId }, include: { school: { select: { id: true, name: true } } } });
  if (!klass) throw new Error('Kelas tidak ditemukan');

  const students = await db.user.findMany({
    where: { role: 'SISWA', classId, schoolId: klass.schoolId, isActive: true },
    select: { id: true, name: true, nisn: true },
    orderBy: { name: 'asc' },
  });

  const components = await db.gradeComponent.findMany({ where: { schoolId: klass.schoolId, term }, orderBy: { sortOrder: 'asc' } });
  const compIds = components.map(c => c.id);

  const allGrades = compIds.length > 0
    ? await db.studentGrade.findMany({ where: { studentId: { in: students.map(s => s.id) }, componentId: { in: compIds }, term } })
    : [];

  const rows = students.map(student => {
    const sGrades = allGrades.filter(g => g.studentId === student.id);
    const best: Record<string, number> = {};
    for (const g of sGrades) {
      if (!best[g.componentId] || g.score > best[g.componentId]) best[g.componentId] = g.score;
    }

    let wSum = 0, twf = 0;
    const compScores: Record<string, number | null> = {};
    for (const comp of components) {
      const s = best[comp.id];
      compScores[comp.id] = s !== undefined ? s : null;
      if (s !== undefined) { wSum += (s / 100) * comp.weight; twf += comp.weight; }
    }
    const fg = twf > 0 ? Math.round(wSum * 100 / twf * 100) / 100 : null;
    return { studentId: student.id, name: student.name, nisn: student.nisn, scores: compScores, finalGrade: fg, predikat: predikat(fg) };
  });

  // Rata-rata per komponen
  const compAvgs: Record<string, number> = {};
  for (const comp of components) {
    const vals = rows.map(r => r.scores[comp.id]).filter((v): v is number => v !== null);
    compAvgs[comp.id] = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 100) / 100 : 0;
  }

  const allFg = rows.map(r => r.finalGrade).filter((g): g is number => g !== null);
  const avgFinal = allFg.length > 0 ? Math.round(allFg.reduce((s, g) => s + g, 0) / allFg.length * 100) / 100 : null;

  return {
    kelas: { id: klass.id, name: klass.name, school: klass.school },
    term,
    components: components.map(c => ({ id: c.id, name: c.name, weight: c.weight })),
    rows,
    rataRataPerKomponen: compAvgs,
    rataRataFinal: avgFinal,
  };
}

// ═══════════════════════════════════════════════════════════════
// LEGGER PDF
// ═══════════════════════════════════════════════════════════════

export async function generateLeggerPDF(classId: string, term: string): Promise<Buffer> {
  const data = await getLeggerData(classId, term);

  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c as Buffer));

  let y = MARGIN;

  // Header
  doc.fontSize(10).font('Helvetica-Bold').text(`LEGGER NILAI - ${data.kelas.name}`, MARGIN, y, { width: COL_W, align: 'center' });
  y += 14;
  doc.fontSize(8).font('Helvetica').text(`${data.kelas.school.name} | Periode: ${term}`, MARGIN, y, { width: COL_W, align: 'center' });
  y += 16;

  // Table header
  const numComps = data.components.length;
 const fixedCols = [35, 120, 50]; // No, Nama, NISN
  const compColW = Math.min(45, (COL_W - fixedCols.reduce((s, v) => s + v, 0) - 50) / Math.max(numComps, 1));
  const totalW = fixedCols.reduce((s, v) => s + v, 0) + compColW * numComps + 50;
  const startX = MARGIN + Math.max(0, (COL_W - totalW) / 2);

  let cx = startX;
  doc.fontSize(6).font('Helvetica-Bold');
  doc.text('No', cx, y, { width: fixedCols[0] - 2 }); cx += fixedCols[0];
  doc.text('Nama', cx, y, { width: fixedCols[1] - 2 }); cx += fixedCols[1];
  doc.text('NISN', cx, y, { width: fixedCols[2] - 2 }); cx += fixedCols[2];
  for (const comp of data.components) {
    const label = comp.name.length > 6 ? comp.name.substring(0, 6) : comp.name;
    doc.text(label, cx, y, { width: compColW - 2, align: 'center' });
    cx += compColW;
  }
  doc.text('NA', cx, y, { width: 45, align: 'center' }); cx += 45;
  doc.text('P', cx, y, { width: 20, align: 'center' });
  y += 12;
  doc.moveTo(startX, y).lineTo(startX + totalW, y).stroke('#333');
  y += 2;

  // Rows
  doc.font('Helvetica').fontSize(6);
  for (const row of data.rows) {
    cx = startX;
    doc.text(String(data.rows.indexOf(row) + 1), cx, y, { width: fixedCols[0] - 2 }); cx += fixedCols[0];
    doc.text(row.name, cx, y, { width: fixedCols[1] - 2 }); cx += fixedCols[1];
    doc.text(row.nisn || '-', cx, y, { width: fixedCols[2] - 2 }); cx += fixedCols[2];
    for (const comp of data.components) {
      const s = row.scores[comp.id];
      doc.text(s !== null ? String(s) : '-', cx, y, { width: compColW - 2, align: 'center' });
      cx += compColW;
    }
    doc.text(row.finalGrade !== null ? String(row.finalGrade) : '-', cx, y, { width: 45, align: 'center' }); cx += 45;
    doc.text(row.predikat, cx, y, { width: 20, align: 'center' });
    y += 10;
    if (y > A4_H - 40) { doc.addPage(); y = MARGIN; }
  }

  // Average row
  doc.moveTo(startX, y).lineTo(startX + totalW, y).stroke('#333');
  y += 3;
  doc.font('Helvetica-Bold').fontSize(6);
  cx = startX;
  doc.text('', cx, y, { width: fixedCols[0] - 2 }); cx += fixedCols[0];
  doc.text('Rata-rata', cx, y, { width: fixedCols[1] - 2 }); cx += fixedCols[1];
  doc.text('', cx, y, { width: fixedCols[2] - 2 }); cx += fixedCols[2];
  for (const comp of data.components) {
    doc.text(String(data.rataRataPerKomponen[comp.id] || 0), cx, y, { width: compColW - 2, align: 'center' });
    cx += compColW;
  }
  doc.text(data.rataRataFinal !== null ? String(data.rataRataFinal) : '-', cx, y, { width: 45, align: 'center' });
  y += 10;

  doc.end();
  return Buffer.concat(chunks);
}

export { predikat, HABIT_LABELS, HABIT_RATING, DIM_LABELS, DIM_SHORT };
