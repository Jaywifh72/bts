import type { Metadata } from 'next';
import Link from 'next/link';
import { createMediaAssetAction } from '../actions';

export const metadata: Metadata = {
  title: 'New media asset',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ error?: string }>;
}

const inputClass =
  'mt-1 w-full rounded border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 text-sm text-zinc-100 focus:border-amber-700 focus:outline-none';

export default async function NewMediaAssetPage(props: Props) {
  const searchParams = await props.searchParams;
  const error = searchParams.error;

  return (
    <div>
      <nav className="mb-6 text-xs uppercase tracking-wide text-zinc-500">
        <Link href="/admin/media" className="hover:text-amber-400">Media</Link>
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-zinc-300">New asset</span>
      </nav>

      <header className="mb-6">
        <h1 className="font-serif text-2xl text-zinc-50">New media asset</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Adds a row to <code className="font-mono text-amber-400">media_assets</code>.
          Associations to specific entities are added on the asset
          detail page after creation. URL is the natural key — if the
          same URL is already in the table the upsert refreshes it
          rather than erroring.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          <span className="font-mono text-xs">{error}</span>
        </div>
      )}

      <form action={createMediaAssetAction} className="max-w-2xl space-y-4">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
            Kind <span className="text-amber-500">*</span>
          </span>
          <select name="kind" required defaultValue="" className={`${inputClass} font-mono`}>
            <option value="" disabled>— choose —</option>
            <option value="video">video</option>
            <option value="image">image</option>
            <option value="link">link</option>
            <option value="document">document</option>
            <option value="audio">audio</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
            URL <span className="text-amber-500">*</span>
          </span>
          <input
            type="url" name="url" required
            placeholder="https://..."
            className={`${inputClass} font-mono`}
          />
          <span className="mt-1 block text-[10px] text-zinc-500">
            Natural key. The same URL is reused across all associations.
          </span>
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
            Title <span className="text-amber-500">*</span>
          </span>
          <input type="text" name="title" required className={inputClass} />
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-zinc-500">Caption</span>
          <textarea name="caption" rows={2} className={`${inputClass} resize-y`} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-zinc-500">Credit</span>
            <input type="text" name="credit" placeholder="Director name, channel, etc." className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-zinc-500">Publication</span>
            <input type="text" name="publication" placeholder="Variety / fxguide / Wikipedia" className={inputClass} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-zinc-500">Source</span>
            <input type="text" name="source" placeholder="youtube / vimeo / variety" className={`${inputClass} font-mono`} />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-zinc-500">External ID</span>
            <input type="text" name="external_id" placeholder="YouTube videoId etc." className={`${inputClass} font-mono`} />
          </label>
        </div>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-zinc-500">Thumbnail URL</span>
          <input type="url" name="thumbnail_url" className={`${inputClass} font-mono`} />
        </label>

        <div className="mt-8 flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs text-zinc-500">
            Saves to <code className="font-mono text-zinc-300">media_assets</code> · then jump to detail page to attach entities.
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/media"
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded bg-amber-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-950 hover:bg-amber-500"
            >
              Create
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
