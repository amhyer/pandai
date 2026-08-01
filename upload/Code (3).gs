/**
 * ============================================================================
 *  SIMANTAP — Situs Mandiri Terintegrasi Aplikasi Pembelajaran
 *  Backend Google Apps Script
 *  BBGTK Provinsi Sulawesi Selatan — Tim Kerja 4 (Model dan Media)
 * ============================================================================
 *  CARA PASANG:
 *  1. Buat Google Sheet baru (kosong), beri nama misalnya "Database SIMANTAP".
 *  2. Menu Extensions > Apps Script. Hapus isi default, tempel SELURUH isi
 *     file ini ke Code.gs.
 *  3. Di toolbar Apps Script, pilih fungsi "initDatabase" lalu klik Run.
 *     (Google akan minta izin akses — setujui). Ini membuat seluruh sheet
 *     (tab) yang dibutuhkan beserta akun admin default.
 *  4. Klik Deploy > New deployment > pilih tipe "Web app".
 *     - Execute as: Me
 *     - Who has access: Anyone
 *     Klik Deploy, salin URL yang diberikan (diakhiri /exec).
 *  5. Tempel URL tersebut ke layar "Pengaturan Awal" pada file index.html
 *     di SETIAP komputer yang akan memakai aplikasi ini. Karena Google Sheet
 *     bersifat online (bukan file lokal), seluruh komputer akan membaca dan
 *     menulis ke SATU Google Sheet yang sama secara real-time.
 *  6. Login pertama kali: username "admin", password "admin123", lalu SEGERA
 *     ganti password melalui menu Pengaturan Akun.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// KONFIGURASI SKEMA
// ----------------------------------------------------------------------------

const SHEETS = {
  SETTINGS: 'Settings',
  USERS: 'Users',
  SESSIONS: 'Sessions',
  KELAS: 'Kelas',
  MAPEL: 'MataPelajaran',
  PENGAMPU: 'PengampuMapel',
  SISWA: 'Siswa',
  NILAI: 'Nilai',
  MATERI: 'Materi',
  KEHADIRAN: 'Kehadiran',
  KEBIASAAN: 'Kebiasaan7',
  KUIS: 'Kuis',
  SOAL: 'Soal',
  HASIL: 'HasilKuis',
  LOG: 'Log'
};

const SCHEMA = {
  Settings: ['key', 'value'],
  Users: ['id', 'username', 'password', 'role', 'nama', 'ref_id', 'aktif', 'dibuat_pada'],
  Sessions: ['token', 'user_id', 'username', 'role', 'ref_id', 'nama', 'dibuat_pada', 'kedaluwarsa'],
  Kelas: ['id', 'nama_kelas', 'wali_kelas_id'],
  MataPelajaran: ['id', 'nama_mapel', 'kode'],
  PengampuMapel: ['id', 'guru_id', 'mapel_id', 'kelas_id'],
  Siswa: ['id', 'nama', 'nisn', 'kelas_id', 'jk', 'tempat_tgl_lahir', 'nama_ortu', 'aktif'],
  Nilai: ['id', 'siswa_id', 'mapel_id', 'kelas_id', 'jenis', 'nilai', 'bobot', 'tanggal', 'catatan', 'guru_id', 'dibuat_pada'],
  Materi: ['id', 'judul', 'deskripsi', 'mapel_id', 'kelas_id', 'guru_id', 'tipe', 'url', 'tanggal', 'dibuat_pada'],
  Kehadiran: ['id', 'siswa_id', 'kelas_id', 'mapel_id', 'tanggal', 'status', 'keterangan', 'guru_id', 'dibuat_pada'],
  Kebiasaan7: ['id', 'siswa_id', 'tanggal', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'catatan', 'dilapor_oleh', 'dibuat_pada'],
  Kuis: ['id', 'judul', 'deskripsi', 'jenis', 'mapel_id', 'kelas_id', 'guru_id', 'waktu_menit', 'acak_soal', 'kkm', 'status', 'tanggal_mulai', 'tanggal_selesai', 'dibuat_pada'],
  Soal: ['id', 'kuis_id', 'urutan', 'tipe', 'pertanyaan', 'pilihan_json', 'kunci', 'bobot'],
  HasilKuis: ['id', 'kuis_id', 'siswa_id', 'jawaban_json', 'skor', 'jumlah_benar', 'jumlah_soal', 'mulai_pada', 'selesai_pada', 'status', 'catatan_guru'],
  Log: ['id', 'waktu', 'username', 'peran', 'aksi', 'detail']
};

const SALT_PASSWORD = 'SIMANTAP_BBGTK_SULSEL_2026';

// ----------------------------------------------------------------------------
// ENTRY POINT WEB APP
// ----------------------------------------------------------------------------

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleRequest({
      action: e.parameter.action,
      payload: e.parameter.payload ? JSON.parse(e.parameter.payload) : {},
      token: e.parameter.token || ''
    });
  }
  return ContentService
    .createTextOutput('SIMANTAP API aktif. Gunakan aplikasi index.html untuk mengakses layanan ini.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonOut({ ok: false, error: 'Format permintaan tidak valid.' });
  }
  return handleRequest(body);
}

function handleRequest(body) {
  const action = body.action;
  const payload = body.payload || {};
  const token = body.token || '';
  try {
    const fn = ACTIONS[action];
    if (!fn) throw new Error('Aksi tidak dikenal: ' + action);
    const result = fn(payload, token);
    return jsonOut({ ok: true, data: result });
  } catch (err) {
    return jsonOut({ ok: false, error: err.message || String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------------------------------
// HELPER SHEET GENERIK
// ----------------------------------------------------------------------------

function sheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function readSheet(name) {
  const sh = sheet(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const header = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every(function (c) { return c === '' || c === null; })) continue;
    const obj = {};
    header.forEach(function (h, idx) { obj[h] = row[idx]; });
    rows.push(obj);
  }
  return rows;
}

function getAll(name) { return readSheet(name); }

function writeAll(name, objects) {
  const sh = sheet(name);
  const header = SCHEMA[name];
  sh.clearContents();
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  sh.setFrozenRows(1);
  if (objects && objects.length) {
    const rows = objects.map(function (o) {
      return header.map(function (h) { return o[h] !== undefined ? o[h] : ''; });
    });
    sh.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
}

function nextId(name) {
  const rows = getAll(name);
  let max = 0;
  rows.forEach(function (r) {
    const n = parseInt(r.id, 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

function insert(name, obj) {
  const header = SCHEMA[name];
  if (header.indexOf('id') !== -1 && (obj.id === undefined || obj.id === '')) {
    obj.id = nextId(name);
  }
  const sh = sheet(name);
  const row = header.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sh.appendRow(row);
  return obj;
}

function findRowIndexById(name, id) {
  const sh = sheet(name);
  const values = sh.getDataRange().getValues();
  const header = values[0] || [];
  const idCol = header.indexOf('id');
  if (idCol === -1) return -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) return i + 1;
  }
  return -1;
}

function updateById(name, id, patch) {
  const sh = sheet(name);
  const header = SCHEMA[name];
  const rowIdx = findRowIndexById(name, id);
  if (rowIdx === -1) throw new Error('Data dengan id ' + id + ' tidak ditemukan di ' + name + '.');
  const rowValues = sh.getRange(rowIdx, 1, 1, header.length).getValues()[0];
  const current = {};
  header.forEach(function (h, i) { current[h] = rowValues[i]; });
  const merged = Object.assign({}, current, patch, { id: id });
  const newRow = header.map(function (h) { return merged[h] !== undefined ? merged[h] : ''; });
  sh.getRange(rowIdx, 1, 1, header.length).setValues([newRow]);
  return merged;
}

function deleteById(name, id) {
  const rowIdx = findRowIndexById(name, id);
  if (rowIdx === -1) throw new Error('Data tidak ditemukan.');
  sheet(name).deleteRow(rowIdx);
}

function crudActions(sheetName, writeRoles, readRoles) {
  return {
    list: function (payload, token) {
      requireAuth(token, readRoles);
      return getAll(sheetName);
    },
    save: function (payload, token) {
      requireAuth(token, writeRoles);
      if (payload.id) return updateById(sheetName, payload.id, payload);
      return insert(sheetName, payload);
    },
    remove: function (payload, token) {
      requireAuth(token, writeRoles);
      deleteById(sheetName, payload.id);
      return { deleted: true };
    }
  };
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// ----------------------------------------------------------------------------
// SETTINGS (key-value)
// ----------------------------------------------------------------------------

function getSettings() {
  const rows = readSheet(SHEETS.SETTINGS);
  const obj = {};
  rows.forEach(function (r) { obj[r.key] = r.value; });
  return obj;
}

function saveSettings(patch) {
  const sh = sheet(SHEETS.SETTINGS);
  const values = sh.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < values.length; i++) map[values[i][0]] = i + 1;
  Object.keys(patch).forEach(function (k) {
    if (k === 'id') return;
    if (map[k]) sh.getRange(map[k], 2).setValue(patch[k]);
    else sh.appendRow([k, patch[k]]);
  });
  return getSettings();
}

// ----------------------------------------------------------------------------
// AUTH & SESSION
// ----------------------------------------------------------------------------

function hashPassword(pw) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw + SALT_PASSWORD);
  return raw.map(function (b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0'); }).join('');
}

function cleanupSessions() {
  const sh = sheet(SHEETS.SESSIONS);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return;
  const now = new Date();
  for (let i = values.length - 1; i >= 1; i--) {
    const exp = new Date(values[i][7]);
    if (isNaN(exp.getTime()) || exp < now) sh.deleteRow(i + 1);
  }
}

function requireAuth(token, roles) {
  if (!token) throw new Error('Anda belum login. Silakan login kembali.');
  const sessions = getAll(SHEETS.SESSIONS);
  const s = sessions.find(function (x) { return x.token === token; });
  if (!s) throw new Error('Sesi tidak valid. Silakan login kembali.');
  if (new Date(s.kedaluwarsa) < new Date()) throw new Error('Sesi telah berakhir. Silakan login kembali.');
  if (roles && roles.length && roles.indexOf(s.role) === -1) {
    throw new Error('Anda tidak memiliki akses untuk aksi ini.');
  }
  return s;
}

function writeLog(username, role, aksi, detail) {
  insert(SHEETS.LOG, {
    waktu: new Date().toISOString(), username: username, peran: role,
    aksi: aksi, detail: detail || ''
  });
}

function actPing() { return { status: 'ok', waktu: new Date().toISOString() }; }

function actLogin(payload) {
  const username = payload && payload.username;
  const password = payload && payload.password;
  if (!username || !password) throw new Error('Username dan password wajib diisi.');
  cleanupSessions();
  const users = getAll(SHEETS.USERS);
  const u = users.find(function (x) { return x.username === username; });
  if (!u) throw new Error('Username tidak ditemukan.');
  if (String(u.aktif).toUpperCase() === 'FALSE') throw new Error('Akun tidak aktif. Hubungi admin sekolah.');
  if (hashPassword(password) !== u.password) throw new Error('Password salah.');
  const token = Utilities.getUuid();
  const now = new Date();
  const exp = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  insert(SHEETS.SESSIONS, {
    token: token, user_id: u.id, username: u.username, role: u.role,
    ref_id: u.ref_id, nama: u.nama, dibuat_pada: now.toISOString(), kedaluwarsa: exp.toISOString()
  });
  writeLog(u.username, u.role, 'login', '');
  return { token: token, role: u.role, nama: u.nama, ref_id: u.ref_id, username: u.username, user_id: u.id };
}

function actLogout(payload, token) {
  const sh = sheet(SHEETS.SESSIONS);
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === token) { sh.deleteRow(i + 1); break; }
  }
  return { ok: true };
}

function actChangePassword(payload, token) {
  const s = requireAuth(token, null);
  const users = getAll(SHEETS.USERS);
  const u = users.find(function (x) { return String(x.id) === String(s.user_id); });
  if (!u) throw new Error('Pengguna tidak ditemukan.');
  if (hashPassword(payload.password_lama) !== u.password) throw new Error('Password lama salah.');
  updateById(SHEETS.USERS, u.id, { password: hashPassword(payload.password_baru) });
  writeLog(s.username, s.role, 'ganti_password', '');
  return { ok: true };
}

// ----------------------------------------------------------------------------
// COMMON (dibaca oleh semua peran yang sudah login)
// ----------------------------------------------------------------------------

function actCommonGetSettings(payload, token) { requireAuth(token, null); return getSettings(); }
function actCommonGetKelas(payload, token) { requireAuth(token, null); return getAll(SHEETS.KELAS); }
function actCommonGetMapel(payload, token) { requireAuth(token, null); return getAll(SHEETS.MAPEL); }

// ----------------------------------------------------------------------------
// ADMIN
// ----------------------------------------------------------------------------

function actAdminGetSummary(payload, token) {
  requireAuth(token, ['admin']);
  return {
    jumlah_siswa: getAll(SHEETS.SISWA).length,
    jumlah_guru: getAll(SHEETS.USERS).filter(function (u) { return u.role === 'guru'; }).length,
    jumlah_ortu: getAll(SHEETS.USERS).filter(function (u) { return u.role === 'ortu'; }).length,
    jumlah_kelas: getAll(SHEETS.KELAS).length,
    jumlah_mapel: getAll(SHEETS.MAPEL).length,
    jumlah_kuis: getAll(SHEETS.KUIS).length,
    jumlah_nilai: getAll(SHEETS.NILAI).length
  };
}

function actAdminGetUsers(payload, token) {
  requireAuth(token, ['admin']);
  return getAll(SHEETS.USERS).map(function (u) {
    const copy = Object.assign({}, u); delete copy.password; return copy;
  });
}

function actAdminSaveUser(payload, token) {
  const s = requireAuth(token, ['admin']);
  if (!payload.username) throw new Error('Username wajib diisi.');
  if (!payload.role) throw new Error('Peran (role) wajib dipilih.');
  const users = getAll(SHEETS.USERS);
  if (payload.id) {
    const existing = users.find(function (u) { return String(u.id) === String(payload.id); });
    if (!existing) throw new Error('Pengguna tidak ditemukan.');
    const dup = users.find(function (u) { return u.username === payload.username && String(u.id) !== String(payload.id); });
    if (dup) throw new Error('Username sudah digunakan pengguna lain.');
    const patch = {
      username: payload.username, role: payload.role, nama: payload.nama,
      ref_id: payload.ref_id || '', aktif: payload.aktif !== undefined ? payload.aktif : true
    };
    if (payload.password) patch.password = hashPassword(payload.password);
    const updated = updateById(SHEETS.USERS, payload.id, patch);
    writeLog(s.username, s.role, 'admin_saveUser', 'update:' + payload.username);
    const copy = Object.assign({}, updated); delete copy.password; return copy;
  } else {
    const dup = users.find(function (u) { return u.username === payload.username; });
    if (dup) throw new Error('Username sudah digunakan.');
    if (!payload.password) throw new Error('Password wajib diisi untuk pengguna baru.');
    const created = insert(SHEETS.USERS, {
      username: payload.username, password: hashPassword(payload.password), role: payload.role,
      nama: payload.nama, ref_id: payload.ref_id || '',
      aktif: payload.aktif !== undefined ? payload.aktif : true, dibuat_pada: new Date().toISOString()
    });
    writeLog(s.username, s.role, 'admin_saveUser', 'create:' + payload.username);
    const copy = Object.assign({}, created); delete copy.password; return copy;
  }
}

function actAdminDeleteUser(payload, token) {
  const s = requireAuth(token, ['admin']);
  const users = getAll(SHEETS.USERS);
  const target = users.find(function (u) { return String(u.id) === String(payload.id); });
  if (target && target.username === 'admin') throw new Error('Akun admin utama tidak dapat dihapus.');
  deleteById(SHEETS.USERS, payload.id);
  writeLog(s.username, s.role, 'admin_deleteUser', 'id:' + payload.id);
  return { deleted: true };
}

function actAdminResetPassword(payload, token) {
  const s = requireAuth(token, ['admin']);
  const newPass = payload.password_baru || 'ganti123';
  updateById(SHEETS.USERS, payload.id, { password: hashPassword(newPass) });
  writeLog(s.username, s.role, 'admin_resetPassword', 'id:' + payload.id);
  return { ok: true, password_baru: newPass };
}

function actAdminGetPengampu(payload, token) {
  requireAuth(token, ['admin']);
  const list = getAll(SHEETS.PENGAMPU);
  const users = getAll(SHEETS.USERS);
  const kelas = getAll(SHEETS.KELAS);
  const mapel = getAll(SHEETS.MAPEL);
  return list.map(function (p) {
    return Object.assign({}, p, {
      nama_guru: (users.find(function (u) { return String(u.id) === String(p.guru_id); }) || {}).nama,
      nama_kelas: (kelas.find(function (k) { return String(k.id) === String(p.kelas_id); }) || {}).nama_kelas,
      nama_mapel: (mapel.find(function (m) { return String(m.id) === String(p.mapel_id); }) || {}).nama_mapel
    });
  });
}

function actAdminBackup(payload, token) {
  requireAuth(token, ['admin']);
  const dump = {};
  Object.keys(SCHEMA).forEach(function (name) {
    dump[name] = name === 'Settings' ? getSettings() : getAll(name);
  });
  dump._exported_at = new Date().toISOString();
  return dump;
}

function actAdminRestore(payload, token) {
  const s = requireAuth(token, ['admin']);
  const dump = payload.data;
  if (!dump) throw new Error('Data cadangan tidak valid.');
  Object.keys(SCHEMA).forEach(function (name) {
    if (name === 'Settings') { if (dump.Settings) saveSettings(dump.Settings); return; }
    if (Array.isArray(dump[name])) writeAll(name, dump[name]);
  });
  writeLog(s.username, s.role, 'admin_restore', '');
  return { ok: true };
}

function actAdminGetLog(payload, token) {
  requireAuth(token, ['admin']);
  return getAll(SHEETS.LOG).slice(-300).reverse();
}

// ----------------------------------------------------------------------------
// GURU
// ----------------------------------------------------------------------------

function actGuruGetKelasAmpu(payload, token) {
  const s = requireAuth(token, ['guru']);
  const list = getAll(SHEETS.PENGAMPU).filter(function (p) { return String(p.guru_id) === String(s.user_id); });
  const kelas = getAll(SHEETS.KELAS);
  const mapel = getAll(SHEETS.MAPEL);
  return list.map(function (p) {
    return {
      id: p.id, kelas_id: p.kelas_id, mapel_id: p.mapel_id,
      nama_kelas: (kelas.find(function (k) { return String(k.id) === String(p.kelas_id); }) || {}).nama_kelas,
      nama_mapel: (mapel.find(function (m) { return String(m.id) === String(p.mapel_id); }) || {}).nama_mapel
    };
  });
}

function actGuruGetSiswaByKelas(payload, token) {
  requireAuth(token, ['guru', 'admin']);
  return getAll(SHEETS.SISWA).filter(function (x) {
    return String(x.kelas_id) === String(payload.kelas_id) && String(x.aktif).toUpperCase() !== 'FALSE';
  });
}

function actGuruGetNilai(payload, token) {
  requireAuth(token, ['guru', 'admin']);
  return getAll(SHEETS.NILAI).filter(function (n) {
    return String(n.kelas_id) === String(payload.kelas_id) && String(n.mapel_id) === String(payload.mapel_id);
  });
}

function actGuruSaveNilai(payload, token) {
  const s = requireAuth(token, ['guru']);
  const items = Array.isArray(payload.items) ? payload.items : [payload];
  const out = items.map(function (it) {
    const data = {
      siswa_id: it.siswa_id, mapel_id: it.mapel_id, kelas_id: it.kelas_id,
      jenis: it.jenis, nilai: it.nilai, bobot: it.bobot || 1,
      tanggal: it.tanggal || new Date().toISOString().slice(0, 10),
      catatan: it.catatan || '', guru_id: s.user_id, dibuat_pada: new Date().toISOString()
    };
    if (it.id) return updateById(SHEETS.NILAI, it.id, data);
    return insert(SHEETS.NILAI, data);
  });
  writeLog(s.username, s.role, 'guru_saveNilai', 'jumlah:' + out.length);
  return out;
}

function actGuruDeleteNilai(payload, token) {
  requireAuth(token, ['guru']);
  deleteById(SHEETS.NILAI, payload.id);
  return { deleted: true };
}

function actGuruGetAnalisis(payload, token) {
  requireAuth(token, ['guru', 'admin']);
  const nilai = getAll(SHEETS.NILAI).filter(function (n) {
    return String(n.kelas_id) === String(payload.kelas_id) && String(n.mapel_id) === String(payload.mapel_id);
  });
  const siswaList = getAll(SHEETS.SISWA).filter(function (x) { return String(x.kelas_id) === String(payload.kelas_id); });
  const settings = getSettings();
  const kkm = Number(payload.kkm || settings.kkm_default || 75);
  const perSiswa = siswaList.map(function (sw) {
    const nl = nilai.filter(function (n) { return String(n.siswa_id) === String(sw.id); });
    const rata = nl.length ? nl.reduce(function (a, b) { return a + Number(b.nilai); }, 0) / nl.length : null;
    return { siswa_id: sw.id, nama: sw.nama, rata_rata: rata, jumlah_nilai: nl.length, tuntas: rata !== null ? rata >= kkm : null };
  });
  const semuaRata = perSiswa.filter(function (p) { return p.rata_rata !== null; }).map(function (p) { return p.rata_rata; });
  const rataKelas = semuaRata.length ? semuaRata.reduce(function (a, b) { return a + b; }, 0) / semuaRata.length : 0;
  const tuntas = perSiswa.filter(function (p) { return p.tuntas; }).length;
  const distribusi = { sangat_baik: 0, baik: 0, cukup: 0, kurang: 0 };
  semuaRata.forEach(function (v) {
    if (v >= 90) distribusi.sangat_baik++;
    else if (v >= kkm) distribusi.baik++;
    else if (v >= kkm - 15) distribusi.cukup++;
    else distribusi.kurang++;
  });
  const jenisSet = nilai.reduce(function (acc, n) { if (acc.indexOf(n.jenis) === -1) acc.push(n.jenis); return acc; }, []);
  const trenJenis = jenisSet.map(function (j) {
    const vals = nilai.filter(function (n) { return n.jenis === j; }).map(function (n) { return Number(n.nilai); });
    return { jenis: j, rata_rata: vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : 0, jumlah: vals.length };
  });
  return {
    rata_kelas: rataKelas, kkm: kkm, jumlah_siswa: siswaList.length, jumlah_tuntas: tuntas,
    distribusi: distribusi, per_siswa: perSiswa, tren_jenis: trenJenis
  };
}

function buildLaporanSiswa(siswaId) {
  const siswa = getAll(SHEETS.SISWA).find(function (x) { return String(x.id) === String(siswaId); });
  if (!siswa) throw new Error('Data siswa tidak ditemukan.');
  const kelas = getAll(SHEETS.KELAS).find(function (k) { return String(k.id) === String(siswa.kelas_id); });
  const mapelList = getAll(SHEETS.MAPEL);
  const nilai = getAll(SHEETS.NILAI).filter(function (n) { return String(n.siswa_id) === String(siswaId); });
  const perMapel = mapelList.map(function (m) {
    const nl = nilai.filter(function (n) { return String(n.mapel_id) === String(m.id); });
    const rata = nl.length ? nl.reduce(function (a, b) { return a + Number(b.nilai); }, 0) / nl.length : null;
    return { mapel_id: m.id, nama_mapel: m.nama_mapel, rata_rata: rata, rincian: nl };
  }).filter(function (m) { return m.rincian.length > 0; });
  const hasil = getAll(SHEETS.HASIL).filter(function (h) { return String(h.siswa_id) === String(siswaId); });
  const kuisList = getAll(SHEETS.KUIS);
  const riwayatKuis = hasil.map(function (h) {
    const k = kuisList.find(function (kk) { return String(kk.id) === String(h.kuis_id); }) || {};
    return { judul: k.judul, jenis: k.jenis || 'Kuis', mapel_id: k.mapel_id, skor: h.skor, status: h.status, selesai_pada: h.selesai_pada };
  });
  return { siswa: siswa, nama_kelas: kelas ? kelas.nama_kelas : '', per_mapel: perMapel, riwayat_kuis: riwayatKuis, kehadiran: rekapKehadiranSiswa(siswaId), kebiasaan: rekapKebiasaan(ambilCatatanKebiasaan(siswaId, '', '')), settings: getSettings() };
}

function actGuruGetLaporanSiswa(payload, token) { requireAuth(token, ['guru', 'admin']); return buildLaporanSiswa(payload.siswa_id); }

function actGuruGetKuisList(payload, token) {
  const s = requireAuth(token, ['guru']);
  return getAll(SHEETS.KUIS).filter(function (k) { return String(k.guru_id) === String(s.user_id); });
}

function actGuruGetKuisDetail(payload, token) {
  requireAuth(token, ['guru']);
  const kuis = getAll(SHEETS.KUIS).find(function (k) { return String(k.id) === String(payload.id); });
  if (!kuis) throw new Error('Kuis tidak ditemukan.');
  const soal = getAll(SHEETS.SOAL).filter(function (sq) { return String(sq.kuis_id) === String(payload.id); })
    .sort(function (a, b) { return a.urutan - b.urutan; })
    .map(function (sq) { return Object.assign({}, sq, { pilihan: JSON.parse(sq.pilihan_json || '[]') }); });
  return Object.assign({}, kuis, { soal: soal });
}

function actGuruSaveKuis(payload, token) {
  const s = requireAuth(token, ['guru']);
  const kuisData = {
    judul: payload.judul, deskripsi: payload.deskripsi || '', jenis: payload.jenis || 'Kuis',
    mapel_id: payload.mapel_id, kelas_id: payload.kelas_id,
    guru_id: s.user_id, waktu_menit: payload.waktu_menit || 30, acak_soal: !!payload.acak_soal,
    kkm: payload.kkm || '', status: payload.status || 'draft',
    tanggal_mulai: payload.tanggal_mulai || '', tanggal_selesai: payload.tanggal_selesai || '',
    dibuat_pada: new Date().toISOString()
  };
  let kuis;
  if (payload.id) {
    kuis = updateById(SHEETS.KUIS, payload.id, kuisData);
    getAll(SHEETS.SOAL).filter(function (sq) { return String(sq.kuis_id) === String(payload.id); })
      .forEach(function (sq) { deleteById(SHEETS.SOAL, sq.id); });
  } else {
    kuis = insert(SHEETS.KUIS, kuisData);
  }
  (payload.soal || []).forEach(function (q, idx) {
    insert(SHEETS.SOAL, {
      kuis_id: kuis.id, urutan: idx + 1, tipe: q.tipe, pertanyaan: q.pertanyaan,
      pilihan_json: JSON.stringify(q.pilihan || []), kunci: q.kunci, bobot: q.bobot || 1
    });
  });
  writeLog(s.username, s.role, 'guru_saveKuis', kuis.judul);
  return kuis;
}

function actGuruDeleteKuis(payload, token) {
  requireAuth(token, ['guru']);
  getAll(SHEETS.SOAL).filter(function (sq) { return String(sq.kuis_id) === String(payload.id); })
    .forEach(function (sq) { deleteById(SHEETS.SOAL, sq.id); });
  getAll(SHEETS.HASIL).filter(function (h) { return String(h.kuis_id) === String(payload.id); })
    .forEach(function (h) { deleteById(SHEETS.HASIL, h.id); });
  deleteById(SHEETS.KUIS, payload.id);
  return { deleted: true };
}

function actGuruUpdateKuisStatus(payload, token) {
  requireAuth(token, ['guru']);
  return updateById(SHEETS.KUIS, payload.id, { status: payload.status });
}

function actGuruGetHasilKuis(payload, token) {
  requireAuth(token, ['guru']);
  const hasil = getAll(SHEETS.HASIL).filter(function (h) { return String(h.kuis_id) === String(payload.kuis_id); });
  const siswa = getAll(SHEETS.SISWA);
  return hasil.map(function (h) {
    return Object.assign({}, h, { nama_siswa: (siswa.find(function (s2) { return String(s2.id) === String(h.siswa_id); }) || {}).nama });
  });
}

function actGuruNilaiEsai(payload, token) {
  const s = requireAuth(token, ['guru']);
  const hasil = getAll(SHEETS.HASIL).find(function (h) { return String(h.id) === String(payload.hasil_id); });
  if (!hasil) throw new Error('Hasil kuis tidak ditemukan.');
  const jawaban = JSON.parse(hasil.jawaban_json || '{}');
  const soal = getAll(SHEETS.SOAL).filter(function (sq) { return String(sq.kuis_id) === String(hasil.kuis_id); });
  const skorEsai = payload.skorEsai || {};
  let totalBobot = 0, totalSkor = 0, benar = 0;
  soal.forEach(function (sq) {
    totalBobot += Number(sq.bobot || 1);
    if (sq.tipe === 'esai') {
      const sk = Number(skorEsai[sq.id] || 0);
      totalSkor += sk;
      if (sk >= Number(sq.bobot || 1)) benar++;
    } else {
      const isBenar = String(jawaban[sq.id]) === String(sq.kunci);
      if (isBenar) { totalSkor += Number(sq.bobot || 1); benar++; }
    }
  });
  const skorAkhir = totalBobot ? Math.round((totalSkor / totalBobot) * 100) : 0;
  const updated = updateById(SHEETS.HASIL, payload.hasil_id, {
    skor: skorAkhir, jumlah_benar: benar, status: 'dinilai', catatan_guru: payload.catatan || ''
  });
  writeLog(s.username, s.role, 'guru_nilaiEsai', 'hasil:' + payload.hasil_id);
  return updated;
}

// ----------------------------------------------------------------------------
// MATERI PEMBELAJARAN
// ----------------------------------------------------------------------------

function actGuruGetMateri(payload, token) {
  const s = requireAuth(token, ['guru']);
  let list = getAll(SHEETS.MATERI).filter(function (m) { return String(m.guru_id) === String(s.user_id); });
  if (payload.kelas_id) list = list.filter(function (m) { return String(m.kelas_id) === String(payload.kelas_id); });
  if (payload.mapel_id) list = list.filter(function (m) { return String(m.mapel_id) === String(payload.mapel_id); });
  return list.sort(function (a, b) { return String(b.tanggal || '').localeCompare(String(a.tanggal || '')); });
}

function actGuruSaveMateri(payload, token) {
  const s = requireAuth(token, ['guru']);
  if (!payload.judul) throw new Error('Judul materi wajib diisi.');
  if (!payload.url) throw new Error('Tautan (link) materi wajib diisi.');
  const data = {
    judul: payload.judul, deskripsi: payload.deskripsi || '',
    mapel_id: payload.mapel_id, kelas_id: payload.kelas_id, guru_id: s.user_id,
    tipe: payload.tipe || 'link', url: payload.url,
    tanggal: payload.tanggal || new Date().toISOString().slice(0, 10),
    dibuat_pada: new Date().toISOString()
  };
  const saved = payload.id ? updateById(SHEETS.MATERI, payload.id, data) : insert(SHEETS.MATERI, data);
  writeLog(s.username, s.role, 'guru_saveMateri', saved.judul);
  return saved;
}

function actGuruDeleteMateri(payload, token) {
  const s = requireAuth(token, ['guru']);
  deleteById(SHEETS.MATERI, payload.id);
  writeLog(s.username, s.role, 'guru_deleteMateri', 'materi:' + payload.id);
  return { deleted: true };
}

function materiUntukKelas(kelasId) {
  const guru = getAll(SHEETS.USERS);
  return getAll(SHEETS.MATERI)
    .filter(function (m) { return String(m.kelas_id) === String(kelasId); })
    .map(function (m) {
      const g = guru.find(function (u) { return String(u.id) === String(m.guru_id); });
      return Object.assign({}, m, { nama_guru: g ? g.nama : '' });
    })
    .sort(function (a, b) { return String(b.tanggal || '').localeCompare(String(a.tanggal || '')); });
}

function actSiswaGetMateri(payload, token) {
  const s = requireAuth(token, ['siswa']);
  const siswa = getAll(SHEETS.SISWA).find(function (x) { return String(x.id) === String(s.ref_id); });
  if (!siswa) throw new Error('Data siswa tidak ditemukan.');
  return materiUntukKelas(siswa.kelas_id);
}

function actOrtuGetMateriAnak(payload, token) {
  const s = requireAuth(token, ['ortu']);
  const ids = String(s.ref_id || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  if (ids.indexOf(String(payload.siswa_id)) === -1) throw new Error('Anda tidak memiliki akses ke data siswa ini.');
  const siswa = getAll(SHEETS.SISWA).find(function (x) { return String(x.id) === String(payload.siswa_id); });
  if (!siswa) throw new Error('Data siswa tidak ditemukan.');
  return materiUntukKelas(siswa.kelas_id);
}

// ----------------------------------------------------------------------------
// KEHADIRAN SISWA
// ----------------------------------------------------------------------------

const STATUS_HADIR = ['Hadir', 'Sakit', 'Izin', 'Alpa'];

function actGuruGetKehadiran(payload, token) {
  requireAuth(token, ['guru']);
  return getAll(SHEETS.KEHADIRAN).filter(function (k) {
    return String(k.kelas_id) === String(payload.kelas_id) &&
           String(k.mapel_id) === String(payload.mapel_id) &&
           String(k.tanggal).slice(0, 10) === String(payload.tanggal).slice(0, 10);
  });
}

function actGuruSaveKehadiran(payload, token) {
  const s = requireAuth(token, ['guru']);
  const items = payload.items || [];
  if (!items.length) throw new Error('Tidak ada data kehadiran untuk disimpan.');
  const tanggal = String(payload.tanggal).slice(0, 10);
  if (!tanggal) throw new Error('Tanggal wajib diisi.');

  const semua = getAll(SHEETS.KEHADIRAN);
  // buang catatan lama pada kelas + mapel + tanggal yang sama, lalu tulis ulang
  const sisa = semua.filter(function (k) {
    return !(String(k.kelas_id) === String(payload.kelas_id) &&
             String(k.mapel_id) === String(payload.mapel_id) &&
             String(k.tanggal).slice(0, 10) === tanggal);
  });
  let id = 0;
  sisa.forEach(function (k) { if (Number(k.id) > id) id = Number(k.id); });
  const baru = items.map(function (it) {
    id++;
    return {
      id: id, siswa_id: it.siswa_id, kelas_id: payload.kelas_id, mapel_id: payload.mapel_id,
      tanggal: tanggal, status: STATUS_HADIR.indexOf(it.status) === -1 ? 'Hadir' : it.status,
      keterangan: it.keterangan || '', guru_id: s.user_id, dibuat_pada: new Date().toISOString()
    };
  });
  writeAll(SHEETS.KEHADIRAN, sisa.concat(baru));
  writeLog(s.username, s.role, 'guru_saveKehadiran', tanggal + ' (' + baru.length + ' siswa)');
  return { tersimpan: baru.length, tanggal: tanggal };
}

function hitungRekap(catatan) {
  const r = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
  catatan.forEach(function (k) { if (r[k.status] !== undefined) r[k.status]++; });
  const total = r.Hadir + r.Sakit + r.Izin + r.Alpa;
  return {
    hadir: r.Hadir, sakit: r.Sakit, izin: r.Izin, alpa: r.Alpa,
    total_pertemuan: total,
    persen_hadir: total ? Math.round(r.Hadir / total * 1000) / 10 : null
  };
}

function actGuruGetRekapKehadiran(payload, token) {
  requireAuth(token, ['guru']);
  const dari = payload.dari ? String(payload.dari).slice(0, 10) : '';
  const sampai = payload.sampai ? String(payload.sampai).slice(0, 10) : '';
  const catatan = getAll(SHEETS.KEHADIRAN).filter(function (k) {
    if (String(k.kelas_id) !== String(payload.kelas_id)) return false;
    if (String(k.mapel_id) !== String(payload.mapel_id)) return false;
    const t = String(k.tanggal).slice(0, 10);
    if (dari && t < dari) return false;
    if (sampai && t > sampai) return false;
    return true;
  });
  const siswa = getAll(SHEETS.SISWA).filter(function (x) {
    return String(x.kelas_id) === String(payload.kelas_id) && String(x.aktif).toUpperCase() !== 'FALSE';
  });
  const tanggalUnik = [];
  catatan.forEach(function (k) {
    const t = String(k.tanggal).slice(0, 10);
    if (tanggalUnik.indexOf(t) === -1) tanggalUnik.push(t);
  });
  tanggalUnik.sort();

  const perSiswa = siswa.map(function (sw) {
    const milik = catatan.filter(function (k) { return String(k.siswa_id) === String(sw.id); });
    return Object.assign({ siswa_id: sw.id, nama: sw.nama, nisn: sw.nisn }, hitungRekap(milik));
  });

  const perTanggal = tanggalUnik.map(function (t) {
    const hari = catatan.filter(function (k) { return String(k.tanggal).slice(0, 10) === t; });
    return Object.assign({ tanggal: t }, hitungRekap(hari));
  });

  return {
    per_siswa: perSiswa,
    per_tanggal: perTanggal,
    jumlah_pertemuan: tanggalUnik.length,
    ringkasan: hitungRekap(catatan)
  };
}

function rekapKehadiranSiswa(siswaId) {
  const catatan = getAll(SHEETS.KEHADIRAN).filter(function (k) { return String(k.siswa_id) === String(siswaId); });
  const mapel = getAll(SHEETS.MAPEL);
  const perMapel = [];
  catatan.forEach(function (k) {
    let baris = perMapel.find(function (m) { return String(m.mapel_id) === String(k.mapel_id); });
    if (!baris) {
      const mp = mapel.find(function (m) { return String(m.id) === String(k.mapel_id); });
      baris = { mapel_id: k.mapel_id, nama_mapel: mp ? mp.nama_mapel : '(tidak diketahui)', _catatan: [] };
      perMapel.push(baris);
    }
    baris._catatan.push(k);
  });
  perMapel.forEach(function (m) {
    Object.assign(m, hitungRekap(m._catatan));
    delete m._catatan;
  });
  return {
    ringkasan: hitungRekap(catatan),
    per_mapel: perMapel,
    rincian: catatan.slice().sort(function (a, b) { return String(b.tanggal).localeCompare(String(a.tanggal)); }).slice(0, 100)
  };
}

function actSiswaGetKehadiran(payload, token) {
  const s = requireAuth(token, ['siswa']);
  return rekapKehadiranSiswa(s.ref_id);
}

function actOrtuGetKehadiranAnak(payload, token) {
  const s = requireAuth(token, ['ortu']);
  const ids = String(s.ref_id || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  if (ids.indexOf(String(payload.siswa_id)) === -1) throw new Error('Anda tidak memiliki akses ke data siswa ini.');
  return rekapKehadiranSiswa(payload.siswa_id);
}


// ----------------------------------------------------------------------------
// 7 KEBIASAAN ANAK INDONESIA HEBAT (dilaporkan orang tua dari rumah)
// ----------------------------------------------------------------------------

const KEBIASAAN7 = [
  { kunci: 'k1', nama: 'Bangun Pagi' },
  { kunci: 'k2', nama: 'Beribadah' },
  { kunci: 'k3', nama: 'Berolahraga' },
  { kunci: 'k4', nama: 'Makan Sehat dan Bergizi' },
  { kunci: 'k5', nama: 'Gemar Belajar' },
  { kunci: 'k6', nama: 'Bermasyarakat' },
  { kunci: 'k7', nama: 'Tidur Cepat' }
];

function predikatKebiasaan(rata) {
  if (rata === null) return '';
  if (rata >= 3.5) return 'Membudaya';
  if (rata >= 2.5) return 'Berkembang';
  if (rata >= 1.5) return 'Mulai Terlihat';
  return 'Perlu Pembiasaan';
}

function pastikanAksesAnak(sesi, siswaId) {
  const ids = String(sesi.ref_id || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  if (ids.indexOf(String(siswaId)) === -1) throw new Error('Anda tidak memiliki akses ke data siswa ini.');
}

function actOrtuGetKebiasaan(payload, token) {
  const s = requireAuth(token, ['ortu']);
  pastikanAksesAnak(s, payload.siswa_id);
  const tgl = String(payload.tanggal).slice(0, 10);
  const rec = getAll(SHEETS.KEBIASAAN).find(function (r) {
    return String(r.siswa_id) === String(payload.siswa_id) && String(r.tanggal).slice(0, 10) === tgl;
  });
  return rec || null;
}

function actOrtuSaveKebiasaan(payload, token) {
  const s = requireAuth(token, ['ortu']);
  pastikanAksesAnak(s, payload.siswa_id);
  const tgl = String(payload.tanggal).slice(0, 10);
  if (!tgl) throw new Error('Tanggal wajib diisi.');
  const hariIni = new Date().toISOString().slice(0, 10);
  if (tgl > hariIni) throw new Error('Tidak dapat mengisi laporan untuk tanggal yang belum terjadi.');

  const data = { siswa_id: payload.siswa_id, tanggal: tgl, catatan: payload.catatan || '', dilapor_oleh: s.user_id, dibuat_pada: new Date().toISOString() };
  let terisi = 0;
  KEBIASAAN7.forEach(function (k) {
    let v = Number((payload.nilai || {})[k.kunci]);
    if (!v || v < 1 || v > 4) v = 0;
    if (v > 0) terisi++;
    data[k.kunci] = v;
  });
  if (!terisi) throw new Error('Isi minimal satu kebiasaan sebelum menyimpan.');

  const semua = getAll(SHEETS.KEBIASAAN);
  const lama = semua.find(function (r) {
    return String(r.siswa_id) === String(payload.siswa_id) && String(r.tanggal).slice(0, 10) === tgl;
  });
  const hasil = lama ? updateById(SHEETS.KEBIASAAN, lama.id, data) : insert(SHEETS.KEBIASAAN, data);
  writeLog(s.username, s.role, 'ortu_saveKebiasaan', 'siswa:' + payload.siswa_id + ' ' + tgl);
  return hasil;
}

function rekapKebiasaan(catatan) {
  const perKebiasaan = KEBIASAAN7.map(function (k) {
    const nilai = catatan.map(function (r) { return Number(r[k.kunci]) || 0; }).filter(function (v) { return v > 0; });
    const rata = nilai.length ? nilai.reduce(function (a, b) { return a + b; }, 0) / nilai.length : null;
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0 };
    nilai.forEach(function (v) { dist[v]++; });
    return {
      kunci: k.kunci, nama: k.nama,
      rata_rata: rata === null ? null : Math.round(rata * 100) / 100,
      persen: rata === null ? null : Math.round(rata / 4 * 1000) / 10,
      jumlah_laporan: nilai.length, distribusi: dist,
      predikat: predikatKebiasaan(rata)
    };
  });
  const semuaNilai = [];
  catatan.forEach(function (r) {
    KEBIASAAN7.forEach(function (k) { const v = Number(r[k.kunci]) || 0; if (v > 0) semuaNilai.push(v); });
  });
  const rataUmum = semuaNilai.length ? semuaNilai.reduce(function (a, b) { return a + b; }, 0) / semuaNilai.length : null;

  const perTanggal = catatan.slice().sort(function (a, b) { return String(a.tanggal).localeCompare(String(b.tanggal)); }).map(function (r) {
    const v = KEBIASAAN7.map(function (k) { return Number(r[k.kunci]) || 0; }).filter(function (x) { return x > 0; });
    return {
      tanggal: String(r.tanggal).slice(0, 10),
      rata_rata: v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length * 100) / 100 : null,
      jumlah_terisi: v.length, catatan: r.catatan || ''
    };
  });

  return {
    per_kebiasaan: perKebiasaan,
    per_tanggal: perTanggal,
    jumlah_hari_lapor: catatan.length,
    rata_umum: rataUmum === null ? null : Math.round(rataUmum * 100) / 100,
    persen_umum: rataUmum === null ? null : Math.round(rataUmum / 4 * 1000) / 10,
    predikat: predikatKebiasaan(rataUmum)
  };
}

function ambilCatatanKebiasaan(siswaId, dari, sampai) {
  const d = dari ? String(dari).slice(0, 10) : '';
  const sp = sampai ? String(sampai).slice(0, 10) : '';
  return getAll(SHEETS.KEBIASAAN).filter(function (r) {
    if (String(r.siswa_id) !== String(siswaId)) return false;
    const t = String(r.tanggal).slice(0, 10);
    if (d && t < d) return false;
    if (sp && t > sp) return false;
    return true;
  });
}

function actOrtuGetRekapKebiasaan(payload, token) {
  const s = requireAuth(token, ['ortu']);
  pastikanAksesAnak(s, payload.siswa_id);
  return rekapKebiasaan(ambilCatatanKebiasaan(payload.siswa_id, payload.dari, payload.sampai));
}

function actGuruGetKebiasaanSiswa(payload, token) {
  requireAuth(token, ['guru']);
  const siswa = getAll(SHEETS.SISWA).find(function (x) { return String(x.id) === String(payload.siswa_id); });
  if (!siswa) throw new Error('Data siswa tidak ditemukan.');
  const rekap = rekapKebiasaan(ambilCatatanKebiasaan(payload.siswa_id, payload.dari, payload.sampai));
  return Object.assign({ siswa: siswa }, rekap);
}

function actGuruGetKebiasaanKelas(payload, token) {
  requireAuth(token, ['guru']);
  const dari = payload.dari ? String(payload.dari).slice(0, 10) : '';
  const sampai = payload.sampai ? String(payload.sampai).slice(0, 10) : '';
  const siswa = getAll(SHEETS.SISWA).filter(function (x) {
    return String(x.kelas_id) === String(payload.kelas_id) && String(x.aktif).toUpperCase() !== 'FALSE';
  });
  const semua = getAll(SHEETS.KEBIASAAN).filter(function (r) {
    const t = String(r.tanggal).slice(0, 10);
    if (dari && t < dari) return false;
    if (sampai && t > sampai) return false;
    return true;
  });

  const perSiswa = siswa.map(function (sw) {
    const milik = semua.filter(function (r) { return String(r.siswa_id) === String(sw.id); });
    const rk = rekapKebiasaan(milik);
    return {
      siswa_id: sw.id, nama: sw.nama, nisn: sw.nisn,
      rata_umum: rk.rata_umum, persen_umum: rk.persen_umum, predikat: rk.predikat,
      jumlah_hari_lapor: rk.jumlah_hari_lapor,
      per_kebiasaan: rk.per_kebiasaan.map(function (k) { return { kunci: k.kunci, rata_rata: k.rata_rata }; })
    };
  });

  const catatanKelas = semua.filter(function (r) {
    return siswa.some(function (sw) { return String(sw.id) === String(r.siswa_id); });
  });
  const rekapKelas = rekapKebiasaan(catatanKelas);

  return {
    per_siswa: perSiswa,
    per_kebiasaan: rekapKelas.per_kebiasaan,
    rata_umum: rekapKelas.rata_umum,
    persen_umum: rekapKelas.persen_umum,
    predikat: rekapKelas.predikat,
    jumlah_laporan: catatanKelas.length,
    jumlah_siswa_lapor: perSiswa.filter(function (p) { return p.jumlah_hari_lapor > 0; }).length,
    daftar_kebiasaan: KEBIASAAN7
  };
}

function actCommonGetDaftarKebiasaan(payload, token) {
  requireAuth(token, ['admin', 'guru', 'siswa', 'ortu']);
  return KEBIASAAN7;
}

// ----------------------------------------------------------------------------
// SISWA
// ----------------------------------------------------------------------------

function actSiswaGetKuisAktif(payload, token) {
  const s = requireAuth(token, ['siswa']);
  const siswa = getAll(SHEETS.SISWA).find(function (x) { return String(x.id) === String(s.ref_id); });
  if (!siswa) throw new Error('Data siswa tidak ditemukan.');
  const kuis = getAll(SHEETS.KUIS).filter(function (k) {
    return String(k.kelas_id) === String(siswa.kelas_id) && k.status === 'aktif';
  });
  const hasilSaya = getAll(SHEETS.HASIL).filter(function (h) { return String(h.siswa_id) === String(siswa.id); });
  const hariIni = new Date().toISOString().slice(0, 10);
  return kuis.map(function (k) {
    const h = hasilSaya.find(function (hh) { return String(hh.kuis_id) === String(k.id); });
    const mulai = k.tanggal_mulai ? String(k.tanggal_mulai).slice(0, 10) : '';
    const selesai = k.tanggal_selesai ? String(k.tanggal_selesai).slice(0, 10) : '';
    let jadwal = 'tersedia';
    if (mulai && hariIni < mulai) jadwal = 'belum_dibuka';
    else if (selesai && hariIni > selesai) jadwal = 'sudah_ditutup';
    return Object.assign({}, k, {
      status_pengerjaan: h ? h.status : 'belum_mulai',
      hasil_id: h ? h.id : null, skor: h ? h.skor : null,
      jadwal: jadwal
    });
  });
}

function actSiswaGetSoalKuis(payload, token) {
  requireAuth(token, ['siswa']);
  const kuis = getAll(SHEETS.KUIS).find(function (k) { return String(k.id) === String(payload.kuis_id); });
  if (!kuis) throw new Error('Kuis tidak ditemukan.');
  let soal = getAll(SHEETS.SOAL).filter(function (sq) { return String(sq.kuis_id) === String(payload.kuis_id); })
    .sort(function (a, b) { return a.urutan - b.urutan; });
  if (String(kuis.acak_soal).toUpperCase() === 'TRUE') soal = shuffleArray(soal);
  return {
    kuis: kuis,
    soal: soal.map(function (sq) {
      return { id: sq.id, tipe: sq.tipe, pertanyaan: sq.pertanyaan, pilihan: JSON.parse(sq.pilihan_json || '[]') };
    })
  };
}

function actSiswaMulaiKuis(payload, token) {
  const s = requireAuth(token, ['siswa']);
  const existing = getAll(SHEETS.HASIL).find(function (h) {
    return String(h.kuis_id) === String(payload.kuis_id) && String(h.siswa_id) === String(s.ref_id);
  });
  if (existing) return existing;
  return insert(SHEETS.HASIL, {
    kuis_id: payload.kuis_id, siswa_id: s.ref_id, jawaban_json: '{}', skor: '', jumlah_benar: '',
    jumlah_soal: '', mulai_pada: new Date().toISOString(), selesai_pada: '', status: 'mengerjakan', catatan_guru: ''
  });
}

function actSiswaSubmitKuis(payload, token) {
  const s = requireAuth(token, ['siswa']);
  const hasil = getAll(SHEETS.HASIL).find(function (h) {
    return String(h.kuis_id) === String(payload.kuis_id) && String(h.siswa_id) === String(s.ref_id);
  });
  if (!hasil) throw new Error('Sesi kuis tidak ditemukan. Mulai kuis terlebih dahulu.');
  if (hasil.status !== 'mengerjakan') throw new Error('Kuis ini sudah pernah diselesaikan.');
  const soal = getAll(SHEETS.SOAL).filter(function (sq) { return String(sq.kuis_id) === String(payload.kuis_id); });
  const jawaban = payload.jawaban || {};
  let totalBobot = 0, totalSkorPG = 0, benar = 0, adaEsai = false;
  soal.forEach(function (sq) {
    totalBobot += Number(sq.bobot || 1);
    if (sq.tipe === 'esai') { adaEsai = true; }
    else {
      const isBenar = String(jawaban[sq.id]) === String(sq.kunci);
      if (isBenar) { totalSkorPG += Number(sq.bobot || 1); benar++; }
    }
  });
  const skorSementara = totalBobot ? Math.round((totalSkorPG / totalBobot) * 100) : 0;
  const updated = updateById(SHEETS.HASIL, hasil.id, {
    jawaban_json: JSON.stringify(jawaban), skor: skorSementara, jumlah_benar: benar, jumlah_soal: soal.length,
    selesai_pada: new Date().toISOString(), status: adaEsai ? 'menunggu_penilaian' : 'selesai'
  });
  writeLog(s.username, s.role, 'siswa_submitKuis', 'kuis:' + payload.kuis_id);
  return updated;
}

function actSiswaGetRiwayatKuis(payload, token) {
  const s = requireAuth(token, ['siswa']);
  const hasil = getAll(SHEETS.HASIL).filter(function (h) { return String(h.siswa_id) === String(s.ref_id); });
  const kuisList = getAll(SHEETS.KUIS);
  return hasil.map(function (h) {
    const k = kuisList.find(function (kk) { return String(kk.id) === String(h.kuis_id); }) || {};
    return Object.assign({}, h, { judul: k.judul, jenis: k.jenis || 'Kuis', mapel_id: k.mapel_id });
  });
}

function actSiswaGetNilai(payload, token) {
  const s = requireAuth(token, ['siswa']);
  return buildLaporanSiswa(s.ref_id);
}

// ----------------------------------------------------------------------------
// ORANG TUA
// ----------------------------------------------------------------------------

function actOrtuGetAnak(payload, token) {
  const s = requireAuth(token, ['ortu']);
  const ids = String(s.ref_id || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  const siswa = getAll(SHEETS.SISWA);
  return ids.map(function (id) { return siswa.find(function (x) { return String(x.id) === String(id); }); }).filter(Boolean);
}

function actOrtuGetLaporanAnak(payload, token) {
  const s = requireAuth(token, ['ortu']);
  const ids = String(s.ref_id || '').split(',').map(function (x) { return x.trim(); });
  if (ids.indexOf(String(payload.siswa_id)) === -1) throw new Error('Anda tidak memiliki akses ke data siswa ini.');
  return buildLaporanSiswa(payload.siswa_id);
}

function actOrtuGetRiwayatKuisAnak(payload, token) {
  const s = requireAuth(token, ['ortu']);
  const ids = String(s.ref_id || '').split(',').map(function (x) { return x.trim(); });
  if (ids.indexOf(String(payload.siswa_id)) === -1) throw new Error('Anda tidak memiliki akses ke data siswa ini.');
  const hasil = getAll(SHEETS.HASIL).filter(function (h) { return String(h.siswa_id) === String(payload.siswa_id); });
  const kuisList = getAll(SHEETS.KUIS);
  return hasil.map(function (h) {
    const k = kuisList.find(function (kk) { return String(kk.id) === String(h.kuis_id); }) || {};
    return Object.assign({}, h, { judul: k.judul, jenis: k.jenis || 'Kuis', mapel_id: k.mapel_id });
  });
}

// ----------------------------------------------------------------------------
// TABEL AKSI (ROUTER)
// ----------------------------------------------------------------------------

const kelasCrud = crudActions(SHEETS.KELAS, ['admin'], null);
const mapelCrud = crudActions(SHEETS.MAPEL, ['admin'], null);
const pengampuCrud = crudActions(SHEETS.PENGAMPU, ['admin'], ['admin']);
const siswaCrud = crudActions(SHEETS.SISWA, ['admin'], ['admin', 'guru']);

const ACTIONS = {
  ping: actPing,
  login: function (p) { return actLogin(p); },
  logout: actLogout,
  changePassword: actChangePassword,

  common_getSettings: actCommonGetSettings,
  common_getKelas: actCommonGetKelas,
  common_getMapel: actCommonGetMapel,

  admin_getSummary: actAdminGetSummary,
  admin_getUsers: actAdminGetUsers,
  admin_saveUser: actAdminSaveUser,
  admin_deleteUser: actAdminDeleteUser,
  admin_resetPassword: actAdminResetPassword,
  admin_getKelas: kelasCrud.list, admin_saveKelas: kelasCrud.save, admin_deleteKelas: kelasCrud.remove,
  admin_getMapel: mapelCrud.list, admin_saveMapel: mapelCrud.save, admin_deleteMapel: mapelCrud.remove,
  admin_getSiswa: siswaCrud.list, admin_saveSiswa: siswaCrud.save, admin_deleteSiswa: siswaCrud.remove,
  admin_getPengampu: actAdminGetPengampu, admin_savePengampu: pengampuCrud.save, admin_deletePengampu: pengampuCrud.remove,
  admin_getSettings: function (p, t) { requireAuth(t, ['admin']); return getSettings(); },
  admin_saveSettings: function (p, t) { requireAuth(t, ['admin']); return saveSettings(p); },
  admin_getLog: actAdminGetLog,
  admin_backup: actAdminBackup,
  admin_restore: actAdminRestore,

  guru_getKelasAmpu: actGuruGetKelasAmpu,
  guru_getSiswaByKelas: actGuruGetSiswaByKelas,
  guru_getNilai: actGuruGetNilai,
  guru_saveNilai: actGuruSaveNilai,
  guru_deleteNilai: actGuruDeleteNilai,
  guru_getAnalisis: actGuruGetAnalisis,
  guru_getLaporanSiswa: actGuruGetLaporanSiswa,
  guru_getKuisList: actGuruGetKuisList,
  guru_getKuisDetail: actGuruGetKuisDetail,
  guru_saveKuis: actGuruSaveKuis,
  guru_deleteKuis: actGuruDeleteKuis,
  guru_updateKuisStatus: actGuruUpdateKuisStatus,
  guru_getHasilKuis: actGuruGetHasilKuis,
  guru_nilaiEsai: actGuruNilaiEsai,
  guru_getMateri: actGuruGetMateri,
  guru_saveMateri: actGuruSaveMateri,
  guru_deleteMateri: actGuruDeleteMateri,
  guru_getKehadiran: actGuruGetKehadiran,
  guru_saveKehadiran: actGuruSaveKehadiran,
  guru_getRekapKehadiran: actGuruGetRekapKehadiran,
  guru_getKebiasaanKelas: actGuruGetKebiasaanKelas,
  guru_getKebiasaanSiswa: actGuruGetKebiasaanSiswa,

  siswa_getKuisAktif: actSiswaGetKuisAktif,
  siswa_getSoalKuis: actSiswaGetSoalKuis,
  siswa_mulaiKuis: actSiswaMulaiKuis,
  siswa_submitKuis: actSiswaSubmitKuis,
  siswa_getRiwayatKuis: actSiswaGetRiwayatKuis,
  siswa_getNilai: actSiswaGetNilai,
  siswa_getMateri: actSiswaGetMateri,
  siswa_getKehadiran: actSiswaGetKehadiran,

  ortu_getAnak: actOrtuGetAnak,
  ortu_getLaporanAnak: actOrtuGetLaporanAnak,
  ortu_getRiwayatKuisAnak: actOrtuGetRiwayatKuisAnak,
  ortu_getMateriAnak: actOrtuGetMateriAnak,
  ortu_getKehadiranAnak: actOrtuGetKehadiranAnak,
  ortu_getKebiasaan: actOrtuGetKebiasaan,
  ortu_saveKebiasaan: actOrtuSaveKebiasaan,
  ortu_getRekapKebiasaan: actOrtuGetRekapKebiasaan,
  common_getDaftarKebiasaan: actCommonGetDaftarKebiasaan
};

// ----------------------------------------------------------------------------
// SETUP / SEED DATA (jalankan manual sekali dari editor Apps Script)
// ----------------------------------------------------------------------------

function initDatabase() {
  const ditambahkan = [];
  Object.keys(SCHEMA).forEach(function (name) {
    const sh = sheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]);
      sh.setFrozenRows(1);
      ditambahkan.push('sheet ' + name);
      return;
    }
    // Migrasi: tambahkan kolom baru yang belum ada pada instalasi lama.
    const lastCol = sh.getLastColumn();
    const header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h); });
    const kurang = SCHEMA[name].filter(function (kol) { return header.indexOf(kol) === -1; });
    if (kurang.length) {
      sh.getRange(1, lastCol + 1, 1, kurang.length).setValues([kurang]);
      ditambahkan.push(name + ': ' + kurang.join(', '));
    }
  });

  const settings = getSettings();
  if (!settings.nama_sekolah) {
    saveSettings({
      nama_sekolah: 'Nama Sekolah Anda',
      tahun_ajaran: '2026/2027',
      semester: 'Ganjil',
      kkm_default: 75,
      nama_kepala_sekolah: ''
    });
  }

  const users = getAll(SHEETS.USERS);
  if (!users.length) {
    insert(SHEETS.USERS, {
      username: 'admin', password: hashPassword('admin123'), role: 'admin',
      nama: 'Administrator', ref_id: '', aktif: true, dibuat_pada: new Date().toISOString()
    });
  }

  return 'Database SIMANTAP siap.' + (ditambahkan.length ? ' Ditambahkan: ' + ditambahkan.join(' | ') : ' Tidak ada perubahan struktur.');
}
