'use client';

import { useEffect, useState } from 'react';

/**
 * Sticky bottom bar that shows how many jobs are currently selected
 * via the page's `input[name="selected"][form="bulk-run-form"]`
 * checkboxes, and provides the submit button for the bulk action.
 *
 * No props — purely DOM-observed. Lives at the page root so the bar
 * is fixed-positioned over scrolling content.
 */
export function BulkRunBar() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function recount() {
      const checked = document.querySelectorAll<HTMLInputElement>(
        'input[name="selected"][form="bulk-run-form"]:checked',
      );
      setCount(checked.length);
    }
    recount();
    // change events bubble; one listener on document catches them all.
    document.addEventListener('change', recount);
    return () => document.removeEventListener('change', recount);
  }, []);

  function clearAll() {
    document
      .querySelectorAll<HTMLInputElement>('input[name="selected"][form="bulk-run-form"]:checked')
      .forEach((el) => {
        el.checked = false;
      });
    setCount(0);
  }

  if (count === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-amber-900/60 bg-zinc-950/95 px-4 py-3 shadow-2xl backdrop-blur">
        <span className="text-sm text-zinc-200">
          <span className="font-mono text-amber-400">{count}</span>{' '}
          {count === 1 ? 'job' : 'jobs'} selected
        </span>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Clear
        </button>
        <button
          type="submit"
          form="bulk-run-form"
          className="rounded bg-amber-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-950 hover:bg-amber-500"
        >
          Run selected
        </button>
      </div>
    </div>
  );
}
