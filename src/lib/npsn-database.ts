export interface NpsnSchool {
  npsn: string;
  name: string;
  address: string;
  province: string;
  city: string;
  district: string;
  principalName: string;
  accreditation: string;
  schoolType: string;
  established: string;
  curriculum: string;
  phone: string;
  emailDomain: string;
}

const NPSN_DATABASE: NpsnSchool[] = [
  // ===== DKI JAKARTA =====
  {
    npsn: '30100001',
    name: 'SMA Negeri 1 Jakarta',
    address: 'Jl. Budi Utomo No. 7, Pasar Baru',
    province: 'DKI Jakarta',
    city: 'Kota Jakarta Pusat',
    district: 'Senen',
    principalName: 'Dr. Hj. Siti Nurjanah, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1952',
    curriculum: 'Kurikulum Merdeka',
    phone: '021-3457789',
    emailDomain: 'sman1jakarta.sch.id',
  },
  {
    npsn: '30100002',
    name: 'SMA Negeri 3 Jakarta',
    address: 'Jl. Belitung Raya No. 1, Kemayoran',
    province: 'DKI Jakarta',
    city: 'Kota Jakarta Pusat',
    district: 'Kemayoran',
    principalName: 'Drs. H. Bambang Supriyadi, M.M.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1954',
    curriculum: 'Kurikulum Merdeka',
    phone: '021-4224455',
    emailDomain: 'sman3jakarta.sch.id',
  },
  {
    npsn: '30100010',
    name: 'SMK Negeri 1 Jakarta',
    address: 'Jl. Otista Raya No. 78, Cawang',
    province: 'DKI Jakarta',
    city: 'Kota Jakarta Timur',
    district: 'Kramat Jati',
    principalName: 'Ir. Hj. Sri Wahyuni, M.T.',
    accreditation: 'A',
    schoolType: 'SMK',
    established: '1958',
    curriculum: 'Kurikulum Merdeka',
    phone: '021-8087788',
    emailDomain: 'smkn1jakarta.sch.id',
  },
  {
    npsn: '30100011',
    name: 'SMK Negeri 2 Jakarta',
    address: 'Jl. Pisangan Baru No. 2, Matraman',
    province: 'DKI Jakarta',
    city: 'Kota Jakarta Timur',
    district: 'Matraman',
    principalName: 'Drs. H. Ahmad Fauzi, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMK',
    established: '1960',
    curriculum: 'Kurikulum Merdeka',
    phone: '021-85904433',
    emailDomain: 'smkn2jakarta.sch.id',
  },
  {
    npsn: '30100020',
    name: 'SMA IT Al-Azhar 1 Jakarta',
    address: 'Jl. Sisingamangaraja No. 2, Kebayoran Baru',
    province: 'DKI Jakarta',
    city: 'Kota Jakarta Selatan',
    district: 'Kebayoran Baru',
    principalName: 'Drs. H. Mulyono, M.Ag.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1978',
    curriculum: 'Kurikulum Merdeka',
    phone: '021-7245723',
    emailDomain: 'smaitalazhar1jakarta.sch.id',
  },
  {
    npsn: '30100021',
    name: 'SMA Labschool Jakarta',
    address: 'Jl. Pemuda No. 1, Rawamangun',
    province: 'DKI Jakarta',
    city: 'Kota Jakarta Timur',
    district: 'Pulogadung',
    principalName: 'Prof. Dr. Hj. Asep Kurniawan, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1968',
    curriculum: 'Kurikulum Merdeka',
    phone: '021-47861103',
    emailDomain: 'labschooljakarta.sch.id',
  },
  {
    npsn: '30100030',
    name: 'SMA Cendekia Harapan Jakarta',
    address: 'Jl. Taman Cendekia No. 5, Cibubur',
    province: 'DKI Jakarta',
    city: 'Kota Jakarta Timur',
    district: 'Ciracas',
    principalName: 'Dr. Hj. Ratna Megawati, M.Pd.',
    accreditation: 'B',
    schoolType: 'SMA',
    established: '2005',
    curriculum: 'Kurikulum Merdeka',
    phone: '021-8754321',
    emailDomain: 'smacendekiaharapan.sch.id',
  },

  // ===== JAWA BARAT =====
  {
    npsn: '20200512',
    name: 'SMA Negeri 1 Bandung',
    address: 'Jl. Wastukencana No. 2, Bandung Wetan',
    province: 'Jawa Barat',
    city: 'Kota Bandung',
    district: 'Bandung Wetan',
    principalName: 'Dr. H. Dedi Supriatna, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1951',
    curriculum: 'Kurikulum Merdeka',
    phone: '022-4233132',
    emailDomain: 'sman1bandung.sch.id',
  },
  {
    npsn: '20203456',
    name: 'SMA Negeri 3 Bandung',
    address: 'Jl. Belitung No. 8, Sumur Bandung',
    province: 'Jawa Barat',
    city: 'Kota Bandung',
    district: 'Sumur Bandung',
    principalName: 'Drs. H. Cece Darmawan, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1953',
    curriculum: 'Kurikulum Merdeka',
    phone: '022-4233564',
    emailDomain: 'sman3bandung.sch.id',
  },
  {
    npsn: '20200005',
    name: 'SMK Negeri 2 Bandung',
    address: 'Jl. Cimandiri No. 6, Bandung Wetan',
    province: 'Jawa Barat',
    city: 'Kota Bandung',
    district: 'Bandung Wetan',
    principalName: 'Ir. Hj. Yani Suryani, M.T.',
    accreditation: 'A',
    schoolType: 'SMK',
    established: '1965',
    curriculum: 'Kurikulum Merdeka',
    phone: '022-4221625',
    emailDomain: 'smkn2bandung.sch.id',
  },
  {
    npsn: '20200010',
    name: 'SMA Taruna Nusantara Bandung',
    address: 'Jl. A.H. Nasution No. 14, Cibiru',
    province: 'Jawa Barat',
    city: 'Kota Bandung',
    district: 'Cibiru',
    principalName: 'Kolonel Inf. H. Rudi Hartono, S.IP.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1990',
    curriculum: 'Kurikulum Merdeka',
    phone: '022-7801324',
    emailDomain: 'smatarunanusantarabdg.sch.id',
  },

  // ===== JAWA TIMUR =====
  {
    npsn: '20300011',
    name: 'SMA Negeri 1 Surabaya',
    address: 'Jl. Kebonjati No. 1-3, Genteng',
    province: 'Jawa Timur',
    city: 'Kota Surabaya',
    district: 'Genteng',
    principalName: 'Dr. Hj. Tri Wahyuni, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1950',
    curriculum: 'Kurikulum Merdeka',
    phone: '031-5342952',
    emailDomain: 'sman1surabaya.sch.id',
  },
  {
    npsn: '20300012',
    name: 'SMA Negeri 5 Surabaya',
    address: 'Jl. Kayoon No. 16-18, Genteng',
    province: 'Jawa Timur',
    city: 'Kota Surabaya',
    district: 'Genteng',
    principalName: 'Drs. H. Bambang Sutrisno, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1952',
    curriculum: 'Kurikulum Merdeka',
    phone: '031-5627441',
    emailDomain: 'sman5surabaya.sch.id',
  },
  {
    npsn: '20300020',
    name: 'SMK Negeri 1 Surabaya',
    address: 'Jl. Smea No. 4, Wonokromo',
    province: 'Jawa Timur',
    city: 'Kota Surabaya',
    district: 'Wonokromo',
    principalName: 'Ir. Hj. Nurul Hidayah, M.T.',
    accreditation: 'A',
    schoolType: 'SMK',
    established: '1956',
    curriculum: 'Kurikulum Merdeka',
    phone: '031-7823445',
    emailDomain: 'smkn1surabaya.sch.id',
  },

  // ===== SUMATERA UTARA =====
  {
    npsn: '10400001',
    name: 'SMA Negeri 1 Medan',
    address: 'Jl. William Iskandar No. 1, Medan Baru',
    province: 'Sumatera Utara',
    city: 'Kota Medan',
    district: 'Medan Baru',
    principalName: 'Dr. H. Rizal Fahmi, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1950',
    curriculum: 'Kurikulum Merdeka',
    phone: '061-8451432',
    emailDomain: 'sman1medan.sch.id',
  },
  {
    npsn: '10400005',
    name: 'SMA Negeri 3 Medan',
    address: 'Jl. Abdul Hakim No. 7, Medan Petisah',
    province: 'Sumatera Utara',
    city: 'Kota Medan',
    district: 'Medan Petisah',
    principalName: 'Drs. H. Parlindungan Siregar, M.M.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1954',
    curriculum: 'Kurikulum Merdeka',
    phone: '061-4525443',
    emailDomain: 'sman3medan.sch.id',
  },

  // ===== SUMATERA SELATAN =====
  {
    npsn: '10500001',
    name: 'SMA Negeri 1 Palembang',
    address: 'Jl. Jenderal Sudirman No. 66, Ilir Barat I',
    province: 'Sumatera Selatan',
    city: 'Kota Palembang',
    district: 'Ilir Barat I',
    principalName: 'Dr. Hj. Nur Aini, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1951',
    curriculum: 'Kurikulum Merdeka',
    phone: '0711-355432',
    emailDomain: 'sman1palembang.sch.id',
  },

  // ===== SUMATERA BARAT =====
  {
    npsn: '10600001',
    name: 'SMA Negeri 1 Padang',
    address: 'Jl. Jati No. 1, Padang Utara',
    province: 'Sumatera Barat',
    city: 'Kota Padang',
    district: 'Padang Utara',
    principalName: 'Dr. H. Indra Dt. Rang Kayo, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1951',
    curriculum: 'Kurikulum Merdeka',
    phone: '0751-32544',
    emailDomain: 'sman1padang.sch.id',
  },

  // ===== JAWA TENGAH =====
  {
    npsn: '20100001',
    name: 'SMA Negeri 1 Semarang',
    address: 'Jl. Menteri Supeno No. 14, Semarang Tengah',
    province: 'Jawa Tengah',
    city: 'Kota Semarang',
    district: 'Semarang Tengah',
    principalName: 'Dr. H. Agus Wibowo, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1951',
    curriculum: 'Kurikulum Merdeka',
    phone: '024-3541637',
    emailDomain: 'sman1semarang.sch.id',
  },
  {
    npsn: '20100002',
    name: 'SMA Negeri 3 Semarang',
    address: 'Jl. Pemuda No. 149, Semarang Tengah',
    province: 'Jawa Tengah',
    city: 'Kota Semarang',
    district: 'Semarang Tengah',
    principalName: 'Drs. H. Suyatno, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1953',
    curriculum: 'Kurikulum Merdeka',
    phone: '024-3552348',
    emailDomain: 'sman3semarang.sch.id',
  },

  // ===== DI YOGYAKARTA =====
  {
    npsn: '20400001',
    name: 'SMA Negeri 1 Yogyakarta',
    address: 'Jl. Cik Di Tiro No. 1, Gondokusuman',
    province: 'DI Yogyakarta',
    city: 'Kota Yogyakarta',
    district: 'Gondokusuman',
    principalName: 'Dr. Hj. Suharti, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1950',
    curriculum: 'Kurikulum Merdeka',
    phone: '0274-513632',
    emailDomain: 'sman1yogyakarta.sch.id',
  },
  {
    npsn: '20400002',
    name: 'SMA Negeri 3 Yogyakarta',
    address: 'Jl. Yacub Siregar No. 1, Gondokusuman',
    province: 'DI Yogyakarta',
    city: 'Kota Yogyakarta',
    district: 'Gondokusuman',
    principalName: 'Drs. H. Prapto Hastri, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1953',
    curriculum: 'Kurikulum Merdeka',
    phone: '0274-563421',
    emailDomain: 'sman3yogyakarta.sch.id',
  },
  {
    npsn: '20400010',
    name: 'SMA Negeri 1 Bantul',
    address: 'Jl. Parangtritis No. 22, Bantul',
    province: 'DI Yogyakarta',
    city: 'Kabupaten Bantul',
    district: 'Bantul',
    principalName: 'Drs. H. Sumardjono, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1955',
    curriculum: 'Kurikulum Merdeka',
    phone: '0274-367156',
    emailDomain: 'sman1bantul.sch.id',
  },

  // ===== BALI =====
  {
    npsn: '50100001',
    name: 'SMA Negeri 1 Denpasar',
    address: 'Jl. Raya Pertanian No. 1, Denpasar Selatan',
    province: 'Bali',
    city: 'Kota Denpasar',
    district: 'Denpasar Selatan',
    principalName: 'Dr. I Wayan Suarta, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1952',
    curriculum: 'Kurikulum Merdeka',
    phone: '0361-243531',
    emailDomain: 'sman1denpasar.sch.id',
  },
  {
    npsn: '50100002',
    name: 'SMA Negeri 2 Denpasar',
    address: 'Jl. Puputan Niti Mandala Renon, Denpasar Selatan',
    province: 'Bali',
    city: 'Kota Denpasar',
    district: 'Denpasar Selatan',
    principalName: 'Drs. I Made Suastika, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1954',
    curriculum: 'Kurikulum Merdeka',
    phone: '0361-244781',
    emailDomain: 'sman2denpasar.sch.id',
  },

  // ===== SULAWESI SELATAN =====
  {
    npsn: '40100001',
    name: 'SMA Negeri 1 Makassar',
    address: 'Jl. Sultan Alauddin No. 3, Rappocini',
    province: 'Sulawesi Selatan',
    city: 'Kota Makassar',
    district: 'Rappocini',
    principalName: 'Dr. H. Muh. Arif, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1950',
    curriculum: 'Kurikulum Merdeka',
    phone: '0411-831453',
    emailDomain: 'sman1makassar.sch.id',
  },
  {
    npsn: '40100002',
    name: 'SMA Negeri 3 Makassar',
    address: 'Jl. Cendrawasih No. 12, Mariso',
    province: 'Sulawesi Selatan',
    city: 'Kota Makassar',
    district: 'Mariso',
    principalName: 'Drs. H. Abd. Rahman Djanggo, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1954',
    curriculum: 'Kurikulum Merdeka',
    phone: '0411-862341',
    emailDomain: 'sman3makassar.sch.id',
  },

  // ===== SULAWESI UTARA =====
  {
    npsn: '60100001',
    name: 'SMA Negeri 1 Manado',
    address: 'Jl. Brigjen Katamso No. 1, Tikala',
    province: 'Sulawesi Utara',
    city: 'Kota Manado',
    district: 'Tikala',
    principalName: 'Dr. Hj. Femmy Suluh, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1951',
    curriculum: 'Kurikulum Merdeka',
    phone: '0431-862543',
    emailDomain: 'sman1manado.sch.id',
  },

  // ===== KALIMANTAN BARAT =====
  {
    npsn: '70100001',
    name: 'SMA Negeri 1 Pontianak',
    address: 'Jl. Sultan Syahrir No. 15, Pontianak Kota',
    province: 'Kalimantan Barat',
    city: 'Kota Pontianak',
    district: 'Pontianak Kota',
    principalName: 'Dr. H. Muhammad Yusuf, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1952',
    curriculum: 'Kurikulum Merdeka',
    phone: '0561-736532',
    emailDomain: 'sman1pontianak.sch.id',
  },

  // ===== KALIMANTAN SELATAN =====
  {
    npsn: '70200001',
    name: 'SMA Negeri 1 Banjarmasin',
    address: 'Jl. Jenderal Ahmad Yani Km 3.5, Banjarmasin Tengah',
    province: 'Kalimantan Selatan',
    city: 'Kota Banjarmasin',
    district: 'Banjarmasin Tengah',
    principalName: 'Dr. Hj. Siti Rahmawati, M.Pd.',
    accreditation: 'A',
    schoolType: 'SMA',
    established: '1951',
    curriculum: 'Kurikulum Merdeka',
    phone: '0511-325741',
    emailDomain: 'sman1banjarmasin.sch.id',
  },
];

/**
 * Lookup schools by NPSN (exact match) or name (partial, case-insensitive)
 */
export function lookupSchool(query: string): (NpsnSchool & { source: string })[] {
  if (!query || !query.trim()) return [];
  const q = query.trim();

  // Exact NPSN match first
  const npsnMatch = NPSN_DATABASE.filter((s) => s.npsn === q);
  if (npsnMatch.length > 0) {
    return npsnMatch.map((s) => ({ ...s, source: 'dapodik' }));
  }

  // Partial name match (case-insensitive)
  const lower = q.toLowerCase();
  const nameMatches = NPSN_DATABASE.filter((s) =>
    s.name.toLowerCase().includes(lower) ||
    s.city.toLowerCase().includes(lower) ||
    s.province.toLowerCase().includes(lower)
  );

  return nameMatches.map((s) => ({ ...s, source: 'dapodik' }));
}

/**
 * Get a single school by NPSN
 */
export function getSchoolByNpsn(npsn: string): (NpsnSchool & { source: string }) | null {
  const school = NPSN_DATABASE.find((s) => s.npsn === npsn);
  if (!school) return null;
  return { ...school, source: 'dapodik' };
}
