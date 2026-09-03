import Link from 'next/link';

/**
 * Shared App Router 404 page for feature segments.
 */
export function AppRouteNotFound({
  title = 'Halaman Tidak Ditemukan',
  description = 'Halaman yang Anda cari tidak ada atau telah dipindahkan.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-6">
      <div className="text-center space-y-4 p-8">
        <div className="text-6xl font-bold text-slate-200">404</div>
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <p className="text-slate-500">{description}</p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-[#1F3864] text-white rounded-xl hover:bg-[#162d50] transition-colors font-medium"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

export default AppRouteNotFound;
