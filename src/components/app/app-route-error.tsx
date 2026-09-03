'use client';

import { useEffect } from 'react';

/**
 * Shared client error boundary for App Router route segments.
 */
export function AppRouteError({
  error,
  reset,
  title = 'Terjadi Kesalahan',
  description = 'Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-6">
      <div className="text-center space-y-4 p-8">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <p className="text-slate-500 max-w-md">{description}</p>
        {error.digest ? (
          <p className="font-mono text-xs text-slate-400">Digest: {error.digest}</p>
        ) : null}
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-[#1F3864] text-white rounded-xl hover:bg-[#162d50] transition-colors font-medium"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

export default AppRouteError;
