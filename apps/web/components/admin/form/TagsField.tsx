'use client';

import { useState, type KeyboardEvent } from 'react';

/**
 * Chip input for text[] columns. Tags are accepted on Enter or comma;
 * Backspace on an empty input removes the last chip. The hidden field
 * serializes the tags as a comma-separated string (the inserter
 * splits on comma and trims).
 */
export function TagsField({
  name,
  defaultValue = [],
  placeholder,
}: {
  name: string;
  defaultValue?: string[];
  placeholder?: string;
}) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState('');

  function commitDraft() {
    const t = draft.trim().replace(/,$/, '').trim();
    if (!t) return;
    if (tags.includes(t)) {
      setDraft('');
      return;
    }
    setTags([...tags, t]);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  return (
    <div className="rounded border border-zinc-700 bg-zinc-950/60 p-1.5">
      <input type="hidden" name={name} value={tags.join(',')} />
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200"
          >
            {t}
            <button
              type="button"
              onClick={() => setTags(tags.filter((x) => x !== t))}
              className="text-zinc-500 hover:text-red-400"
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commitDraft}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-zinc-100 focus:outline-none"
        />
      </div>
    </div>
  );
}
