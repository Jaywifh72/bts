'use client';

import { useEffect, useState } from 'react';
import { runMultipleJobsAction } from '@/lib/admin/bulk-run-action';

/**
 * Hosts the bulk-run form AND the sticky bottom bar. Putting both in
 * the same client component keeps Next 16 happy — an empty server-action
 * <form/> at the server-component level broke hydration on the whole
 * page in earlier attempts.
 *
 * The form#bulk-run-form is rendered always so checkboxes on each
 * JobCard (rendered server-side) can reference it via the `form`
 * attribute. The sticky bar only appears once at least one checkbox
 * is checked.
 */
export function BulkRunBar() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function selectedInGroup(group: string): HTMLInputElement[] {
      const section = document.querySelector<HTMLElement>(`section[data-group="${group}"]`);
      if (!section) return [];
      return Array.from(
        section.querySelectorAll<HTMLInputElement>('input[name="selected"][form="bulk-run-form"]'),
      );
    }

    function syncSelectAllStates() {
      document
        .querySelectorAll<HTMLInputElement>('input[data-select-all-group]')
        .forEach((master) => {
          const group = master.dataset.selectAllGroup!;
          const items = selectedInGroup(group);
          if (items.length === 0) return;
          const checkedCount = items.filter((i) => i.checked).length;
          master.checked = checkedCount === items.length;
          master.indeterminate = checkedCount > 0 && checkedCount < items.length;
        });
    }

    function recount() {
      const checked = document.querySelectorAll<HTMLInputElement>(
        'input[name="selected"][form="bulk-run-form"]:checked',
      );
      setCount(checked.length);
      syncSelectAllStates();
    }

    function onChange(e: Event) {
      const target = e.target as HTMLInputElement | null;
      if (target?.dataset.selectAllGroup) {
        // "Select all" toggled — flip every checkbox in that group to match.
        const group = target.dataset.selectAllGroup;
        selectedInGroup(group).forEach((cb) => {
          cb.checked = target.checked;
        });
      }
      recount();
    }

    recount();
    document.addEventListener('change', onChange);
    return () => document.removeEventListener('change', onChange);
  }, []);

  function clearAll() {
    document
      .querySelectorAll<HTMLInputElement>('input[name="selected"][form="bulk-run-form"]:checked')
      .forEach((el) => {
        el.checked = false;
      });
    document
      .querySelectorAll<HTMLInputElement>('input[data-select-all-group]')
      .forEach((el) => {
        el.checked = false;
        el.indeterminate = false;
      });
    setCount(0);
  }

  return (
    <>
      {/* The form lives in the client component so Next 16 can wire up
          its server-action client runtime without leaving an inert
          <form action={fn}/> at the server-component level (which
          previously broke whole-page hydration). */}
      <form id="bulk-run-form" action={runMultipleJobsAction} className="hidden">
        <input type="hidden" name="_bulk" value="1" />
      </form>

      {count > 0 && (
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
      )}
    </>
  );
}
