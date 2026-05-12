'use client';

import { useState } from 'react';

type Ref = { title: string; url: string; publication?: string; kind?: string };

const KIND_OPTIONS = ['article', 'video', 'interview', 'wikipedia', 'bulletin', ''];

/**
 * Editor for the standardised `references` jsonb column. Each row is
 * a {title, url, publication?, kind?} record matching the convention
 * used across the public schema. Hidden field serialises the list as
 * JSON.
 */
export function ReferencesField({
  name,
  defaultValue = [],
}: {
  name: string;
  defaultValue?: Ref[];
}) {
  const [refs, setRefs] = useState<Ref[]>(defaultValue);

  function update(i: number, patch: Partial<Ref>) {
    setRefs(refs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function add() {
    setRefs([...refs, { title: '', url: '' }]);
  }

  function remove(i: number) {
    setRefs(refs.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(refs)} />
      {refs.length === 0 && (
        <p className="rounded border border-dashed border-zinc-800 p-3 text-center text-xs text-zinc-500">
          No references yet.
        </p>
      )}
      {refs.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-12 gap-2 rounded border border-zinc-800 bg-zinc-950/40 p-2"
        >
          <input
            type="text"
            value={r.title}
            onChange={(e) => update(i, { title: e.target.value })}
            placeholder="Title"
            className="col-span-5 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 focus:border-amber-700 focus:outline-none"
          />
          <input
            type="url"
            value={r.url}
            onChange={(e) => update(i, { url: e.target.value })}
            placeholder="https://..."
            className="col-span-4 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-100 focus:border-amber-700 focus:outline-none"
          />
          <input
            type="text"
            value={r.publication ?? ''}
            onChange={(e) => update(i, { publication: e.target.value || undefined })}
            placeholder="Publication"
            className="col-span-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 focus:border-amber-700 focus:outline-none"
          />
          <div className="col-span-1 flex items-center gap-1">
            <select
              value={r.kind ?? ''}
              onChange={(e) => update(i, { kind: e.target.value || undefined })}
              className="rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-[10px] text-zinc-300 focus:border-amber-700 focus:outline-none"
              aria-label="Kind"
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k || '—'}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-zinc-500 hover:text-red-400"
              aria-label="Remove reference"
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:border-amber-700 hover:text-amber-400"
      >
        + Add reference
      </button>
    </div>
  );
}
