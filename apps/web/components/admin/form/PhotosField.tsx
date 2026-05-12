'use client';

import { useState } from 'react';

type Photo = { url: string; caption: string; credit?: string };

/**
 * Editor for the `photos` jsonb column. Each row is {url, caption,
 * credit?}, matching the convention on stunt_rigging_techniques.
 */
export function PhotosField({
  name,
  defaultValue = [],
}: {
  name: string;
  defaultValue?: Photo[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(defaultValue);

  function update(i: number, patch: Partial<Photo>) {
    setPhotos(photos.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function add() {
    setPhotos([...photos, { url: '', caption: '' }]);
  }
  function remove(i: number) {
    setPhotos(photos.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(photos)} />
      {photos.length === 0 && (
        <p className="rounded border border-dashed border-zinc-800 p-3 text-center text-xs text-zinc-500">
          No photos yet.
        </p>
      )}
      {photos.map((p, i) => (
        <div
          key={i}
          className="grid grid-cols-12 gap-2 rounded border border-zinc-800 bg-zinc-950/40 p-2"
        >
          <input
            type="url"
            value={p.url}
            onChange={(e) => update(i, { url: e.target.value })}
            placeholder="https://…"
            className="col-span-5 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-100 focus:border-amber-700 focus:outline-none"
          />
          <input
            type="text"
            value={p.caption}
            onChange={(e) => update(i, { caption: e.target.value })}
            placeholder="Caption"
            className="col-span-4 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 focus:border-amber-700 focus:outline-none"
          />
          <input
            type="text"
            value={p.credit ?? ''}
            onChange={(e) => update(i, { credit: e.target.value || undefined })}
            placeholder="Credit"
            className="col-span-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 focus:border-amber-700 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="col-span-1 text-zinc-500 hover:text-red-400"
            aria-label="Remove photo"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:border-amber-700 hover:text-amber-400"
      >
        + Add photo
      </button>
    </div>
  );
}
