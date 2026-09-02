/**
 * Tipe data untuk entitas Dapodik.
 * Field bisa berbeda antar versi Dapodik.
 */

export interface DapodikSekolah {
  sekolah_id: string;
  npsn: string;
  nama: string;
  bentuk_pendidikan?: string;
  status_sekolah?: string;
  alamat_jalan?: string;
  kelurahan?: string;
  kecamatan?: string;
  kabupaten_kota?: string;
  propinsi?: string;
  kode_pos?: string;
  nomor_telepon?: string;
  email?: string;
  website?: string;
  lintang?: string;
  bujur?: string;
  kepala_sekolah_id?: string;
}

export interface DapodikPesertaDidik {
  peserta_didik_id: string;
  nama: string;
  nisn?: string;
  jenis_kelamin?: "L" | "P";
  tempat_lahir?: string;
  tanggal_lahir?: string;
  nik?: string;
  nama_ayah?: string;
  nama_ibu_kandung?: string;
  alamat_jalan?: string;
  nomor_telepon_rumah?: string;
  nomor_hp?: string;
  email?: string;
  rombongan_belajar_id?: string;
  tingkat_pendidikan_id?: string;
  status?: string;
}

export interface DapodikPtk {
  ptk_id: string;
  nama: string;
  nuptk?: string;
  nip?: string;
  jenis_kelamin?: "L" | "P";
  tempat_lahir?: string;
  tanggal_lahir?: string;
  nik?: string;
  jenis_ptk?: string;
  status_kepegawaian?: string;
  jabatan_ptk_id?: string;
  alamat_jalan?: string;
  nomor_hp?: string;
  email?: string;
}

export interface DapodikRombonganBelajar {
  rombongan_belajar_id: string;
  nama: string;
  tingkat_pendidikan_id?: string;
  jurusan_id?: string;
  kurikulum_id?: string;
  semester_id?: string;
  tahun_ajaran_id?: string;
  ptk_id?: string;
  ruang_id?: string;
  jumlah_peserta_didik?: number;
}

export interface DapodikAnggotaRombel {
  anggota_rombel_id: string;
  rombongan_belajar_id: string;
  peserta_didik_id: string;
  tahun_ajaran_id?: string;
  semester_id?: string;
}

export interface DapodikTahunAjaran {
  tahun_ajaran_id: string;
  nama: string;
  periode_aktif?: boolean;
}

export interface DapodikSemester {
  semester_id: string;
  nama: string;
  periode_aktif?: boolean;
}
