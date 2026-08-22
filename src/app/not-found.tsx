import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4 p-8">
        <div className="text-6xl font-bold text-slate-200">404</div>
        <h2 className="text-2xl font-bold text-slate-800">Halaman Tidak Ditemukan</h2>
        <p className="text-slate-500">Halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
        <Link href="/" className="inline-block px-6 py-2.5 bg-[#1F3864] text-white rounded-xl hover:bg-[#162d50] transition-colors font-medium">Kembali ke Beranda</Link>
      </div>
    </div>
  );
}
