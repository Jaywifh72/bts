'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTransition } from 'react';
import { addKeyFrameAction, deleteKeyFrameAction } from '../../app/admin/(authenticated)/keyframes/actions';

type Production = { slug: string; title: string };

type FrameRow = {
  id: number;
  image_url: string;
  caption: string | null;
  scene_slug: string | null;
  scene_title: string | null;
  sort_order: number;
  production_id: number;
  production_slug: string;
  production_title: string;
};

export function KeyFrameAdmin({
  productions,
  frames,
  selectedSlug,
}: {
  productions: Production[];
  frames: FrameRow[];
  selectedSlug: string | null;
}) {
  const [pending, startTransition] = useTransition();

  function onDelete(id: number, productionSlug: string) {
    if (!confirm('Delete this key frame?')) return;
    startTransition(async () => {
      await deleteKeyFrameAction(id, productionSlug);
    });
  }

  // Group rows under their production heading.
  const byProduction = new Map<string, FrameRow[]>();
  for (const f of frames) {
    if (!byProduction.has(f.production_slug)) byProduction.set(f.production_slug, []);
    byProduction.get(f.production_slug)!.push(f);
  }

  return (
    <div className="space-y-8">
      {/* Filter */}
      <form className="flex flex-wrap items-end gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3">
        <label className="text-xs text-zinc-500">
          Filter by production
          <br />
          <select
            name="productionSlug"
            defaultValue={selectedSlug ?? ''}
            className="mt-1 w-72 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
          >
            <option value="">All curated productions</option>
            {productions.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-800"
        >
          Apply
        </button>
      </form>

      {/* Add form */}
      <form action={addKeyFrameAction} className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="mb-3 font-serif text-lg">Add key frame</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-zinc-500">
            Production
            <select
              name="productionSlug"
              required
              defaultValue={selectedSlug ?? ''}
              className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
            >
              <option value="">— select —</option>
              {productions.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-500">
            Sort order
            <input
              type="number"
              name="sortOrder"
              defaultValue={0}
              className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
            />
          </label>
          <label className="sm:col-span-2 text-xs text-zinc-500">
            Image URL (must be https://)
            <input
              type="url"
              name="imageUrl"
              required
              placeholder="https://image.tmdb.org/t/p/w1280/abc.jpg"
              className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-sm"
            />
          </label>
          <label className="sm:col-span-2 text-xs text-zinc-500">
            Caption (optional)
            <input
              type="text"
              name="caption"
              placeholder="The greenhouse approach, dusk"
              className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-3 rounded bg-amber-600 px-4 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500"
        >
          Add
        </button>
      </form>

      {/* Existing frames, grouped by production */}
      {byProduction.size === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No key frames yet{selectedSlug ? ' for this production' : ''}.
        </div>
      ) : (
        Array.from(byProduction.entries()).map(([prodSlug, rows]) => (
          <section key={prodSlug}>
            <h2 className="mb-2 font-serif text-lg">
              <Link href={`/films/${prodSlug}`} className="hover:text-amber-400">
                {rows[0]!.production_title}
              </Link>{' '}
              <span className="text-xs text-zinc-500">{rows.length}</span>
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((f) => (
                <li
                  key={f.id}
                  className={`group overflow-hidden rounded border border-zinc-800 bg-zinc-900 ${pending ? 'opacity-50' : ''}`}
                >
                  <div className="relative aspect-video w-full">
                    <Image
                      src={f.image_url}
                      // alt is the row's primary identifier — caption or scene title
                      // tells the screen-reader user what the image represents.
                      alt={f.caption ?? f.scene_title ?? `Keyframe for ${rows[0]!.production_title}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      referrerPolicy="no-referrer"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="border-t border-zinc-800 p-2 text-xs text-zinc-400">
                    <div className="truncate">{f.caption ?? <span className="text-zinc-600">no caption</span>}</div>
                    <div className="mt-1 flex items-center justify-between text-zinc-500">
                      <span>order {f.sort_order}</span>
                      <button
                        type="button"
                        onClick={() => onDelete(f.id, f.production_slug)}
                        disabled={pending}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
