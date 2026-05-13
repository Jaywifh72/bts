'use client';

// React 19 renamed useFormState → useActionState and moved it from
// react-dom to react. Same API shape; drop-in replacement. The old
// import logs a runtime "ReactDOM.useFormState has been renamed"
// error and (in strict mode) can trip the component tree.
import { useActionState } from 'react';
import Link from 'next/link';
import {
  previewAction,
  confirmAction,
  type TmdbPreviewState,
} from '@/app/admin/(authenticated)/ingest/tmdb-actions';

const initialState: TmdbPreviewState = { status: 'idle' };

/**
 * Two-step TMDb quick-add: paste id → preview card → confirm insert.
 * Uses two form actions sharing one state slot so the preview JSON
 * round-trips through a hidden field on the second form.
 */
export function TmdbQuickAdd() {
  const [previewState, runPreview] = useActionState(previewAction, initialState);
  const [confirmState, runConfirm] = useActionState(confirmAction, initialState);

  // The confirm-state takes priority once it transitions away from
  // idle, so success / error feedback replaces the preview card.
  const state: TmdbPreviewState =
    confirmState.status === 'idle' ? previewState : confirmState;

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
      <form action={runPreview} className="flex flex-wrap items-end gap-3">
        <label className="block grow">
          <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
            TMDb movie id
          </span>
          <input
            name="tmdb_id"
            type="number"
            placeholder="e.g. 414906 (The Batman)"
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950/60 px-3 py-2 font-mono text-sm text-zinc-100 focus:border-amber-700 focus:outline-none"
            min={1}
          />
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 hover:border-amber-700 hover:text-amber-400"
        >
          Fetch preview
        </button>
      </form>

      {state.status === 'error' && (
        <p className="mt-3 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          {state.message}
        </p>
      )}

      {state.status === 'inserted' && (
        <div className="mt-3 rounded border border-emerald-900/40 bg-emerald-950/20 p-3">
          <p className="text-sm text-emerald-200">
            Production {state.outcome} as{' '}
            <code className="font-mono text-emerald-100">{state.slug}</code>.
          </p>
          <div className="mt-2 flex gap-3 text-xs">
            <Link
              href={`/films/${state.slug}`}
              className="text-amber-400 hover:underline"
            >
              View on site →
            </Link>
            <Link
              href={`/admin/ingest`}
              className="text-zinc-400 hover:text-amber-400"
            >
              Back to ingest
            </Link>
          </div>
        </div>
      )}

      {state.status === 'preview' && (
        <div className="mt-4 rounded border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="flex gap-4">
            {state.preview.poster_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://image.tmdb.org/t/p/w154${state.preview.poster_path}`}
                alt={state.preview.title}
                className="h-36 w-24 shrink-0 rounded border border-zinc-800 object-cover"
              />
            ) : (
              <div className="h-36 w-24 shrink-0 rounded border border-zinc-800 bg-zinc-900" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-serif text-lg text-zinc-50">
                  {state.preview.title}
                </h3>
                <span className="font-mono text-xs text-zinc-400">
                  {state.preview.release_year ?? '—'}
                </span>
                {state.preview.runtime && (
                  <span className="font-mono text-xs text-zinc-500">
                    {state.preview.runtime} min
                  </span>
                )}
              </div>
              {state.preview.original_title && (
                <p className="mt-0.5 text-xs italic text-zinc-500">
                  {state.preview.original_title}
                </p>
              )}
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-400">
                {state.preview.overview}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {state.preview.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300"
                  >
                    {g}
                  </span>
                ))}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                <div>
                  <dt className="inline uppercase tracking-wide">TMDb id:</dt>{' '}
                  <dd className="inline font-mono text-zinc-300">{state.preview.tmdb_id}</dd>
                </div>
                <div>
                  <dt className="inline uppercase tracking-wide">IMDb:</dt>{' '}
                  <dd className="inline font-mono text-zinc-300">
                    {state.preview.imdb_id ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="inline uppercase tracking-wide">Country:</dt>{' '}
                  <dd className="inline font-mono text-zinc-300">
                    {state.preview.production_country ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="inline uppercase tracking-wide">Lang:</dt>{' '}
                  <dd className="inline font-mono text-zinc-300">
                    {state.preview.original_language ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="inline uppercase tracking-wide">Rating:</dt>{' '}
                  <dd className="inline font-mono text-zinc-300">
                    {state.preview.vote_average?.toFixed(1) ?? '—'} ({state.preview.vote_count?.toLocaleString() ?? 0})
                  </dd>
                </div>
                <div>
                  <dt className="inline uppercase tracking-wide">Slug:</dt>{' '}
                  <dd className="inline font-mono text-amber-400">
                    {state.preview.proposed_slug}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {state.preview.existing_slug && (
            <p className="mt-3 rounded border border-amber-900/40 bg-amber-950/20 p-2 text-xs text-amber-200">
              <strong className="font-serif">Already in the database</strong> at{' '}
              <code className="font-mono">{state.preview.existing_slug}</code>.
              Confirming will refresh TMDb fields without touching curated data.
            </p>
          )}

          <form action={runConfirm} className="mt-4 flex items-center justify-end gap-2">
            <input
              type="hidden"
              name="preview_json"
              value={JSON.stringify(state.preview)}
            />
            <button
              type="submit"
              className="rounded bg-amber-600 px-4 py-2 text-sm font-bold uppercase tracking-wide text-zinc-950 hover:bg-amber-500"
            >
              {state.preview.existing_slug ? 'Refresh fields' : 'Insert production'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
