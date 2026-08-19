import { jsPDF } from 'jspdf';
import { db } from './db';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

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
// HELPER: shared data fetcher
// ═══════════════════════════════════════════════════════════════

interface RaporData {
  student: {
    id: string;
    name: string;
    nisn: string | null;
    nip: string | null;
    schoolId: string;
    classId: string | null;
    parentId: string | null;
    jk: string | null;
  };
  school: {
    id: string;
    name: string;
    npsn: string | null;
    address: string | null;
    province: string | null;
    city: string | null;
    accreditation: string | null;
  } | null;
  klass: { id: string; name: string } | null;
  parent: { name: string } | null;
  kepsek: { name: string; nip: string | null } | null;
  components: { id: string; name: string; weight: number; sortOrder: number }[];
  grades: { studentId: string; componentId: string; score: number; maxScore: number; source: string }[];
  attendance: { hadir: number; izin: number; sakit: number; alpa: number };
  habits: Record<string, number>;
  dimAvg: Record<string, number>;
  compResults: { name: string; weight: number; score: number | null; weighted: number | null }[];
  finalGrade: number | null;
  totalWeightFilled: number;
}

async function fetchRaporData(studentId: string, term: string): Promise<RaporData> {
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, nisn: true, nip: true, schoolId: true, classId: true, parentId: true, jk: true },
  });
  if (!student) throw new Error('Siswa tidak ditemukan');

  const school = await db.school.findUnique({ where: { id: student.schoolId! } });
  const klass = student.classId ? await db.class.findUnique({ where: { id: student.classId } }) : null;
  const parent = student.parentId ? await db.user.findUnique({ where: { id: student.parentId }, select: { name: true } }) : null;
  const kepsek = await db.user.findFirst({
    where: { role: 'KEPALA_SEKOLAH', schoolId: student.schoolId!, isActive: true },
    select: { name: true, nip: true },
  });

  const components = await db.gradeComponent.findMany({
    where: { schoolId: student.schoolId!, term },
    orderBy: { sortOrder: 'asc' },
  });
  const grades = await db.studentGrade.findMany({ where: { studentId, term } });

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

  const finalGrade = totalWeightFilled > 0 ? Math.round((weightedSum * 100 / totalWeightFilled) * 100) / 100 : null;

  // Attendance
  const attRecs = await db.attendance.findMany({ where: { studentId, schoolId: student.schoolId! } });
  const attendance = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  for (const a of attRecs) {
    if (a.status in attendance) (attendance as Record<string, number>)[a.status]++;
  }

  // 7 Kebiasaan
  const charReports = await db.characterReport.findMany({
    where: { studentId, schoolId: student.schoolId! },
    select: { habit: true, rating: true },
  });
  const habits: Record<string, number> = {};
  for (const c of charReports) {
    if (!habits[c.habit] || c.rating > habits[c.habit]) habits[c.habit] = c.rating;
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

  return {
    student,
    school,
    klass,
    parent,
    kepsek,
    components: components.map(c => ({ id: c.id, name: c.name, weight: c.weight, sortOrder: c.sortOrder })),
    grades,
    attendance,
    habits,
    dimAvg,
    compResults,
    finalGrade,
    totalWeightFilled,
  };
}

// ═══════════════════════════════════════════════════════════════
// RAPOR SISWA PDF (A4)
// ═══════════════════════════════════════════════════════════════

export async function generateRaporSiswaPDF(studentId: string, term: string): Promise<Buffer> {
  const d = await fetchRaporData(studentId, term);

  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();
  const m = 20; // margin
  const cw = pw - m * 2; // content width
  let y = m;

  // ── KOP SURAT ──
  doc.setFontSize(14).setFont('helvetica', 'bold');
  doc.text(d.school?.name?.toUpperCase() || '', pw / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9).setFont('helvetica', 'normal');
  const kopLines: string[] = [];
  if (d.school?.npsn) kopLines.push('NPSN: ' + d.school.npsn);
  if (d.school?.address) kopLines.push(d.school.address);
  if (d.school?.accreditation) kopLines.push('Akreditasi: ' + d.school.accreditation);
  for (const line of kopLines) {
    doc.text(line, pw / 2, y, { align: 'center' });
    y += 5;
  }
  y += 2;
  doc.setLineWidth(0.5).line(m, y, pw - m, y).stroke();
  y += 1;
  doc.setLineWidth(0.3).line(m, y, pw - m, y).stroke();
  y += 6;

  // ── JUDUL ──
  doc.setFontSize(12).setFont('helvetica', 'bold');
  doc.text('LAPORAN HASIL BELAJAR SISWA', pw / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9).setFont('helvetica', 'normal');
  doc.text('Periode: ' + term, pw / 2, y, { align: 'center' });
  y += 8;

  // ── IDENTITAS SISWA ──
  doc.setFontSize(9);
  const lx = m;
  const rx = m + cw / 2 + 5;
  const labelW = 30;
  const valW = 50;

  doc.setFont('helvetica', 'bold').text('Nama Siswa', lx, y);
  doc.setFont('helvetica', 'normal').text(': ' + d.student.name, lx + labelW, y);
  doc.setFont('helvetica', 'bold').text('Kelas', rx, y);
  doc.setFont('helvetica', 'normal').text(': ' + (d.klass?.name || '-'), rx + labelW - 10, y);
  y += 6;
  doc.setFont('helvetica', 'bold').text('NIS/NISN', lx, y);
  doc.setFont('helvetica', 'normal').text(': ' + (d.student.nisn || d.student.nip || '-'), lx + labelW, y);
  doc.setFont('helvetica', 'bold').text('L/P', rx, y);
  doc.setFont('helvetica', 'normal').text(
    ': ' + (d.student.jk === 'L' ? 'Laki-laki' : d.student.jk === 'P' ? 'Perempuan' : '-'),
    rx + labelW - 10, y,
  );
  y += 6;
  doc.setFont('helvetica', 'bold').text('Orang Tua', lx, y);
  doc.setFont('helvetica', 'normal').text(': ' + (d.parent?.name || '-'), lx + labelW, y);
  y += 8;

  // ── TABEL NILAI PER KOMPONEN ──
  doc.setLineWidth(0.3).line(m, y, pw - m, y).stroke();
  y += 2;
  const cols = [12, 60, 22, 25, 25, 20]; // No, Komp, Bobot, Nilai, terbobot, Predikat
  const colLabels = ['No', 'Komponen', 'Bobot(%)', 'Nilai', 'Terbobot', 'Predikat'];
  let cx = m;
  const colX: number[] = [];
  for (let i = 0; i < cols.length; i++) {
    colX.push(cx);
    cx += cols[i];
  }

  doc.setFontSize(7).setFont('helvetica', 'bold');
  for (let i = 0; i < colLabels.length; i++) {
    doc.text(colLabels[i], colX[i] + 1, y, { width: cols[i] - 2 });
  }
  y += 5;
  doc.setLineWidth(0.2).line(m, y, pw - m, y).stroke();
  y += 2;

  doc.setFontSize(7).setFont('helvetica', 'normal');
  d.compResults.forEach((r, idx) => {
    doc.text(String(idx + 1), colX[0] + 1, y);
    doc.text(r.name, colX[1] + 1, y);
    doc.text(String(r.weight), colX[2] + 1, y, { align: 'center', width: cols[2] - 2 });
    doc.text(r.score !== null ? String(r.score) : '-', colX[3] + 1, y, { align: 'center', width: cols[3] - 2 });
    doc.text(r.weighted !== null ? String(r.weighted) : '-', colX[4] + 1, y, { align: 'center', width: cols[4] - 2 });
    doc.text(predikat(r.score), colX[5] + 1, y, { align: 'center', width: cols[5] - 2 });
    y += 5;
  });

  doc.setLineWidth(0.2).line(m, y, pw - m, y).stroke();
  y += 2;
  doc.setFontSize(7).setFont('helvetica', 'bold');
  doc.text('Nilai Akhir (Normalisasi)', m + 1, y);
  doc.text(d.finalGrade !== null ? String(d.finalGrade) : '-', colX[3] + 1, y, { align: 'center', width: cols[3] - 2 });
  doc.text(predikat(d.finalGrade), colX[5] + 1, y, { align: 'center', width: cols[5] - 2 });
  y += 5;

  if (d.totalWeightFilled > 0 && d.totalWeightFilled < 100) {
    doc.setFontSize(6).setFont('helvetica', 'normal');
    doc.text('* Dinormalisasi terhadap ' + d.totalWeightFilled + '% bobot terisi', m + 1, y);
    y += 4;
  }
  y += 4;

  // ── KEHADIRAN ──
  doc.setFontSize(9).setFont('helvetica', 'bold');
  doc.text('Rekap Kehadiran', m, y);
  y += 6;
  doc.setFontSize(8).setFont('helvetica', 'normal');
  doc.text('Hadir: ' + d.attendance.hadir + ' hari', m + 5, y);
  doc.text('Izin: ' + d.attendance.izin + ' hari', m + 70, y);
  doc.text('Sakit: ' + d.attendance.sakit + ' hari', m + 120, y);
  doc.text('Alpa: ' + d.attendance.alpa + ' hari', m + 170, y);
  y += 8;

  // ── 7 KEBIASAAN ──
  doc.setFontSize(9).setFont('helvetica', 'bold');
  doc.text('Capaian 7 Kebiasaan Anak Indonesia Hebat', m, y);
  y += 6;
  const habKeys = Object.keys(HABIT_LABELS);
  if (habKeys.some(h => d.habits[h])) {
    doc.setFontSize(7).setFont('helvetica', 'normal');
    let col = 0;
    let rowY = y;
    for (const h of habKeys) {
      const r = d.habits[h];
      const label = HABIT_LABELS[h] || h;
      const val = r ? HABIT_RATING[r] || String(r) : '-';
      const xPos = m + 5 + col * 85;
      doc.text(label + ': ' + val, xPos, rowY);
      rowY += 4.5;
      if (rowY > y + 18) {
        rowY = y;
        col++;
      }
    }
    y += 22;
  } else {
    doc.setFontSize(8).setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('Belum ada data kebiasaan', m + 5, y);
    doc.setTextColor(0);
    y += 6;
  }
  y += 2;

  // ── 8 DIMENSI PROFIL LULUSAN ──
  doc.setFontSize(9).setFont('helvetica', 'bold');
  doc.text('Profil Lulusan (8 Dimensi P5)', m, y);
  y += 6;
  const dimKeys = Object.keys(DIM_LABELS);
  if (dimKeys.some(dim => d.dimAvg[dim] !== undefined)) {
    doc.setFontSize(7).setFont('helvetica', 'normal');
    let col = 0;
    let rowY = y;
    for (const dim of dimKeys) {
      const avg = d.dimAvg[dim];
      const label = DIM_SHORT[dim] || dim;
      const val = avg !== undefined ? String(avg) : '-';
      const xPos = m + 5 + col * 85;
      doc.text(label + ': ' + val, xPos, rowY);
      rowY += 4.5;
      if (rowY > y + 18) {
        rowY = y;
        col++;
      }
    }
    y += 22;
  } else {
    doc.setFontSize(8).setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('Belum ada data profil lulusan', m + 5, y);
    doc.setTextColor(0);
    y += 6;
  }
  y += 4;

  // ── CATATAN GURU ──
  doc.setFontSize(9).setFont('helvetica', 'bold');
  doc.text('Catatan Guru:', m, y);
  y += 6;
  doc.setFontSize(8).setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text('(Belum diisi)', m + 5, y);
  doc.setTextColor(0);
  y += 8;

  // ── TANDA TANGAN ──
  const pageH = doc.internal.pageSize.getHeight();
  y = Math.max(y, pageH - 50);

  const sigW = cw / 3;
  doc.setFontSize(8).setFont('helvetica', 'normal');
  doc.text('Wali Kelas,', m, y, { width: sigW, align: 'center' });
  doc.text('Orang Tua,', m + sigW, y, { width: sigW, align: 'center' });
  doc.text('Kepala Sekolah,', m + sigW * 2, y, { width: sigW, align: 'center' });

  y += 22;
  doc.setFontSize(9).setFont('helvetica', 'bold');
  doc.text('(____________________)', m, y, { width: sigW, align: 'center' });
  doc.text('(____________________)', m + sigW, y, { width: sigW, align: 'center' });
  doc.text(d.kepsek?.name || '(____________________)', m + sigW * 2, y, { width: sigW, align: 'center' });
  if (d.kepsek?.nip) {
    doc.setFontSize(7).setFont('helvetica', 'normal');
    doc.text('NIP. ' + d.kepsek.nip, m + sigW * 2, y + 5, { width: sigW, align: 'center' });
  }

  return doc.output('arraybuffer') as unknown as Buffer;
}

// ═══════════════════════════════════════════════════════════════
// RAPOR SISWA (JSON)
// ═══════════════════════════════════════════════════════════════

export async function getRaporSiswaData(studentId: string, term: string) {
  const d = await fetchRaporData(studentId, term);
  return {
    school: {
      name: d.school?.name,
      npsn: d.school?.npsn,
      address: d.school?.address,
      province: d.school?.province,
      city: d.school?.city,
      accreditation: d.school?.accreditation,
    },
    student: {
      name: d.student.name,
      nisn: d.student.nisn,
      kelas: d.klass?.name,
      jk: d.student.jk,
      ortuName: d.parent?.name,
    },
    kepsek: { name: d.kepsek?.name, nip: d.kepsek?.nip },
    term,
    components: d.compResults,
    finalGrade: d.finalGrade,
    totalWeightFilled: d.totalWeightFilled,
    totalWeightAll: d.components.reduce((s, c) => s + c.weight, 0),
    predikat: predikat(d.finalGrade),
    attendance: d.attendance,
    habits: d.habits,
    profilLulusan: d.dimAvg,
  };
}

// ═══════════════════════════════════════════════════════════════
// REKAP KELAS (JSON)
// ═══════════════════════════════════════════════════════════════

export async function getRekapKelasData(classId: string, term: string) {
  const klass = await db.class.findUnique({
    where: { id: classId },
    include: { school: { select: { id: true, name: true } } },
  });
  if (!klass) throw new Error('Kelas tidak ditemukan');

  const students = await db.user.findMany({
    where: { role: 'SISWA', classId, schoolId: klass.schoolId, isActive: true },
    select: { id: true, name: true, nisn: true },
    orderBy: { name: 'asc' },
  });

  const components = await db.gradeComponent.findMany({
    where: { schoolId: klass.schoolId, term },
    orderBy: { sortOrder: 'asc' },
  });
  const compIds = components.map(c => c.id);

  const allGrades =
    compIds.length > 0
      ? await db.studentGrade.findMany({
          where: { studentId: { in: students.map(s => s.id) }, componentId: { in: compIds }, term },
        })
      : [];

  const studentResults = students.map(student => {
    const sGrades = allGrades.filter(g => g.studentId === student.id);
    const best: Record<string, { score: number; maxScore: number }> = {};
    for (const g of sGrades) {
      if (!best[g.componentId] || g.score > best[g.componentId].score)
        best[g.componentId] = { score: g.score, maxScore: g.maxScore };
    }

    let wSum = 0;
    let twf = 0;
    for (const comp of components) {
      const s = best[comp.id];
      if (s) {
        const norm = (s.score / Math.max(s.maxScore, 1)) * 100;
        wSum += (norm * comp.weight) / 100;
        twf += comp.weight;
      }
    }
    const fg = twf > 0 ? Math.round((wSum * 100 / twf) * 100) / 100 : null;
    return { studentId: student.id, name: student.name, nisn: student.nisn, finalGrade: fg, predikat: predikat(fg) };
  });

  const grades = studentResults.map(r => r.finalGrade).filter((g): g is number => g !== null);
  const avg = grades.length > 0 ? Math.round((grades.reduce((s, g) => s + g, 0) / grades.length) * 100) / 100 : null;
  const max = grades.length > 0 ? Math.max(...grades) : null;
  const min = grades.length > 0 ? Math.min(...grades) : null;

  return {
    kelas: { id: klass.id, name: klass.name, school: klass.school },
    term,
    students: studentResults,
    rataRata: avg,
    nilaiTertinggi: max,
    nilaiTerendah: min,
    jumlahSiswa: students.length,
  };
}

// ═══════════════════════════════════════════════════════════════
// LEGGER (JSON)
// ═══════════════════════════════════════════════════════════════

export async function getLeggerData(classId: string, term: string) {
  const klass = await db.class.findUnique({
    where: { id: classId },
    include: { school: { select: { id: true, name: true } } },
  });
  if (!klass) throw new Error('Kelas tidak ditemukan');

  const students = await db.user.findMany({
    where: { role: 'SISWA', classId, schoolId: klass.schoolId, isActive: true },
    select: { id: true, name: true, nisn: true },
    orderBy: { name: 'asc' },
  });

  const components = await db.gradeComponent.findMany({
    where: { schoolId: klass.schoolId, term },
    orderBy: { sortOrder: 'asc' },
  });
  const compIds = components.map(c => c.id);

  const allGrades =
    compIds.length > 0
      ? await db.studentGrade.findMany({
          where: { studentId: { in: students.map(s => s.id) }, componentId: { in: compIds }, term },
        })
      : [];

  const rows = students.map(student => {
    const sGrades = allGrades.filter(g => g.studentId === student.id);
    const best: Record<string, { score: number; maxScore: number }> = {};
    for (const g of sGrades) {
      if (!best[g.componentId] || g.score > best[g.componentId].score)
        best[g.componentId] = { score: g.score, maxScore: g.maxScore };
    }

    let wSum = 0;
    let twf = 0;
    const compScores: Record<string, number | null> = {};
    for (const comp of components) {
      const s = best[comp.id];
      compScores[comp.id] = s ? (s.score / Math.max(s.maxScore, 1)) * 100 : null;
      if (s) {
        const norm = (s.score / Math.max(s.maxScore, 1)) * 100;
        wSum += (norm * comp.weight) / 100;
        twf += comp.weight;
      }
    }
    const fg = twf > 0 ? Math.round((wSum * 100 / twf) * 100) / 100 : null;
    return {
      studentId: student.id,
      name: student.name,
      nisn: student.nisn,
      scores: compScores,
      finalGrade: fg,
      predikat: predikat(fg),
    };
  });

  // Rata-rata per komponen
  const compAvgs: Record<string, number> = {};
  for (const comp of components) {
    const vals = rows.map(r => r.scores[comp.id]).filter((v): v is number => v !== null);
    compAvgs[comp.id] = vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : 0;
  }

  const allFg = rows.map(r => r.finalGrade).filter((g): g is number => g !== null);
  const avgFinal = allFg.length > 0 ? Math.round((allFg.reduce((s, g) => s + g, 0) / allFg.length) * 100) / 100 : null;

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
// LEGGER PDF (A4, landscape)
// ═══════════════════════════════════════════════════════════════

export async function generateLeggerPDF(classId: string, term: string): Promise<Buffer> {
  const data = await getLeggerData(classId, term);

  const numComps = data.components.length;
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 10;
  const cw = pw - m * 2;

  let y = m;

  // Header
  doc.setFontSize(11).setFont('helvetica', 'bold');
  doc.text('LEGGER NILAI - ' + data.kelas.name, pw / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(8).setFont('helvetica', 'normal');
  doc.text(data.kelas.school.name + ' | Periode: ' + term, pw / 2, y, { align: 'center' });
  y += 8;

  // Table header
  const fixedCols = [8, 45, 22]; // No, Nama, NISN
  const compColW = Math.min(20, (cw - fixedCols.reduce((s, v) => s + v, 0) - 20) / Math.max(numComps, 1));
  const naColW = 18;
  const pColW = 10;
  const totalW = fixedCols.reduce((s, v) => s + v, 0) + compColW * numComps + naColW + pColW;
  const startX = m + Math.max(0, (cw - totalW) / 2);

  let cx = startX;
  doc.setFontSize(6).setFont('helvetica', 'bold');
  const headerLabels = [
    'No',
    'Nama',
    'NISN',
    ...data.components.map(c => (c.name.length > 6 ? c.name.substring(0, 6) : c.name)),
    'NA',
    'P',
  ];
  const colWidths = [...fixedCols, ...Array(numComps).fill(compColW), naColW, pColW];
  for (let i = 0; i < headerLabels.length; i++) {
    const align = i >= 3 && i < headerLabels.length - 2 ? 'center' : 'left';
    doc.text(headerLabels[i], cx + 1, y, { width: colWidths[i] - 2, align });
    cx += colWidths[i];
  }
  y += 4;
  doc.setLineWidth(0.3).line(startX, y, startX + totalW, y).stroke();
  y += 2;

  // Rows
  doc.setFontSize(6).setFont('helvetica', 'normal');
  for (let ri = 0; ri < data.rows.length; ri++) {
    const row = data.rows[ri];
    cx = startX;
    doc.text(String(ri + 1), cx + 1, y);
    cx += fixedCols[0];
    doc.text(row.name, cx + 1, y);
    cx += fixedCols[1];
    doc.text(row.nisn || '-', cx + 1, y);
    cx += fixedCols[2];
    for (let ci = 0; ci < numComps; ci++) {
      const s = row.scores[data.components[ci].id];
      doc.text(s !== null ? String(Math.round(s)) : '-', cx + 1, y, { width: compColW - 2, align: 'center' });
      cx += compColW;
    }
    doc.text(row.finalGrade !== null ? String(row.finalGrade) : '-', cx + 1, y, { width: naColW - 2, align: 'center' });
    cx += naColW;
    doc.text(row.predikat, cx + 1, y, { width: pColW - 2, align: 'center' });
    y += 5;
    if (y > ph - 25) {
      doc.addPage();
      y = m;
    }
  }

  // Average row
  doc.setLineWidth(0.3).line(startX, y, startX + totalW, y).stroke();
  y += 2;
  doc.setFontSize(6).setFont('helvetica', 'bold');
  cx = startX;
  doc.text('', cx + 1, y);
  cx += fixedCols[0];
  doc.text('Rata-rata', cx + 1, y);
  cx += fixedCols[1];
  doc.text('', cx + 1, y);
  cx += fixedCols[2];
  for (let ci = 0; ci < numComps; ci++) {
    doc.text(String(data.rataRataPerKomponen[data.components[ci].id] || 0), cx + 1, y, { width: compColW - 2, align: 'center' });
    cx += compColW;
  }
  doc.text(data.rataRataFinal !== null ? String(data.rataRataFinal) : '-', cx + 1, y, { width: naColW - 2, align: 'center' });

  return doc.output('arraybuffer') as unknown as Buffer;
}

export { predikat, HABIT_LABELS, HABIT_RATING, DIM_LABELS, DIM_SHORT };
