'use client';

/**
 * Tiny client wedge — `window.print()` can't be called from a server
 * component. Used by the loadout page to trigger the browser's
 * print-to-PDF dialog.
 */
export function PrintButtonClient() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-zinc-950 hover:bg-amber-500"
    >
      Print / Save PDF
    </button>
  );
}
