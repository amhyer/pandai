import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Download — Tarik Data Dapodik | PANDAI',
  description: 'Download aplikasi Tarik Data Dapodik untuk menyinkronkan data dari Dapodik Lokal ke PANDAI.',
};

export default function DownloadDapodikPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1F3864] to-[#2d5289] px-6 py-8 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm text-3xl">
            📊
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Tarik Data Dapodik</h1>
          <p className="mt-2 text-white/80">
            Aplikasi untuk menyinkronkan data Dapodik Lokal ke website PANDAI
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Download Card */}
        <div className="rounded-2xl border bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-lg text-4xl">
            🖥️
          </div>
          <h2 className="text-xl font-bold text-gray-900">PANDAI — Tarik Data Dapodik</h2>
          <p className="mt-1 text-sm text-gray-500">Versi 1.0 • Windows x64</p>

          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              Standalone
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              Tidak perlu install
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              ~94 MB
            </span>
          </div>

          <a
            href="/pull-dapodik.exe"
            download
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1F3864] to-[#2d5289] px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Sekarang
          </a>
        </div>

        {/* Cara Pakai */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Cara Pakai</h3>
          <ol className="space-y-4">
            {[
              {
                step: 1,
                title: 'Persiapan Dapodik',
                desc: 'Buka aplikasi Dapodik Lokal → menu Pengaturan → Web Service → centang "Aktif" → tekan Simpan → catat Token.',
              },
              {
                step: 2,
                title: 'Login ke PANDAI',
                desc: 'Buka https://pandai-three.vercel.app → login sebagai Admin Sekolah.',
              },
              {
                step: 3,
                title: 'Catat Informasi',
                desc: 'Buka halaman Profil → copy User ID. School ID ada di URL dashboard (?schoolId=XXXXX).',
              },
              {
                step: 4,
                title: 'Jalankan EXE',
                desc: 'Buka Command Prompt → jalankan pull-dapodik.exe → masukkan NPSN, Token, School ID, dan Session Token.',
              },
              {
                step: 5,
                title: 'Selesai!',
                desc: 'Data otomatis masuk ke PANDAI. Buka website untuk melihat hasilnya.',
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-sm font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Yang Perlu Disiapkan */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🔑 Yang Perlu Disiapkan</h3>
          <div className="space-y-3">
            {[
              { label: 'NPSN', desc: '8 digit angka, dari Dapodik Lokal', color: 'bg-blue-50 text-blue-700' },
              { label: 'Token Web Service', desc: 'Dari Dapodik → Pengaturan → Web Service', color: 'bg-amber-50 text-amber-700' },
              { label: 'School ID', desc: 'Dari URL dashboard PANDAI (?schoolId=...)', color: 'bg-purple-50 text-purple-700' },
              { label: 'Session Token', desc: 'Login PANDAI → F12 → Console → document.cookie', color: 'bg-green-50 text-green-700' },
            ].map((item) => (
              <div key={item.label} className={`flex items-center gap-3 rounded-xl p-3 ${item.color}`}>
                <span className="font-mono text-sm font-bold">{item.label}</span>
                <span className="text-sm">— {item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-[#1F3864] hover:underline font-medium"
          >
            ← Kembali ke PANDAI
          </Link>
        </div>
      </div>
    </div>
  );
}
