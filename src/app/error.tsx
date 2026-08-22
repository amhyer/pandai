'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4 p-8">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-2xl font-bold text-slate-800">Terjadi Kesalahan</h2>
        <p className="text-slate-500 max-w-md">Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.</p>
        <button onClick={reset} className="px-6 py-2.5 bg-[#1F3864] text-white rounded-xl hover:bg-[#162d50] transition-colors font-medium">Coba Lagi</button>
      </div>
    </div>
  );
}
