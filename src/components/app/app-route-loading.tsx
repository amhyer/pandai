/**
 * Shared App Router route states.
 *
 * Keeps route-level loading.tsx / error.tsx / not-found.tsx files tiny and
 * consistent, so each feature folder only owns its page.tsx + boundaries.
 */

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1F3864]">
          <svg
            className="h-6 w-6 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export function AppRouteLoading({ label = 'Memuat...' }: { label?: string }) {
  return <Spinner label={label} />;
}

export default AppRouteLoading;
