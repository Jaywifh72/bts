'use client';

import { useState } from 'react';

export type KvItemKey = { key: string; label: string; type?: 'text' | 'textarea' };

/**
 * Generic editor for jsonb arrays of {key1, key2, …} records. Used
 * for `common_variants`, `key_requirements`, etc. — the actual keys
 * are configured per entity in entity-registry.ts and passed through
 * the `itemKeys` prop.
 */
export function KvArrayField({
  name,
  itemKeys,
  defaultValue = [],
}: {
  name: string;
  itemKeys: KvItemKey[];
  defaultValue?: Array<Record<string, string>>;
}) {
  const [items, setItems] = useState<Array<Record<string, string>>>(defaultValue);

  function update(i: number, key: string, value: string) {
    setItems(items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  }

  function add() {
    const blank: Record<string, string> = {};
    for (const k of itemKeys) blank[k.key] = '';
    setItems([...items, blank]);
  }

  function remove(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      {items.length === 0 && (
        <p className="rounded border border-dashed border-zinc-800 p-3 text-center text-xs text-zinc-500">
          No entries yet.
        </p>
      )}
      {items.map((it, i) => (
        <div
          key={i}
          className="rounded border border-zinc-800 bg-zinc-950/40 p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
              #{i + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-zinc-500 hover:text-red-400"
              aria-label="Remove entry"
            >
              × Remove
            </button>
          </div>
          <div className="space-y-2">
            {itemKeys.map((k) => (
              <label key={k.key} className="block text-[10px] uppercase tracking-wide text-zinc-500">
                <span className="block">{k.label}</span>
                {k.type === 'textarea' ? (
                  <textarea
                    value={it[k.key] ?? ''}
                    onChange={(e) => update(i, k.key, e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 focus:border-amber-700 focus:outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={it[k.key] ?? ''}
                    onChange={(e) => update(i, k.key, e.target.value)}
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 focus:border-amber-700 focus:outline-none"
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:border-amber-700 hover:text-amber-400"
      >
        + Add entry
      </button>
    </div>
  );
}
