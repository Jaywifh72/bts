'use client';

import { useState, useTransition } from 'react';
import { mergeDuplicateAction } from '@/lib/admin/duplicate-merge-action';

/**
 * Per-pair "Keep ←" / "Keep →" buttons. Uses browser confirm() so
 * a missed click can't quietly delete a stunt company. Disabled
 * during the round-trip; revealing inline error if the merge fails
 * (typically a unique-constraint collision the dynamic walker
 * couldn't resolve).
 */
export function DuplicateMergeButtons({
  tableName,
  aSlug,
  aName,
  bSlug,
  bName,
}: {
  tableName: string;
  aSlug: string;
  aName: string;
  bSlug: string;
  bName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { ok: true; msg: string }
    | { ok: false; msg: string }
    | null
  >(null);

  function merge(keepSlug: string, keepName: string, deleteSlug: string, deleteName: string) {
    if (
      !window.confirm(
        `Merge: keep "${keepName}" (${keepSlug}); delete "${deleteName}" (${deleteSlug}).\n\n` +
          `Every FK pointing at the deleted row will be re-pointed at the kept one. ` +
          `Colliding association rows (e.g. both sides linked to the same production) will be dropped.\n\n` +
          `This cannot be undone. Continue?`,
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const r = await mergeDuplicateAction(tableName, keepSlug, deleteSlug);
      if (r.ok) {
        setResult({ ok: true, msg: `Merged — updated ${r.updatedTables.length} reference(s)` });
      } else {
        setResult({ ok: false, msg: r.error });
      }
    });
  }

  return (
    <div className="mt-2 flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={pending || (result?.ok === true)}
          onClick={() => merge(aSlug, aName, bSlug, bName)}
          className="rounded border border-amber-800/60 bg-amber-900/30 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-300 hover:bg-amber-900/60 disabled:opacity-40"
          title={`Keep "${aName}", merge "${bName}" into it`}
        >
          ← Keep left
        </button>
        <button
          type="button"
          disabled={pending || (result?.ok === true)}
          onClick={() => merge(bSlug, bName, aSlug, aName)}
          className="rounded border border-amber-800/60 bg-amber-900/30 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-300 hover:bg-amber-900/60 disabled:opacity-40"
          title={`Keep "${bName}", merge "${aName}" into it`}
        >
          Keep right →
        </button>
      </div>
      {pending && (
        <span className="text-[10px] text-zinc-500">Merging…</span>
      )}
      {result && (
        <span
          className={`max-w-[240px] text-right text-[10px] ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}
          role="alert"
        >
          {result.msg}
        </span>
      )}
    </div>
  );
}
