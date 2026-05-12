'use client';

/**
 * Tiny client-only button that triggers `window.print()`. Extracted so
 * the parent page can stay a server component (the DB query needs SSR).
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="ml-auto rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
    >
      Print as PDF
    </button>
  );
}
