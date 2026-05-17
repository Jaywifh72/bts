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
    // eslint-disable-next-line no-console
    console.log('[BulkRunBar] mounted, wiring change listener');
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
      // eslint-disable-next-line no-console
      console.log('[BulkRunBar] change event:', { name: target?.name, group: target?.dataset?.selectAllGroup, checked: target?.checked });
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
