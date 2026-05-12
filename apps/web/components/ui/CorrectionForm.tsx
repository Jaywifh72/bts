'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { submitCorrectionAction, type CorrectionFormState } from '../../app/corrections/actions';

const initialState: CorrectionFormState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-amber-600 px-4 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
    >
      {pending ? 'Submitting…' : 'Submit'}
    </button>
  );
}

/**
 * T7-4 — collapsible correction form. Replaces the mailto: link from
 * T1-4. The form is hidden behind a "Suggest a correction →" button so
 * it doesn't add visual weight to every page; it expands inline on click.
 */
export function CorrectionForm({
  productionSlug,
  pageUrl,
}: {
  productionSlug?: string;
  pageUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(submitCorrectionAction, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-zinc-500 hover:text-amber-400"
        title="Report incorrect or missing info"
      >
        Suggest a correction →
      </button>
    );
  }

  if (state.ok) {
    return (
      <div className="rounded border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
        Thanks — your correction is in the queue.
        <button
          type="button"
          onClick={() => { setOpen(false); }}
          className="ml-2 text-emerald-400 underline hover:text-emerald-200"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-2 rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs"
    >
      {productionSlug && (
        <input type="hidden" name="productionSlug" value={productionSlug} />
      )}
      <input type="hidden" name="pageUrl" value={pageUrl} />
      <label className="block text-zinc-500">
        What needs fixing?
        <textarea
          name="message"
          required
          rows={4}
          maxLength={5000}
          placeholder="The DP credit on this film is wrong — Greig Fraser was the cinematographer, not Roger Deakins. Source: ASC magazine cover, March 2024."
          className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
        />
      </label>
      <label className="block text-zinc-500">
        Email <span className="text-zinc-700">(optional, only if you want a follow-up)</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
        />
      </label>
      {state.error && (
        <div className="rounded border border-red-900 bg-red-950/40 px-2 py-1 text-red-300">
          {state.error}
        </div>
      )}
      <div className="flex items-center gap-2">
        <SubmitButton />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
